import { runCypher } from './_lib/neo4j.js'
import { callLlm } from './_lib/llm.js'

export default async function handler(req, res) {
  try {
    const { treeId, currentStepId, userAnswer, history } = req.body || {}

    if (!treeId || !currentStepId) {
      return res.status(400).json({ error: 'treeId and currentStepId are required' })
    }

    if (!process.env.NEO4J_URI) {
      return res.status(200).json({
        guard: 'ok',
        reason: 'Neo4j not configured — guardrails disabled',
      })
    }

    // Fetch the current step and its expected paths from Neo4j
    const stepResult = await runCypher(
      `
      MATCH (pt:ProtocolTree {treeId: $treeId})-[:STARTS_AT]->(start:ProtocolStep)
      MATCH (ps:ProtocolStep {treeId: $treeId, stepId: $currentStep})
      OPTIONAL MATCH (ps)-[r:YES|NO|NEXT]->(next:ProtocolStep)
      RETURN ps.stepId AS stepId, ps.text AS stepText, ps.type AS stepType,
             start.stepId AS startId,
             collect(DISTINCT type(r)) AS edgeTypes,
             collect(next.stepId) AS nextSteps
      `,
      { treeId, currentStep: currentStepId }
    )

    if (!stepResult || stepResult.length === 0) {
      return res.status(404).json({ error: 'Protocol step not found in graph' })
    }

    const step = stepResult[0]

    if (step.stepType === 'end') {
      return res.status(200).json({
        guard: 'ok',
        reason: 'Protocol has reached an end step.',
        currentStep: currentStepId,
        stepText: step.stepText,
      })
    }

    const historyText = Array.isArray(history)
      ? history.map(h => `${h.nodeId || h.stepId || '?'}: ${h.answer || h.action || '—'}`).join('; ')
      : ''

    const prompt = `
You are a safety guardrail for a first-aid decision-tree protocol.
Current protocol step (${currentStepId}): "${step.stepText}"
Step type: ${step.stepType}
Available transitions: ${step.edgeTypes.join(', ') || 'none'}
History so far: ${historyText || 'none'}
User answer: ${userAnswer || '(no answer given)'}

Decide: Does the user's answer follow the protocol's expected path?
- "yes" is valid if the step has a YES edge.
- "no" is valid if the step has a NO edge.
- proceeding without a question is valid if the step has a NEXT edge.

Respond with ONLY one of these exact strings:
  ok — user input is acceptable per the protocol
  warning — user input is not explicitly blocked but deviates from expected path
  block — user input contradicts the protocol and is unsafe
`
    const llmResponse = await callLlm(prompt, 'You are a medical safety guardrail assistant.')
    const guard = llmResponse
      ? llmResponse.trim().toLowerCase().split('\n')[0].replace(/[^a-z]/g, '')
      : 'ok'

    const guardResult = {
      guard: ['ok', 'warning', 'block'].includes(guard) ? guard : 'ok',
      currentStep: currentStepId,
      stepText: step.stepText,
      stepType: step.stepType,
      userAnswer,
      historySummary: historyText || null,
      reason: llmResponse || 'No LLM available — guardrail passed by default.',
    }

    return res.status(200).json(guardResult)
  } catch (err) {
    console.error('protocol-guard error:', err)
    res.status(500).json({ error: err.message })
  }
}
