export async function callLlm(prompt, systemPrompt = '') {
  if (!process.env.GEMINI_API_KEY) return null

  try {
    const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: prompt }] }],
      }),
    })

    if (!res.ok) return null

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    return text || null
  } catch {
    return null
  }
}
