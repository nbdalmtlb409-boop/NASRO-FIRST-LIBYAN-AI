import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // This safely replaces process.env.API_KEY with the string value or empty string.
    // It prevents "process is not defined" error in the browser.
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || "")
  }
});