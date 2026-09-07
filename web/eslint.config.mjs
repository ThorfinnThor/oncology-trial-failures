import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // Pages Router hydration and browser-storage synchronization use effects.
  // Keep optimization advice visible without treating it as a runtime defect.
  { rules: {
    "react-hooks/set-state-in-effect": "warn",
    // Existing registry normalization accepts heterogeneous source records.
    // Surface typing debt while keeping correctness checks blocking.
    "@typescript-eslint/no-explicit-any": "warn",
  } },
  globalIgnores([".next/**", "out/**", "build/**", ".open-next/**", ".wrangler/**", "public/**", "next-env.d.ts"]),
]);
