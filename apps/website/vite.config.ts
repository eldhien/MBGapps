import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/auth": "http://localhost:4000",
      "/dashboard": "http://localhost:4000",
      "/users": "http://localhost:4000",
      "/batches": "http://localhost:4000",
      "/distributions": "http://localhost:4000",
      "/food-reports": "http://localhost:4000",
      "/student-complaints": "http://localhost:4000",
      "/kitchen-checklist": "http://localhost:4000",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
