import { runCypher } from './_lib/neo4j.js'
import { callLlm } from './_lib/llm.js'

export default async function handler(req, res) {
  try {
    const { incidentType, lat, lng } = req.body || {}

    if (!process.env.NEO4J_URI) {
      // Fallback: no Neo4j — responders match by existing Supabase data
      return res.status(200).json({
        responders: [],
        trace: [{ tool: 'fallback', args: {}, resultCount: 0, note: 'Neo4j not configured — using Supabase fallback' }],
        note: 'Neo4j not configured — using Supabase fallback'
      })
    }

    const trace = []

    // Tool 1: find_by_specialty — find responders by specialty the incident type needs, within radius
    if (incidentType) {
      const cypher = `
        MATCH (it:IncidentType {name: $incidentType})-[:NEEDS]->(s:Specialty)<-[:HAS_SPECIALTY]-(r:Responder)
        WHERE r.available = true
        AND point.distance(
          point({latitude: $lat, longitude: $lng}),
          point({latitude: r.lat, longitude: r.lng})
        ) <= 5000
        RETURN r.pgId AS id, r.name AS display_name, r.kind, s.name AS specialty, r.tier,
               point.distance(
                 point({latitude: $lat, longitude: $lng}),
                 point({latitude: r.lat, longitude: r.lng})
               ) AS distance_m
        ORDER BY r.tier, distance_m
      `
      const result = await runCypher(cypher, { incidentType, lat: Number(lat), lng: Number(lng) })
      trace.push({ tool: 'find_by_specialty', args: { incidentType, lat, lng }, resultCount: result?.length || 0 })
      return res.status(200).json({ responders: result || [], trace })
    }

    res.status(400).json({ error: 'incidentType, lat, and lng are required' })
  } catch (err) {
    res.status(500).json({ error: err.message, trace: [] })
  }
}
