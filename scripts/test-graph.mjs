import fs from 'fs'
import path from 'path'
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

async function main() {
  if (!process.env.NEO4J_URI) {
    console.error('NEO4J_URI not set in .env.local')
    process.exit(1)
  }

  console.log('=== Graph Verification ===\n')

  // 1. Node counts by label
  const countsResult = await runCypher(`
    MATCH (n)
    RETURN labels(n)[0] AS label, count(*) AS count
    ORDER BY label
  `)
  console.log('1. Node counts by label:')
  countsResult.forEach(r => console.log(`   ${r.label}: ${r.count}`))

  // 2. IncidentType -> Specialty (NEEDS)
  const needsResult = await runCypher(`
    MATCH (it:IncidentType)-[:NEEDS]->(s:Specialty)
    RETURN it.name AS incidentType, collect(s.name) AS specialties
    ORDER BY it.name
  `)
  console.log('\n2. IncidentType → Specialty (NEEDS):')
  needsResult.forEach(r => console.log(`   ${r.incidentType}: ${r.specialties.join(', ')}`))

  // 3. Protocol trees
  const treeResult = await runCypher(`
    MATCH (pt:ProtocolTree)-[:STARTS_AT]->(ps:ProtocolStep)
    RETURN pt.treeId AS tree, pt.title AS title, count(ps) AS nodes
    ORDER BY pt.treeId
  `)
  console.log('\n3. Protocol trees:')
  for (const t of treeResult) {
    console.log(`   ${t.tree}: "${t.title}" (${t.nodes} reachable steps)`)
    const startNode = await runCypher(`
      MATCH (pt:ProtocolTree {treeId: $treeId})-[:STARTS_AT]->(ps:ProtocolStep)
      RETURN ps.stepId AS startId, ps.text AS text
    `, { treeId: t.tree })
    if (startNode[0]) {
      console.log(`     → starts at: "${startNode[0].text.substring(0, 50)}..." (${startNode[0].startId})`)
    }
    // Count YES/NO/NEXT edges
    const edgeCount = await runCypher(`
      MATCH (pt:ProtocolTree {treeId: $treeId})
      MATCH (a:ProtocolStep {treeId: $treeId})-[:YES|NO|NEXT]->(b:ProtocolStep {treeId: $treeId})
      RETURN count(*) AS edges
    `, { treeId: t.tree })
    console.log(`     → ${edgeCount[0]?.edges || 0} decision edges`)
  }

  // 4. Responders
  const respResult = await runCypher(`
    MATCH (r:Responder)-[:HAS_SPECIALTY]->(s:Specialty)
    RETURN r.name AS name, r.kind AS kind, r.tier AS tier, s.name AS spec, r.available AS avail
    ORDER BY r.tier, r.name
  `)
  console.log('\n4. Responders:')
  respResult.forEach(r => console.log(`   T${r.tier} ${r.name} (${r.kind}, ${r.spec}) available=${r.avail}`))

  // 5. Facilities + affiliations
  const facResult = await runCypher(`
    MATCH (f:Facility)<-[:AFFILIATED_WITH]-(r:Responder)
    RETURN f.name AS facility, count(r) AS responderCount
    ORDER BY responderCount DESC
  `)
  console.log('\n5. Facilities with affiliated responders:')
  facResult.forEach(r => console.log(`   ${r.facility}: ${r.responderCount} responders`))

  // 6. Nearest responders from a point (Bangalore demo area coordinates)
  const nearestResult = await runCypher(`
    MATCH (r:Responder)-[:HAS_SPECIALTY]->(s:Specialty {name: 'Emergency medicine'})
    WHERE r.available = true AND r.tier = 1
    WITH r, point.distance(
      point({latitude: $lat, longitude: $lng}),
      point({latitude: r.lat, longitude: r.lng})
    ) AS dist
    WHERE dist <= 5000
    RETURN r.name AS name, dist AS distance_m
    ORDER BY dist LIMIT 5
  `, { lat: 12.9716, lng: 77.5846 })
  console.log('\n6. Nearest Tier-1 responders (within 5 km of Pune demo area):')
  if (nearestResult.length === 0) {
    console.log('   (none found — upload demo data via "Reset Demo Data" in the demo panel)')
  } else {
    nearestResult.forEach(r => console.log(`   ${r.name} — ${Math.round(r.distance_m)}m away`))
  }

  console.log('\n✓ Graph verification complete!\n')
}

main().catch(err => {
  console.error('Test failed:', err.message)
  process.exit(1)
})
