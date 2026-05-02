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

  return {
    plugins: [react()],
    server: {
      host: true,
      https: {
        pfx: fs.readFileSync(path.resolve(__dirname, '../certs/perla.pfx')),
        passphrase: certPassphrase,
      },
      allowedHosts: ['perla'],
    },
  }
})
