import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["dist/", "node_modules/", "coverage/", ".claude/"] },
  js.configs.recommended,
  {
    files: ["src/**/*.js"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["tests/**/*.js", "scripts/**/*.js", "*.config.js"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
];
