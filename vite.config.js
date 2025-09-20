import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // This 'base' property is the crucial addition. It tells your
  // live website the correct path to find its CSS and JavaScript files.
  base: '/ID-Card-Generator-Kaizer/', 
})
