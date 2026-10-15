export async function runCypher(statement, parameters = {}) {
  if (!process.env.NEO4J_URI) return null

  let base = process.env.NEO4J_URI
  base = base
    .replace(/^neo4j\+s:\/\//, 'https://')
    .replace(/^neo4j:\/\//, 'http://')
    .replace(/\/$/, '')

  let db = process.env.NEO4J_DATABASE
  if (!db) {
    const hostMatch = base.match(/https:\/\/([^.]+)\.databases\.neo4j\.io/)
    db = hostMatch ? hostMatch[1] : 'neo4j'
  }
  const url = `${base}/db/${db}/query/v2`

  const userpass = `${process.env.NEO4J_USERNAME || process.env.NEO4J_USER || ''}:${process.env.NEO4J_PASSWORD || ''}`
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

  let results, cols, rows
  if (json.data && Array.isArray(json.data)) {
    results = json.data
    cols = results[0]?.columns || results[0]?.keys || results[0]?.fields || []
    rows = results[0]?.data || results[0]?.values || []
  } else if (json.data && typeof json.data === 'object') {
    cols = json.data.fields || json.data.columns || json.data.keys || []
    rows = json.data.values || json.data.data || []
  } else {
    results = json.results || []
    cols = results[0]?.columns || results[0]?.keys || results[0]?.fields || []
    rows = results[0]?.data || results[0]?.values || []
  }

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
