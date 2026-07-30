import type { Config } from "tailwindcss";
import { theme as brand } from "./theme/config";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: brand.colors.brand,
        accent: brand.colors.accent,
        paper: brand.colors.paper,
        ink: brand.colors.ink,
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(42, 36, 32, 0.04), 0 4px 16px rgba(42, 36, 32, 0.06)",
      },
      transitionTimingFunction: {
        editorial: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
