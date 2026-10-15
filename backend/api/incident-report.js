import { runCypher } from './_lib/neo4j.js'
import { callLlm } from './_lib/llm.js'

export default async function handler(req, res) {
  try {
    const { incidentType, lat, lng, reportedBy, report, userContext } = req.body || {}

    if (!incidentType) {
      return res.status(400).json({ error: 'incidentType is required' })
    }

    if (!process.env.NEO4J_URI) {
      return res.status(200).json({
        incidentId: `local-${Date.now()}`,
        note: 'Neo4j not configured — incident stored locally only',
      })
    }

    // Use LLM to summarize the free-text report if provided
    let reportSummary = report
    if (report && process.env.GEMINI_API_KEY) {
      const summary = await callLlm(
        `Summarize this emergency report in one short sentence (max 80 chars): ${report}`,
        'You are a medical summarizer.'
      )
      if (summary) reportSummary = summary.trim()
    }

    // Create the Incident node and link to IncidentType
    const incidentResult = await runCypher(
      `
      MERGE (it:IncidentType {name: $incidentType})
      CREATE (i:Incident {
        id: randomUUID(),
        type: $incidentType,
        lat: $lat,
        lng: $lng,
        createdAt: datetime(),
        report: $report,
        reportedBy: $reportedBy
      })
      CREATE (i)-[:OF_TYPE]->(it)
      RETURN i.id AS incidentId
      `,
      {
        incidentType,
        lat: lat !== undefined ? Number(lat) : null,
        lng: lng !== undefined ? Number(lng) : null,
        report: reportSummary || null,
        reportedBy: reportedBy || null,
      }
    )

    const incidentId = incidentResult[0]?.incidentId
    if (!incidentId) {
      return res.status(500).json({ error: 'Failed to create incident' })
    }

    // Optionally use LLM to suggest priority or triage notes
    let aiNote = null
    if (userContext && process.env.GEMINI_API_KEY) {
      aiNote = await callLlm(
        `A ${incidentType} incident was reported at (${lat}, ${lng}) by ${reportedBy || 'a bystander'}. User context: ${userContext}. Assess severity level (low/medium/high/critical) and provide a brief 1-sentence triage recommendation.`,
        'You are an emergency triage assistant.'
      )
    }

    return res.status(201).json({
      incidentId,
      incidentType,
      reportSummary,
      aiTriage: aiNote,
    })
  } catch (err) {
    console.error('incident-report error:', err)
    res.status(500).json({ error: err.message })
  }
}
