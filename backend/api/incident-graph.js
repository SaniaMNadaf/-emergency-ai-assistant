import { runCypher } from './_lib/neo4j.js'

export default async function handler(req, res) {
  try {
    const { incidentType } = req.body || {}

    if (!incidentType) {
      return res.status(400).json({ error: 'incidentType is required' })
    }

    if (!process.env.NEO4J_URI) {
      // Fallback: load from static protocol files
      const fs = await import('fs')
      const path = await import('path')
      const map = {
        'Cardiac arrest': 'cpr',
        'Severe bleeding': 'bleeding',
        Choking: 'choking',
        Unknown: 'cpr',
      }
      const treeId = map[incidentType] || 'cpr'
      let filePath = path.resolve(`frontend/public/protocols/${treeId}.json`)
      if (!fs.existsSync(filePath)) {
        filePath = path.resolve(`public/protocols/${treeId}.json`)
      }
      const tree = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      return res.status(200).json({ treeId: tree.id, title: tree.title, nodes: tree.nodes, start: tree.start })
    }

    // Find the protocol tree linked to this incident type via GUIDED_BY
    const treeResult = await runCypher(
      `
      MATCH (it:IncidentType {name: $incidentType})-[:GUIDED_BY]->(pt:ProtocolTree)
      RETURN pt.treeId AS treeId, pt.title AS title, pt.start AS start
      `,
      { incidentType }
    )

    if (!treeResult || treeResult.length === 0) {
      return res.status(404).json({ error: `No protocol found for incident type: ${incidentType}` })
    }

    const tree = treeResult[0]

    // Fetch all steps for this tree
    const stepsResult = await runCypher(
      `
      MATCH (pt:ProtocolTree {treeId: $treeId})
      MATCH (ps:ProtocolStep {treeId: $treeId})
      RETURN ps.stepId AS stepId, ps.text AS text, ps.type AS type
      `,
      { treeId: tree.treeId }
    )

    // Fetch edges (YES, NO, NEXT)
    const edgesResult = await runCypher(
      `
      MATCH (a:ProtocolStep {treeId: $treeId})-[:YES]->(b:ProtocolStep {treeId: $treeId})
      RETURN a.stepId AS from, 'yes' AS rel, b.stepId AS to
      UNION ALL
      MATCH (a:ProtocolStep {treeId: $treeId})-[:NO]->(b:ProtocolStep {treeId: $treeId})
      RETURN a.stepId AS from, 'no' AS rel, b.stepId AS to
      UNION ALL
      MATCH (a:ProtocolStep {treeId: $treeId})-[:NEXT]->(b:ProtocolStep {treeId: $treeId})
      RETURN a.stepId AS from, 'next' AS rel, b.stepId AS to
      `,
      { treeId: tree.treeId }
    )

    // Build nodes object
    const nodes = {}
    for (const step of stepsResult) {
      nodes[step.stepId] = { text: step.text, type: step.type }
    }

    // Build edges from edge results
    for (const edge of edgesResult) {
      if (nodes[edge.from]) {
        nodes[edge.from][edge.rel] = edge.to
      }
    }

    const start = tree.start || tree.treeId

    return res.status(200).json({
      treeId: tree.treeId,
      title: tree.title,
      nodes,
      start,
    })
  } catch (err) {
    console.error('incident-graph error:', err)
    res.status(500).json({ error: err.message })
  }
}
