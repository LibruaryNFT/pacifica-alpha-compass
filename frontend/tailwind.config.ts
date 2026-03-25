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
        background: "hsl(220 20% 6%)",
        foreground: "hsl(0 0% 98%)",
        card: "hsl(220 15% 10%)",
        "card-hover": "hsl(220 15% 13%)",
        primary: "hsl(160 80% 45%)",
        "primary-dim": "hsl(160 60% 30%)",
        accent: "hsl(200 85% 55%)",
        danger: "hsl(0 72% 51%)",
        warning: "hsl(38 92% 50%)",
        success: "hsl(142 71% 45%)",
        muted: "hsl(220 10% 40%)",
        border: "hsl(220 15% 15%)",
        input: "hsl(220 15% 11%)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
