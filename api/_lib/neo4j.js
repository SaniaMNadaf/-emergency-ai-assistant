export async function runCypher(statement, parameters = {}) {
  if (!process.env.NEO4J_URI) return null

  let base = process.env.NEO4J_URI
  base = base
    .replace(/^neo4j\+s:\/\//, 'https://')
    .replace(/^neo4j:\/\//, 'http://')
    .replace(/\/$/, '')

  const db = process.env.NEO4J_DATABASE || 'neo4j'
  const url = `${base}/db/${db}/query/v2`

  const userpass = `${process.env.NEO4J_USER || ''}:${process.env.NEO4J_PASSWORD || ''}`
  const b64 = Buffer.from(userpass).toString('base64')

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${b64}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ statement, parameters }),
  })

  if (!res.ok) {
    throw new Error(`NEO4J_HTTP_${res.status}`)
  }

  const json = await res.json()
  if (json.errors && json.errors.length > 0) {
    throw new Error(`NEO4J_ERROR:${JSON.stringify(json.errors[0])}`)
  }

  const results = json.results || []
  const cols = results[0]?.columns || results[0]?.keys || []
  const rows = results[0]?.data || results[0]?.values || []

  return rows.map((row) => {
    const obj = {}
    if (Array.isArray(row)) {
      cols.forEach((col, i) => {
        obj[col] = row[i]
      })
    } else if (typeof row === 'object' && row !== null) {
      cols.forEach((col) => {
        obj[col] = row[col]
      })
    }
    return obj
  })
}
