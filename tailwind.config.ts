import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#2a1a0a",
          warm: "#5c3a1e",
          gold: "#c8a84e",
          goldDark: "#9e8237",
          cream: "#fdf5e6",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        serif: ["var(--font-serif)", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        gold: "0 0 0 1px rgba(200,168,78,0.45), 0 10px 30px -10px rgba(200,168,78,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
