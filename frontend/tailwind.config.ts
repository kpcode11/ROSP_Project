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
        bg: "var(--color-bg)",
        surface: {
          DEFAULT: "var(--color-surface)",
          2: "var(--color-surface-2)",
          3: "var(--color-surface-3)",
          4: "var(--color-surface-4)",
        },
        light: "var(--color-light)",
        "on-light": "var(--color-on-light)",
        fg: {
          DEFAULT: "var(--color-text)",
          strong: "var(--color-text-strong)",
          soft: "var(--color-text-soft)",
          muted: "var(--color-text-muted)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          border: "var(--color-accent-border)",
        },
        "on-accent": "var(--color-on-accent)",
        negative: "var(--color-negative)",
        warning: "var(--color-warning)",
        info: "var(--color-info)",
        line: {
          DEFAULT: "var(--color-border)",
          strong: "var(--color-border-strong)",
          sep: "var(--color-separator)",
        },
        scrim: "var(--color-scrim)",
      },
      fontFamily: {
        ui: "var(--font-ui)",
        title: "var(--font-title)",
        code: "var(--font-mono)",
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        pill: "var(--radius-pill)",
        circle: "var(--radius-circle)",
      },
      boxShadow: {
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        inset: "var(--shadow-inset-border)",
      },
      screens: {
        xs: "425px",
        sm: "576px",
        md: "768px",
        tab: "896px",
        lg: "1024px",
        xl: "1280px",
      },
    },
  },
  plugins: [],
};

export default config;
