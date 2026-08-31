import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

/**
 * ESLint 9 flat config.
 *
 * Replaces the legacy .eslintrc.json ({ "extends": "next/core-web-vitals" }),
 * which ESLint 9 no longer reads by default, and the `next lint` script, which
 * was removed in Next 16. The rule set is deliberately unchanged from
 * next/core-web-vitals so this stays a toolchain migration.
 */
const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "node_modules/**",
      "next-env.d.ts",
    ],
  },
  ...nextCoreWebVitals,
];

export default eslintConfig;
