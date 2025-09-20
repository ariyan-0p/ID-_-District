import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // This path MUST match your repository name
  base: '/ID-_-District/', 
  plugins: [react()],
})