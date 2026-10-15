import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { runCypher } from '../api/_lib/neo4j.js'

// --- Load .env.local ---
const envPath = path.resolve('.env.local')
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const eqIdx = trimmed.indexOf('=')
    const key = trimmed.slice(0, eqIdx).trim()
    let value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
    process.env[key] = value
  }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const DEMO_EMAIL = 'doctor@demo.com'
const DEMO_PASS = 'demo1234'

const INCIDENT_TYPE_SPECIALTIES = {
  'Cardiac arrest': ['Emergency medicine', 'Cardiology'],
  'Severe bleeding': ['Emergency medicine', 'Hematology', 'General surgery'],
  Choking: ['Emergency medicine', 'ENT'],
  Unknown: ['Emergency medicine'],
}

const DEMO_FACILITIES = [
  { name: 'Bangalore District Hospital', lat: 12.9736, lng: 77.5986 },
  { name: 'Apollo Hospitals', lat: 12.9746, lng: 77.5986 },
  { name: 'Medanta Hospital', lat: 12.9716, lng: 77.5846 },
]

async function main() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing in .env.local')
    process.exit(1)
  }

  // 1. Connect to Supabase and sign in with a demo account
  const supabase = createClient(SUPABASE_URL.replace(/\/rest\/v1\/?$/, ''), SUPABASE_ANON_KEY)
  console.log('Signing in to Supabase as demo doctor...')
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASS })
  if (signInErr) {
    console.error('Supabase sign-in failed:', signInErr.message)
    process.exit(1)
  }
  console.log('✓ Supabase authenticated')

  // 2. Fetch responders_geo()
  const { data: responders, error: respErr } = await supabase.rpc('responders_geo')
  if (respErr) {
    console.error('responders_geo() failed:', respErr.message)
    process.exit(1)
  }
  console.log(`✓ Fetched ${responders?.length || 0} responders from Supabase`)

  // 3. Load protocol trees
  const protocolsDir = path.resolve('public/protocols')
  const protocolFiles = fs.readdirSync(protocolsDir).filter(f => f.endsWith('.json'))
  const trees = []
  for (const f of protocolFiles) {
    const tree = JSON.parse(fs.readFileSync(path.join(protocolsDir, f), 'utf-8'))
    trees.push(tree)
  }
  console.log(`✓ Loaded ${trees.length} protocol trees`)

  // 4. Connect to Neo4j and MERGE everything
  console.log('\nConnecting to Neo4j...')

  // Constraints & indexes
  const constraints = [
    `CREATE INDEX responderPgId IF NOT EXISTS FOR (r:Responder) ON (r.pgId)`,
    `CREATE INDEX specialtyName IF NOT EXISTS FOR (s:Specialty) ON (s.name)`,
    `CREATE INDEX facilityName IF NOT EXISTS FOR (f:Facility) ON (f.name)`,
    `CREATE INDEX incidentTypeName IF NOT EXISTS FOR (i:IncidentType) ON (i.name)`,
    `CREATE INDEX protocolTreeId IF NOT EXISTS FOR (pt:ProtocolTree) ON (pt.treeId)`,
    `CREATE INDEX protocolStepKey IF NOT EXISTS FOR (ps:ProtocolStep) ON (ps.treeId, ps.stepId)`,
  ]

  for (const c of constraints) {
    await runCypher(c)
    console.log(`  ✓ ${c.split('FOR')[1].split('IF')[0].trim()}`)
  }

  // 5. Merge responders + specialties + facilities
  console.log('\nMerging responders and specialties...')
  for (const r of responders) {
    const specialty = r.specialty || 'General'
    const cypher = `
      MERGE (responder:Responder {pgId: $pgId})
      SET responder.name = $name,
          responder.kind = $kind,
          responder.tier = $tier,
          responder.available = $available,
          responder.lat = $lat,
          responder.lng = $lng,
          responder.specialty = $specialty
      MERGE (spec:Specialty {name: $specialty})
      MERGE (responder)-[:HAS_SPECIALTY]->(spec)
      RETURN responder.name AS name
    `
    await runCypher(cypher, {
      pgId: r.id,
      name: r.display_name,
      kind: r.kind,
      tier: r.tier,
      available: r.available,
      lat: r.lat,
      lng: r.lng,
      specialty,
    })
  }
  console.log(`✓ Merged ${responders.length} responders`)

  // 6. Merge facilities + AFFILIATED_WITH
  console.log('\nMerging facilities...')
  for (const f of DEMO_FACILITIES) {
    const cypher = `
      MERGE (facility:Facility {name: $name})
      SET facility.lat = $lat, facility.lng = $lng
      WITH facility
      MATCH (r:Responder)
      WHERE point.distance(
        point({latitude: r.lat, longitude: r.lng}),
        point({latitude: $lat, longitude: $lng})
      ) <= 10000
      MERGE (r)-[:AFFILIATED_WITH]->(facility)
      RETURN count(*) AS count
    `
    await runCypher(cypher, { name: f.name, lat: f.lat, lng: f.lng })
    console.log(`  ✓ ${f.name}`)
  }

  // 7. Merge IncidentType nodes + NEEDS relationships
  console.log('\nMerging incident types and specialties...')
  for (const [typeName, specialties] of Object.entries(INCIDENT_TYPE_SPECIALTIES)) {
    const cypher = `
      MERGE (it:IncidentType {name: $typeName})
      WITH it
      UNWIND $specialties AS specName
      MERGE (s:Specialty {name: specName})
      MERGE (it)-[:NEEDS]->(s)
      RETURN it.name AS name, count(s) AS specCount
    `
    const result = await runCypher(cypher, { typeName, specialties })
    console.log(`  ✓ ${typeName}: needs ${result[0]?.specCount || 0} specialties`)
  }

  // 8. Merge ProtocolTree + ProtocolStep nodes + edges
  console.log('\nMerging protocol trees...')
  for (const tree of trees) {
    // Create/ update tree node
    await runCypher(
      `MERGE (pt:ProtocolTree {treeId: $treeId}) SET pt.title = $title RETURN pt.treeId AS id`,
      { treeId: tree.id, title: tree.title }
    )

    // Create step nodes
    for (const [stepId, node] of Object.entries(tree.nodes)) {
      await runCypher(
        `MERGE (ps:ProtocolStep {treeId: $treeId, stepId: $stepId})
         SET ps.text = $text, ps.type = $type
         RETURN ps.stepId AS id`,
        { treeId: tree.id, stepId, text: node.text, type: node.type }
      )
    }

    // STARTS_AT
    await runCypher(
      `MATCH (pt:ProtocolTree {treeId: $treeId}), (ps:ProtocolStep {treeId: $treeId, stepId: $start})
       MERGE (pt)-[:STARTS_AT]->(ps)
       RETURN count(*) AS c`,
      { treeId: tree.id, start: tree.start }
    )

    // YES / NO / NEXT edges
    for (const [stepId, node] of Object.entries(tree.nodes)) {
      const targets = []
      if (node.yes) targets.push({ rel: 'YES', target: node.yes })
      if (node.no) targets.push({ rel: 'NO', target: node.no })
      if (node.next) targets.push({ rel: 'NEXT', target: node.next })

      for (const { rel, target } of targets) {
        await runCypher(
          `MATCH (a:ProtocolStep {treeId: $treeId, stepId: $stepId}),
                  (b:ProtocolStep {treeId: $treeId, stepId: $target})
           MERGE (a)-[:${rel}]->(b)
           RETURN count(*) AS c`,
          { treeId: tree.id, stepId, target }
        )
      }
    }

    // GUIDED_BY (map protocol tree to incident type)
    const treeToIncidentMap = { cpr: 'Cardiac arrest', bleeding: 'Severe bleeding', choking: 'Choking' }
    const incidentTypeName = treeToIncidentMap[tree.id] || 'Unknown'
    await runCypher(
      `MATCH (it:IncidentType {name: $itName}), (pt:ProtocolTree {treeId: $treeId})
       MERGE (it)-[:GUIDED_BY]->(pt)
       RETURN count(*) AS c`,
      { itName: incidentTypeName, treeId: tree.id }
    )
  }
  console.log(`✓ Merged ${trees.length} protocol trees`)

  // 9. Add ASHA community health workers
  const ashaWorkers = [
    { pgId: 'asha-1', name: 'ASHA Worker Rani', specialty: 'Community health', tier: 2, lat: 18.50, lng: 73.82 },
    { pgId: 'asha-2', name: 'ASHA Worker Sita', specialty: 'Community health', tier: 2, lat: 18.55, lng: 73.90 },
  ]
  for (const a of ashaWorkers) {
    await runCypher(
      `MERGE (r:Responder {pgId: $pgId})
       SET r.name = $name, r.kind = 'responder', r.tier = $tier, r.available = true,
           r.lat = $lat, r.lng = $lng, r.specialty = $specialty
       MERGE (s:Specialty {name: $specialty})
       MERGE (r)-[:HAS_SPECIALTY]->(s)
       RETURN r.name AS name`,
      a
    )
  }
  console.log('✓ Added 2 ASHA community health workers')

  console.log('\n✓ Graph sync complete!')
}

main().catch(err => {
  console.error('Sync failed:', err.message)
  process.exit(1)
})
