/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/client/**/*.{vue,ts,html}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "cb-bg":             "var(--color-bg)",
        "cb-bg-deep":        "var(--color-bg-deep)",
        "cb-surface":        "var(--color-surface)",
        "cb-surface-2":      "var(--color-surface-2)",
        "cb-border":         "var(--color-border)",
        "cb-text":           "var(--color-text)",
        "cb-text-secondary": "var(--color-text-secondary)",
        "cb-text-muted":     "var(--color-text-muted)",
        "cb-primary":        "var(--color-primary)",
        "cb-accent":         "var(--color-accent)",
        "cb-warning":        "var(--color-warning)",
      },
    },
  },
  plugins: [],
};
