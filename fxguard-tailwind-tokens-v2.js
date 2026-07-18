// tailwind.config.js — merge this `extend` block into your existing config.
// v2: adds action-state, confidence, and data-quality tokens on top of v1's
// base palette. If a color isn't named here, it doesn't belong in a className.

module.exports = {
  theme: {
    extend: {
      colors: {
        bg: "#0B0F0E",
        surface: "#12181A",
        "surface-elevated": "#1A2220",
        "surface-sunken": "#080B0A",

        accent: {
          DEFAULT: "#34D399",
          hover: "#5EE7B3",
          muted: "#1B4332",
        },

        text: {
          primary: "#F5F7F6",
          secondary: "#9BA6A2",
          tertiary: "#5C6764",
          onaccent: "#06120D",
        },

        border: {
          DEFAULT: "#232B29",
          strong: "#35403D",
        },

        // Recommendation action states — map 1:1 to RecommendationResponse.action.
        // Only these four. Never introduce a fifth color for an action badge.
        action: {
          convert: { DEFAULT: "#34D399", bg: "#12281F" },
          wait: { DEFAULT: "#F2B84B", bg: "#2A2213" },
          hedge: { DEFAULT: "#F2A65A", bg: "#2A1F13" },
          split: { DEFAULT: "#5AA9E6", bg: "#131F2A" },
        },

        // Confidence categories — map to RecommendationResponse.confidence,
        // bucketed High (>80%) / Medium (50-80%) / Low (<50%).
        confidence: {
          high: "#34D399",
          medium: "#F2B84B",
          low: "#EF6461",
          track: "#1A2220",
        },

        // Data quality / honesty states — map to history_quality and
        // contains_synthetic. "synthetic" is deliberately desaturated,
        // never given a "confident" color.
        data: {
          live: "#34D399",
          limited: "#F2B84B",
          synthetic: "#9BA6A2",
        },

        success: "#34D399",
        warning: "#F2B84B",
        error: "#EF6461",
        info: "#5AA9E6",
      },

      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        body: ["Manrope", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },

      fontSize: {
        display: ["clamp(2.5rem, 5vw, 3.5rem)", { lineHeight: "1.1" }],
        h1: ["1.75rem", { lineHeight: "1.2" }],
        h2: ["1.25rem", { lineHeight: "1.3" }],
        body: ["1rem", { lineHeight: "1.5" }],
        small: ["0.8125rem", { lineHeight: "1.4" }],
      },

      spacing: {
        1: "4px", 2: "8px", 3: "12px", 4: "16px",
        6: "24px", 8: "32px", 12: "48px", 16: "64px",
      },

      borderRadius: {
        sm: "8px", md: "12px", lg: "20px", full: "999px",
      },

      transitionTimingFunction: {
        settle: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        fast: "150ms",
        base: "400ms",
      },

      boxShadow: {
        sm: "0 1px 2px rgba(0,0,0,0.4)",
        md: "0 8px 24px rgba(0,0,0,0.35)",
        "glow-convert": "0 0 32px rgba(52, 211, 153, 0.18)",
        "glow-wait": "0 0 32px rgba(242, 184, 75, 0.15)",
      },
    },
  },
};

/*
 USAGE RULE: bg-surface, text-text-secondary, bg-action-convert-bg,
 text-action-convert, text-confidence-high, text-data-synthetic, p-4,
 rounded-lg, duration-base ease-settle — always these names, never a raw
 hex or arbitrary value in a className.
*/
