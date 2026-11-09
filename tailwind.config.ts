import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // BESKAR titanium/graphite palette
        void: "#050506",
        obsidian: "#0a0a0c",
        graphite: {
          900: "#0e0f12",
          800: "#141519",
          700: "#1b1d22",
          600: "#24272e",
          500: "#33373f",
          400: "#4a4f59",
        },
        titanium: {
          400: "#8b9099",
          300: "#a9aeb7",
          200: "#c9ccd2",
          100: "#e8eaed",
        },
        silver: "#d7dade",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        brand: "0.32em",
        wider2: "0.18em",
      },
      backgroundImage: {
        "titanium-sheen":
          "linear-gradient(135deg, #e8eaed 0%, #a9aeb7 28%, #6b7079 50%, #c9ccd2 74%, #8b9099 100%)",
        "graphite-panel":
          "linear-gradient(180deg, rgba(26,29,34,0.7) 0%, rgba(12,13,16,0.7) 100%)",
        "radial-glow":
          "radial-gradient(60% 50% at 50% 0%, rgba(160,170,185,0.10) 0%, rgba(0,0,0,0) 70%)",
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 20px 60px -20px rgba(0,0,0,0.8)",
        "panel-hover":
          "0 1px 0 0 rgba(255,255,255,0.08) inset, 0 30px 80px -20px rgba(0,0,0,0.9)",
        edge: "0 0 0 1px rgba(255,255,255,0.06)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.16,1,0.3,1) forwards",
        "fade-in": "fade-in 0.5s ease forwards",
        shimmer: "shimmer 2.5s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
