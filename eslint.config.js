import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: [
      "node_modules/**",
      "coverage/**",
      "logs/**",
      "public/**",
      "dist/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-console": "warn",
    },
  },
  {
    // Bootstrap / fatal-exit paths log before winston is ready
    files: [
      "src/config/**/*.js",
      "src/db/**/*.js",
      "src/utils/cloudnary.js",
      "src/index.js",
      "src/app.js",
    ],
    rules: {
      "no-console": "off",
    },
  },
];
