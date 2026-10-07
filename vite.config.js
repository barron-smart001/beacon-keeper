import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const serverEnvKeys = [
  "SUPABASE_URL",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PAYSTACK_SECRET_KEY",
  "PAYSTACK_CALLBACK_URL",
  "VITE_APP_URL",
  "APP_URL",
]

const localApiHandlers = {
  "/api/paystack/initialize": () =>
    import("./api/paystack/initialize.js"),
  "/api/paystack/verify": () => import("./api/paystack/verify.js"),
  "/api/paystack/webhook": () => import("./api/paystack/webhook.js"),
}

function localVercelApi() {
  return {
    name: "local-vercel-api",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url || "/", "http://localhost").pathname
        const loadHandler = localApiHandlers[pathname]

        if (!loadHandler) {
          next()
          return
        }

        try {
          const chunks = []
          for await (const chunk of request) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
          }
          request.body = Buffer.concat(chunks).toString("utf8")

          const { default: handler } = await loadHandler()
          const apiResponse = {
            status(statusCode) {
              response.statusCode = statusCode
              return this
            },
            setHeader(name, value) {
              response.setHeader(name, value)
            },
            json(payload) {
              response.setHeader("Content-Type", "application/json; charset=utf-8")
              response.end(JSON.stringify(payload))
              return this
            },
          }

          await handler(request, apiResponse)
          if (!response.writableEnded) {
            response.statusCode = 500
            response.setHeader("Content-Type", "application/json; charset=utf-8")
            response.end(JSON.stringify({
              success: false,
              message: "The payment API did not return a response.",
            }))
          }
        } catch (error) {
          console.error("Local Paystack API handler failed:", error)
          if (!response.headersSent) {
            response.statusCode = 500
            response.setHeader("Content-Type", "application/json; charset=utf-8")
            response.end(JSON.stringify({
              success: false,
              message: "Unable to process the payment request.",
            }))
          }
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  for (const key of serverEnvKeys) {
    if (process.env[key] === undefined && env[key]) {
      process.env[key] = env[key]
    }
  }

  return {
    plugins: [react(), tailwindcss(), localVercelApi()],
  }
})
