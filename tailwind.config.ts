import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        warning: "var(--warning)",
        success: "var(--success)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
        // Space weather specific colors
        velocity: "var(--primary)",
        density: "var(--accent)", 
        "magnetic-field": "var(--warning)",
        "geomagnetic-risk": "var(--destructive)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "Roboto Mono", "Consolas", "monospace"],
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        // Space weather specific animations
        "pulse": {
          "0%, 100%": { 
            opacity: "1",
            transform: "scale(1)"
          },
          "50%": { 
            opacity: "0.7",
            transform: "scale(1.05)"
          },
        },
        "wave": {
          "0%": { left: "-100%" },
          "100%": { left: "100%" },
        },
        "glow": {
          "from": {
            boxShadow: "0 0 10px hsl(var(--primary) / 0.2)",
          },
          "to": {
            boxShadow: "0 0 20px hsl(var(--primary) / 0.4), 0 0 30px hsl(var(--primary) / 0.2)",
          },
        },
        "solar-wind": {
          "0%, 100%": { transform: "translateX(0) scale(1)" },
          "25%": { transform: "translateX(2px) scale(1.02)" },
          "50%": { transform: "translateX(-1px) scale(0.98)" },
          "75%": { transform: "translateX(1px) scale(1.01)" },
        },
        "sparkle": {
          "0%, 100%": { 
            opacity: "1",
            transform: "scale(1) rotate(0deg)"
          },
          "50%": { 
            opacity: "0.5",
            transform: "scale(1.1) rotate(180deg)"
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        // Space weather animations
        "pulse": "pulse 2s infinite",
        "wave": "wave 3s infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "solar-wind": "solar-wind 4s ease-in-out infinite",
        "sparkle": "sparkle 3s ease-in-out infinite",
      },
      boxShadow: {
        "glow-sm": "0 0 10px hsl(var(--primary) / 0.3)",
        "glow": "0 0 20px hsl(var(--primary) / 0.3)",
        "glow-lg": "0 0 30px hsl(var(--primary) / 0.4)",
        "glow-accent": "0 0 20px hsl(var(--accent) / 0.3)",
        "glow-warning": "0 0 20px hsl(var(--warning) / 0.3)",
        "glow-destructive": "0 0 20px hsl(var(--destructive) / 0.3)",
      },
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
        "128": "32rem",
      },
      backgroundImage: {
        "gradient-space": "linear-gradient(135deg, var(--background) 0%, var(--card) 50%, var(--secondary) 100%)",
        "gradient-aurora": "linear-gradient(90deg, hsl(var(--primary) / 0.1) 0%, hsl(var(--accent) / 0.1) 50%, hsl(var(--warning) / 0.1) 100%)",
        "gradient-solar": "linear-gradient(45deg, var(--primary) 0%, var(--accent) 50%, var(--warning) 100%)",
      },
      backdropBlur: {
        xs: "2px",
      },
      scale: {
        "102": "1.02",
        "103": "1.03",
      },
      transitionDuration: {
        "2000": "2000ms",
        "3000": "3000ms",
      },
      zIndex: {
        "60": "60",
        "70": "70",
        "80": "80",
        "90": "90",
        "100": "100",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"), 
    require("@tailwindcss/typography"),
    // Custom plugin for space weather utilities
    function({ addUtilities }: any) {
      const newUtilities = {
        '.text-velocity': {
          color: 'hsl(var(--primary))',
        },
        '.text-density': {
          color: 'hsl(var(--accent))',
        },
        '.text-magnetic-field': {
          color: 'hsl(var(--warning))',
        },
        '.text-geomagnetic-risk': {
          color: 'hsl(var(--destructive))',
        },
        '.bg-velocity': {
          backgroundColor: 'hsl(var(--primary))',
        },
        '.bg-density': {
          backgroundColor: 'hsl(var(--accent))',
        },
        '.bg-magnetic-field': {
          backgroundColor: 'hsl(var(--warning))',
        },
        '.bg-geomagnetic-risk': {
          backgroundColor: 'hsl(var(--destructive))',
        },
        '.border-velocity': {
          borderColor: 'hsl(var(--primary))',
        },
        '.border-density': {
          borderColor: 'hsl(var(--accent))',
        },
        '.border-magnetic-field': {
          borderColor: 'hsl(var(--warning))',
        },
        '.border-geomagnetic-risk': {
          borderColor: 'hsl(var(--destructive))',
        },
      }
      
      addUtilities(newUtilities, ['responsive', 'hover'])
    }
  ],
} satisfies Config;
