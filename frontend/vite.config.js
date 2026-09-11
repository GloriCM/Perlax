import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const CERT_PATH = path.resolve(__dirname, '../certs/perla.pfx')
const ALLOWED_HOSTS = true
const API_PROXY_TARGET = 'http://127.0.0.1:5262'
const apiProxy = {
  '/api': { target: API_PROXY_TARGET, changeOrigin: true, secure: false },
  '/hubs': { target: API_PROXY_TARGET, changeOrigin: true, secure: false, ws: true },
  '/uploads': { target: API_PROXY_TARGET, changeOrigin: true, secure: false },
}

function readHttpsConfig(env) {
  const certPassphrase = env.VITE_DEV_CERT_PASS
  if (!certPassphrase) return undefined
  if (!fs.existsSync(CERT_PATH)) return undefined
  return {
    pfx: fs.readFileSync(CERT_PATH),
    passphrase: certPassphrase,
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '.'), '')
  const publicHost = env.VITE_DEV_PUBLIC_HOST || ''
  const useTunnelHmr = String(env.VITE_DEV_HMR_TUNNEL || '').toLowerCase() === 'true'
  const httpsConfig = readHttpsConfig(env)
  const cacheDir = env.VITE_CACHE_DIR
    ? path.resolve(env.VITE_CACHE_DIR)
    : path.resolve('E:/Semillas/.dotnet-cache/vite-perlax')

  if (mode === 'development' && !httpsConfig) {
    throw new Error(
      'Defina VITE_DEV_CERT_PASS en frontend/.env.local (contraseña del perla.pfx). Copie frontend/.env.example como referencia.',
    )
  }

  return {
    plugins: [react()],
    cacheDir,
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      https: httpsConfig,
      allowedHosts: ALLOWED_HOSTS,
      proxy: apiProxy,
      // HMR remoto solo si VITE_DEV_HMR_TUNNEL=true (túnel Cloudflare).
      // En local, dejar que Vite use el host de la página (evita wss://perlax.perla.work 502).
      ...(useTunnelHmr && publicHost
        ? {
            hmr: {
              protocol: 'wss',
              host: publicHost,
              clientPort: 443,
            },
          }
        : {}),
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    },
    preview: {
      host: true,
      port: 5173,
      strictPort: true,
      // HTTP: el túnel Cloudflare termina HTTPS (igual que Tiempo de procesos).
      // HTTPS local aquí provoca 502 porque el cert perla.pfx no lo verifica cloudflared.
      https: false,
      allowedHosts: ALLOWED_HOSTS,
      proxy: apiProxy,
      headers: {
        'Cache-Control': 'public, max-age=600',
      },
    },
  }
})
