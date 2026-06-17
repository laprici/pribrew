/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      // Sistema "Espresso Premium": tokens via CSS vars (dark-first + light).
      // Definidos en src/styles.css → :root / [data-theme="light"].
      colors: {
        bg: "var(--bg)",
        "bg-2": "var(--bg-2)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        elevate: "var(--elevate)",
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        hairline: "var(--hairline)",
        "hairline-strong": "var(--hairline-strong)",
        chip: "var(--chip)",
        accent: "var(--accent)",
        "accent-press": "var(--accent-press)",
        "accent-ink": "var(--accent-ink)",
        signal: "var(--signal)",
        warn: "var(--warn)",
        // Alias legados para que las clases existentes sigan resolviendo.
        paper: "var(--bg-2)",
        extraction: "var(--accent)",
        "extraction-700": "var(--accent-press)",
        roast: "var(--accent-press)",
      },
      fontFamily: {
        sans: ["var(--font-display)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      // Radios redondeados — sensación de app premium.
      borderRadius: {
        none: "0",
        sm: "calc(var(--radius) * 0.6)",
        DEFAULT: "calc(var(--radius) * 0.8)",
        md: "calc(var(--radius) * 0.8)",
        lg: "var(--radius)",
        xl: "var(--radius)",
        "2xl": "calc(var(--radius) * 1.2)",
        pill: "999px",
        full: "9999px",
      },
      boxShadow: {
        card: "var(--shadow)",
        glow: "0 8px 24px -8px var(--glow)",
      },
      transitionTimingFunction: {
        ease: "cubic-bezier(0.22, 0.61, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
