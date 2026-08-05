import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const CERT_PATH = path.resolve(__dirname, '../certs/perla.pfx')
const ALLOWED_HOSTS = ['perla', 'perlax.perla.work', 'localhost', '127.0.0.1']

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
  const publicHost = env.VITE_DEV_PUBLIC_HOST || 'perlax.perla.work'
  const httpsConfig = readHttpsConfig(env)

  if ((mode === 'development' || mode === 'preview') && !httpsConfig) {
    throw new Error(
      'Defina VITE_DEV_CERT_PASS en frontend/.env.local (contraseña del perla.pfx). Copie frontend/.env.example como referencia.',
    )
  }

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      https: httpsConfig,
      allowedHosts: ALLOWED_HOSTS,
      // HMR por túnel Cloudflare: solo desarrollo local (npm run dev).
      hmr: {
        protocol: 'wss',
        host: publicHost,
        clientPort: 443,
      },
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    },
    preview: {
      host: true,
      port: 5173,
      strictPort: true,
      https: httpsConfig,
      allowedHosts: ALLOWED_HOSTS,
      headers: {
        'Cache-Control': 'public, max-age=600',
      },
    },
  }
})
