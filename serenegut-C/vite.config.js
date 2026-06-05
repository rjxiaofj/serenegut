import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  root: process.cwd(),
  plugins: [uni()]
})
