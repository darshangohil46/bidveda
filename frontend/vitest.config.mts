import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": root("./src"),
      // `server-only` throws outside a React Server build; tests run in plain Node.
      "server-only": root("./src/tests/empty.ts"),
    },
  },
});
