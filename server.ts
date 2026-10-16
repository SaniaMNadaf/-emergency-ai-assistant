import express, { Request, Response } from 'express'
import { createServer as createViteServer } from 'vite'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env.local if present
const envLocalPath = path.join(__dirname, '.env.local')
if (fs.existsSync(envLocalPath)) {
  const lines = fs.readFileSync(envLocalPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const eqIdx = trimmed.indexOf('=')
    const key = trimmed.slice(0, eqIdx).trim()
    let value = trimmed.slice(eqIdx + 1).trim()
    value = value.replace(/^["']|["']$/g, '')
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

// Load .env if present
const envPath = path.join(__dirname, '.env')
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const eqIdx = trimmed.indexOf('=')
    const key = trimmed.slice(0, eqIdx).trim()
    let value = trimmed.slice(eqIdx + 1).trim()
    value = value.replace(/^["']|["']$/g, '')
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

const app = express()
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// CORS headers
app.use('/api', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204)
  }
  next()
})

const apiDir = path.join(__dirname, 'backend', 'api')

// Mount all backend API handlers
app.all('/api/:handler', async (req: Request, res: Response) => {
  const handlerName = req.params.handler
  if (!handlerName || handlerName === '_lib') {
    return res.status(404).json({ error: 'Invalid API handler' })
  }

  const handlerPath = path.join(apiDir, `${handlerName}.js`)
  if (!fs.existsSync(handlerPath)) {
    return res.status(404).json({ error: `Handler ${handlerName} not found` })
  }

  try {
    const mod = await import(`file://${handlerPath}`)
    const handler = mod.default
    await handler(req, res)
  } catch (err: any) {
    console.error(`API [${handlerName}] error:`, err)
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal server error' })
    }
  }
})

// Vite or static frontend
const isProduction = process.env.NODE_ENV === 'production'

if (isProduction) {
  const distPath = path.join(__dirname, 'frontend', 'dist')
  app.use(express.static(distPath))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
} else {
  const vite = await createViteServer({
    server: { middlewareMode: true, host: '0.0.0.0' },
    appType: 'spa',
    configFile: path.resolve(__dirname, 'frontend/vite.config.js'),
    root: path.resolve(__dirname, 'frontend'),
  })
  app.use(vite.middlewares)
}

const PORT = 3000
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Healthcare AI Emergency Assistant running at http://0.0.0.0:${PORT}`)
})

