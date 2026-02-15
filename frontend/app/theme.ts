import {
  createTheme,
  type MantineColorsTuple,
  type CSSVariablesResolver,
} from "@mantine/core";

const accent: MantineColorsTuple = [
  "#f0eeff", "#e0dbff", "#c3b8ff", "#a292ff", "#8570ff",
  "#7158ff", "#6448f5", "#5438e0", "#4530c8", "#3826b0",
];

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {
    "--transition-standard": "150ms cubic-bezier(0.4, 0, 0.2, 1)",
  },
  light: {
    "--app-border": "rgba(0, 0, 0, 0.08)",
  },
  dark: {
    "--app-border": "rgba(255, 255, 255, 0.08)",
  },
});

export const theme = createTheme({
  primaryColor: "accent",
  colors: { accent },
  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  headings: {
    fontFamily: '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontWeight: "700",
    sizes: {
      h1: { fontSize: "2rem",    lineHeight: "1.2",  fontWeight: "800" },
      h2: { fontSize: "1.5rem",  lineHeight: "1.3",  fontWeight: "700" },
      h3: { fontSize: "1.25rem", lineHeight: "1.35", fontWeight: "600" },
      h4: { fontSize: "1.1rem",  lineHeight: "1.4",  fontWeight: "600" },
    },
  },
  defaultRadius: "md",
  cursorType: "pointer",
  components: {
    Paper: {
      defaultProps: { radius: "md" },
    },
    NavLink: {
      styles: {
        root: {
          borderRadius: "var(--mantine-radius-md)",
          transition: "background-color var(--transition-standard)",
          fontWeight: 500,
        },
      },
    },
    Button: {
      styles: {
        root: {
          transition: "background-color var(--transition-standard)",
          fontFamily: '"DM Sans", sans-serif',
          fontWeight: 600,
        },
      },
    },
    Badge: { defaultProps: { radius: "sm" } },
    ActionIcon: {
      styles: {
        root: { transition: "background-color var(--transition-standard)" },
      },
    },
  },
});
