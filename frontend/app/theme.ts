import { createTheme, type MantineColorsTuple } from "@mantine/core";

const teal: MantineColorsTuple = [
  "#e6fcfc",
  "#d1f4f4",
  "#a3e8e8",
  "#71dbdb",
  "#4ad0d0",
  "#33c9c9",
  "#09ADC3",
  "#0098a8",
  "#008796",
  "#007584",
];

export const theme = createTheme({
  primaryColor: "teal",
  colors: {
    teal,
  },
  fontFamily:
    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  headings: {
    fontFamily:
      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    fontWeight: "700",
  },
  defaultRadius: "md",
  cursorType: "pointer",
});
