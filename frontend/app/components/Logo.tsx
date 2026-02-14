import { Group, Text } from "@mantine/core";

interface LogoProps {
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { fontSize: 16, letterSpacing: 3 },
  md: { fontSize: 20, letterSpacing: 4 },
  lg: { fontSize: 32, letterSpacing: 6 },
};

export function Logo({ size = "md" }: LogoProps) {
  const s = sizes[size];

  return (
    <Group gap={0} align="center">
      <Text
        component="span"
        fw={800}
        ff="monospace"
        tt="uppercase"
        style={{
          fontSize: s.fontSize,
          letterSpacing: s.letterSpacing,
          background: "linear-gradient(135deg, #09ADC3 0%, #128797 50%, #0098a8 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        unfust
      </Text>
    </Group>
  );
}
