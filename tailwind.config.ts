import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./modules/**/*.{ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      boxShadow: {
        stage: "0 24px 80px rgba(3, 8, 20, 0.35)",
      },
      keyframes: {
        "pulse-grid": {
          "0%, 100%": { opacity: "0.72", transform: "scale(0.98)" },
          "50%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "pulse-grid": "pulse-grid 1.8s ease-in-out infinite",
        shimmer: "shimmer 10s linear infinite",
      },
    },
  },
  darkMode: "class",
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
