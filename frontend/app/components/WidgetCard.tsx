import { ActionIcon, Group, Paper, Text } from "@mantine/core";
import type { ReactNode } from "react";

function IconSettings({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconX({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

interface WidgetCardProps {
  title: string;
  children: ReactNode;
  onSettings?: () => void;
  onRemove?: () => void;
}

export function WidgetCard({
  title,
  children,
  onSettings,
  onRemove,
}: WidgetCardProps) {
  return (
    <Paper
      withBorder
      radius="md"
      h="100%"
      style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}
    >
      <Group
        className="widget-drag-handle"
        justify="space-between"
        px="sm"
        py={6}
        style={{
          borderBottom: "1px solid var(--mantine-color-default-border)",
          flexShrink: 0,
          cursor: "grab",
        }}
      >
        <Text size="xs" fw={600} tt="uppercase" c="dimmed" ff="monospace">
          {title}
        </Text>
        <Group gap={4}>
          {onSettings && (
            <ActionIcon
              variant="subtle"
              size="xs"
              color="gray"
              onClick={onSettings}
            >
              <IconSettings size={14} />
            </ActionIcon>
          )}
          {onRemove && (
            <ActionIcon
              variant="subtle"
              size="xs"
              color="gray"
              onClick={onRemove}
            >
              <IconX size={14} />
            </ActionIcon>
          )}
        </Group>
      </Group>
      <div
        style={{
          flex: 1,
          padding: "var(--mantine-spacing-sm)",
          overflow: "auto",
        }}
      >
        {children}
      </div>
    </Paper>
  );
}
