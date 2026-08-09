import type { Config } from "tailwindcss";

// Phase 1 scope: wiring only. The full token set (brand palette, dark-mode
// pairs, type scale, radius/shadow scale) from
// docs/architecture/05-design-system.md, I.1–I.3, is implemented in
// Phase 2 (Design System) as its own package (@uzanunua/design-system)
// consumed here — not duplicated inline.
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
