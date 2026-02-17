import { Menu, ActionIcon, Box } from "@mantine/core";
import classes from "./ColorPicker.module.css";

function IconPalette({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a10 10 0 0 1 0 20 10 10 0 0 1 0-20" />
      <path d="M12 2a5 5 0 0 1 0 10 5 5 0 0 1 0-10" />
    </svg>
  );
}

export const PASTEL_COLORS = [
  { hex: "#FFF9C4", name: "Yellow" },
  { hex: "#FFCDD2", name: "Pink" },
  { hex: "#BBDEFB", name: "Blue" },
  { hex: "#C8E6C9", name: "Green" },
  { hex: "#E1BEE7", name: "Purple" },
  { hex: "#FFE0B2", name: "Orange" },
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          size="sm"
          title="Change color"
          aria-label="Change color"
        >
          <IconPalette size={16} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown p="xs">
        <Box className={classes.colorGrid}>
          {PASTEL_COLORS.map((color) => (
            <button
              key={color.hex}
              className={classes.colorSwatch}
              style={{
                backgroundColor: color.hex,
                boxShadow:
                  value === color.hex
                    ? `0 0 0 2px var(--mantine-color-blue-6)`
                    : undefined,
              }}
              onClick={() => onChange(color.hex)}
              title={color.name}
              aria-label={`Select ${color.name}`}
            />
          ))}
        </Box>
      </Menu.Dropdown>
    </Menu>
  );
}
