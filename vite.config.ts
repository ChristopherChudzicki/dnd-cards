import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { supabaseLocalEnv } from "./scripts/vite-supabase-env";

export default defineConfig({
  plugins: [react(), supabaseLocalEnv()],
});
