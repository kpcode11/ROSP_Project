import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "canvas-page": "var(--canvas-page)",
        canvas: "var(--canvas)",
        "canvas-soft": "var(--canvas-soft)",
        "canvas-night": "var(--canvas-night)",
        ink: "var(--ink)",
        "ink-secondary": "var(--ink-secondary)",
        "ink-mute": "var(--ink-mute)",
        "ink-mute-2": "var(--ink-mute-2)",
        "ink-faint": "var(--ink-faint)",
        hairline: "var(--hairline)",
        "hairline-strong": "var(--hairline-strong)",
        "hairline-cool": "var(--hairline-cool)",
        primary: "#3ecf8e",
        "primary-deep": "#24b47e",
        "on-primary": "#171717",
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
      },
      boxShadow: {
        subtle: "0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)",
        float: "0 8px 24px rgba(15, 23, 42, 0.08)",
        modal: "0 16px 48px rgba(15, 23, 42, 0.16)",
      },
      fontFamily: {
        sans: ["Inter", "Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
        mono: ["ui-monospace", "Menlo", "Monaco", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
