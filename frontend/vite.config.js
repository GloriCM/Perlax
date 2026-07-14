import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '.'), '')
  const certPassphrase = env.VITE_DEV_CERT_PASS
  if (!certPassphrase) {
    throw new Error(
      'Defina VITE_DEV_CERT_PASS en frontend/.env.local (contraseña del perla.pfx). Copie frontend/.env.example como referencia.'
    )
  }

  const publicHost = env.VITE_DEV_PUBLIC_HOST || 'perlax.perla.work'

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      https: {
        pfx: fs.readFileSync(path.resolve(__dirname, '../certs/perla.pfx')),
        passphrase: certPassphrase,
      },
      allowedHosts: ['perla', 'perlax.perla.work', 'localhost'],
      // HMR por túnel Cloudflare: mismo servidor dev para acceso interno y externo.
      hmr: {
        protocol: 'wss',
        host: publicHost,
        clientPort: 443,
      },
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    },
  }
})
