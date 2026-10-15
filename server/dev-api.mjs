import http from 'http'
import fs from 'fs'
import path from 'path'
import url from 'url'

// Load .env.local (never committed)
const envPath = path.resolve('.env.local')
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const eqIdx = trimmed.indexOf('=')
    const key = trimmed.slice(0, eqIdx).trim()
    let value = trimmed.slice(eqIdx + 1).trim()
    // Strip surrounding quotes
    value = value.replace(/^["']|["']$/g, '')
    process.env[key] = value
  }
}

const apiDir = path.resolve('api')
const PORT = process.env.PORT || 8787

const server = http.createServer(async (req, httpRes) => {
  const parsedUrl = url.parse(req.url || '', true)
  const pathname = parsedUrl.pathname || ''

  // Only handle /api routes
  if (!pathname.startsWith('/api/')) {
    httpRes.writeHead(404, { 'Content-Type': 'application/json' })
    httpRes.end(JSON.stringify({ error: 'Not found — only /api/* routes are served' }))
    return
  }

  // Extract handler name (first segment after /api/)
  const handlerName = pathname.replace('/api/', '').split('/')[0]
  if (!handlerName || handlerName === '_lib') {
    httpRes.writeHead(404, { 'Content-Type': 'application/json' })
    httpRes.end(JSON.stringify({ error: 'No handler specified' }))
    return
  }

  const handlerPath = path.join(apiDir, handlerName + '.js')

  try {
    if (!fs.existsSync(handlerPath)) {
      httpRes.writeHead(404, { 'Content-Type': 'application/json' })
      httpRes.end(JSON.stringify({ error: `Handler ${handlerName} not found` }))
      return
    }

    // Parse body for POST/PUT/PATCH
    let body = null
    const method = req.method || 'GET'
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      const chunks = []
      for await (const chunk of req) {
        chunks.push(chunk)
      }
      const bodyStr = Buffer.concat(chunks).toString('utf-8')
      if (bodyStr) {
        try {
          body = JSON.parse(bodyStr)
        } catch {
          body = bodyStr
        }
      }
    }

    const mockRes = {
      _statusCode: 200,
      status(code) {
        this._statusCode = code
        return this
      },
      setHeader(name, value) {
        this._headers = this._headers || {}
        this._headers[name] = value
      },
      json(data) {
        const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        if (this._headers) {
          Object.assign(headers, this._headers)
        }
        httpRes.writeHead(this._statusCode, headers)
        httpRes.end(JSON.stringify(data))
      },
      send(data) {
        const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        httpRes.writeHead(this._statusCode, headers)
        httpRes.end(typeof data === 'string' ? data : JSON.stringify(data))
      },
    }

    const handlerUrl = url.pathToFileURL(handlerPath).href
    const mod = await import(handlerUrl)
    const handler = mod.default

    await handler(
      { method, body, query: parsedUrl.query },
      mockRes
    )
  } catch (err) {
    console.error(`API error: ${err.message}`)
    httpRes.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
    httpRes.end(JSON.stringify({ error: err.message }))
  }
})

server.listen(PORT, () => {
  console.log(`\nDev API server running on http://localhost:${PORT}`)
  console.log('Secrets loaded from .env.local:')
  if (process.env.NEO4J_URI) console.log('  NEO4J_URI:', process.env.NEO4J_URI)
  if (process.env.GEMINI_API_KEY) console.log('  GEMINI_API_KEY: (set)')
  else console.log('  GEMINI_API_KEY: (not set)')
})
