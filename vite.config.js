import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev-only middleware so POST /api/analyze-site works under `npm run dev`,
// using the exact same scanSite() code path as the Vercel serverless function.
function devApiPlugin() {
  return {
    name: 'dev-analyze-site-api',
    configureServer(server) {
      server.middlewares.use('/api/analyze-site', async (req, res, next) => {
        if (req.method !== 'POST') return next()
        try {
          const { scanSite } = await server.ssrLoadModule('/src/lib/siteAnalyzer.js')
          let body = ''
          for await (const chunk of req) body += chunk
          let url
          try { url = JSON.parse(body || '{}').url } catch { url = undefined }
          if (!url) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            return res.end(JSON.stringify({ ok: false, error: 'missing-url' }))
          }
          const result = await scanSite(url)
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(result))
        } catch (e) {
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: false, error: 'scan-failed', detail: String(e) }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), devApiPlugin()],
})
