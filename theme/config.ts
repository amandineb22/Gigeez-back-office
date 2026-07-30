/**
 * Brand theme — the single place to swap in real brand identity.
 *
 * HOW TO REBRAND:
 * 1. Colors: replace the hex values in `colors.brand` and `colors.accent` below.
 *    Keep the 50 -> 900 scale (50 = lightest, 900 = darkest) since components
 *    reference specific steps (e.g. brand-600 for primary buttons).
 * 2. Fonts: swap the Google Font names in `app/layout.tsx` (search for
 *    `Fraunces` and `Inter`) and update `fonts.display` / `fonts.sans` labels
 *    here to match — this object is just metadata, next/font does the loading.
 * 3. Logo: drop your logo file into `/public` and update `logo.mark` (plus
 *    `logo.width` / `logo.height` to match its native pixel size, so
 *    next/image can render it without layout shift). `logo.text` is kept as
 *    the accessible alt text and as a plain-text fallback (e.g. page title).
 */
export const theme = {
  name: "Atelier",
  tagline: "Studio operations, tailored.",
  colors: {
    // Warm clay/terracotta — boutique, editorial, not corporate-blue.
    brand: {
      50: "#FBF2EE",
      100: "#F5E2D9",
      200: "#EAC3AF",
      300: "#DEA187",
      400: "#CB7C5C",
      500: "#B45F3D", // primary
      600: "#954A2E",
      700: "#783A24",
      800: "#5E2E1D",
      900: "#452216",
    },
    // Muted sage — secondary accent for charts/badges.
    accent: {
      50: "#F1F4EF",
      100: "#E1E8DC",
      200: "#C3D1BA",
      300: "#A2B896",
      400: "#849D77",
      500: "#68815C", // secondary
      600: "#546849",
      700: "#425138",
      800: "#333F2C",
      900: "#262E21",
    },
    // Warm off-white / near-black ink — editorial paper feel.
    paper: "#FBF9F6",
    ink: "#2A2420",
  },
  fonts: {
    display: "Fraunces", // editorial serif for headings/logo
    sans: "Inter", // clean sans for body/UI
  },
  logo: {
    text: "Gigeez",
    mark: "/logo.png", // replace with your own file in /public
    width: 225,
    height: 225,
  },
} as const;

export type Theme = typeof theme;
