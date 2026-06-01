import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Dev-only middleware that mounts the Vercel serverless functions under
// `npm run dev`, so the full auth + SSRF + rate-limit + Stripe flows work
// locally without `vercel dev`. Each route loads the SAME handler file Vercel
// runs in production via ssrLoadModule. JSON routes get a parsed req.body and a
// Vercel-style res.status().json() shim; the Stripe webhook is left as a raw
// stream so its handler can verify the signature against the exact bytes.
function devApiPlugin() {
  const ROUTES = [
    { path: '/api/analyze-site',   mod: '/api/analyze-site.js',   parse: true },
    { path: '/api/audits/create',  mod: '/api/audits/create.js',  parse: true },
    { path: '/api/audits/import',  mod: '/api/audits/import.js',  parse: true },
    { path: '/api/admin/console',  mod: '/api/admin/console.js',  parse: true },
    { path: '/api/system/status',  mod: '/api/system/status.js',  parse: true },
    { path: '/api/share/create',   mod: '/api/share/create.js',   parse: true },
    { path: '/api/share/get',      mod: '/api/share/get.js',      parse: true },
    { path: '/api/stripe/checkout', mod: '/api/stripe/checkout.js', parse: true },
    { path: '/api/stripe/portal',   mod: '/api/stripe/portal.js',   parse: true },
    { path: '/api/stripe/sync',     mod: '/api/stripe/sync.js',     parse: true },
    { path: '/api/stripe/webhook',  mod: '/api/stripe/webhook.js',  parse: false },
  ]
  return {
    name: 'dev-api',
    configureServer(server) {
      for (const route of ROUTES) {
        server.middlewares.use(route.path, async (req, res, next) => {
          if (req.method !== 'POST' && req.method !== 'GET') return next()
          // Adapt the raw Node res to the Vercel-style res.status().json() API.
          res.status = (code) => { res.statusCode = code; return res }
          res.json = (obj) => {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(obj))
            return res
          }
          try {
            if (route.parse && req.method === 'POST') {
              let body = ''
              for await (const chunk of req) body += chunk
              try { req.body = JSON.parse(body || '{}') } catch { req.body = {} }
            }
            const { default: handler } = await server.ssrLoadModule(route.mod)
            await handler(req, res)
          } catch (e) {
            if (!res.writableEnded) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'dev-handler-failed', detail: String(e?.message || e) }))
            }
          }
        })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load ALL env vars (not just VITE_*) into process.env so the dev API
  // middleware can read server-only secrets from .env.local. This does NOT
  // expose them to the client bundle — only VITE_* reach import.meta.env.
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)

  return {
    plugins: [react(), devApiPlugin()],
  }
})
