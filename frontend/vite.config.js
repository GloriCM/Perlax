import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    https: {
      pfx: fs.readFileSync(path.resolve(__dirname, '../certs/perla.pfx')),
      passphrase: 'perla123',
    },
    allowedHosts: ['perla'],
  },
})
