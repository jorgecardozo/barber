import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Fronteras Feature-Sliced Design: cada capa solo importa de capas inferiores.
  // app > widgets > features > entities > shared.
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "import/resolver": {
        typescript: { alwaysTryTypes: true, project: "./tsconfig.json" },
      },
      "boundaries/elements": [
        { type: "app", pattern: "src/app/**" },
        { type: "widgets", pattern: "src/widgets/*" },
        { type: "features", pattern: "src/features/*" },
        { type: "entities", pattern: "src/entities/*" },
        { type: "shared", pattern: "src/shared/**" },
      ],
      "boundaries/ignore": ["src/middleware.ts"],
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          policies: [
            { from: ["app"], allow: ["app", "widgets", "features", "entities", "shared"] },
            { from: ["widgets"], allow: ["widgets", "features", "entities", "shared"] },
            { from: ["features"], allow: ["features", "entities", "shared"] },
            { from: ["entities"], allow: ["entities", "shared"] },
            { from: ["shared"], allow: ["shared"] },
          ],
        },
      ],
    },
  },

  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
