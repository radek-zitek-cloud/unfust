import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Paper,
  RingProgress,
  Stack,
  Text,
  Tooltip,
  useComputedColorScheme,
} from "@mantine/core";
import type { Habit } from "~/lib/habits-api";

interface HabitCardProps {
  habit: Habit;
  onCheckin: () => void;
  onEdit: () => void;
  onClick?: () => void;
  dragHandle?: boolean;
}

function IconEdit({ size = 14 }: { size?: number }) {
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
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconFlame({ size = 14 }: { size?: number }) {
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
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

function IconDrag({ size = 14 }: { size?: number }) {
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
      <circle cx="9" cy="12" r="1" />
      <circle cx="9" cy="5" r="1" />
      <circle cx="9" cy="19" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="15" cy="5" r="1" />
      <circle cx="15" cy="19" r="1" />
    </svg>
  );
}

export function HabitCard({
  habit,
  onCheckin,
  onEdit,
  onClick,
  dragHandle = false,
}: HabitCardProps) {
  const scheme = useComputedColorScheme("light");
  const isDark = scheme === "dark";

  const stats = habit.stats;
  const isComplete = stats?.is_complete_today ?? false;
  const todayCount = stats?.today_count ?? 0;
  const targetCount = habit.target_count;
  const progress = Math.min((todayCount / targetCount) * 100, 100);

  // Determine ring color
  let ringColor = habit.color;
  if (isComplete) {
    ringColor = "#40c057"; // green
  } else if (todayCount > 0) {
    ringColor = "#fd7e14"; // orange - in progress
  }

  // Card background - between header (gray-1/dark-7) and page background
  const cardBg = isDark ? "var(--mantine-color-dark-8)" : "var(--mantine-color-gray-0)";
  const shadow = isDark 
    ? "0 1px 3px rgba(0,0,0,0.3)" 
    : "0 1px 3px rgba(0,0,0,0.08)";

  return (
    <Paper
      withBorder
      radius="md"
      h="100%"
      bg={cardBg}
      style={{ 
        display: "flex", 
        flexDirection: "column", 
        overflow: "hidden",
        boxShadow: shadow,
      }}
    >
      {/* Header - matching WidgetCard style */}
      <Group
        justify="space-between"
        px="sm"
        py={6}
        style={{
          borderBottom: "1px solid var(--app-border)",
          backgroundColor: isDark
            ? "var(--mantine-color-dark-7)"
            : "var(--mantine-color-gray-1)",
          flexShrink: 0,
          cursor: dragHandle ? "grab" : "pointer",
        }}
        onClick={!dragHandle ? onClick : undefined}
      >
        <Group gap="xs">
          {dragHandle && (
            <Text size="xs" c="dimmed" className="habit-drag-handle">
              <IconDrag />
            </Text>
          )}
          <Text size="sm">{habit.emoji}</Text>
          <Text
            size="xs"
            fw={600}
            tt="uppercase"
            c="dimmed"
            style={{ fontFamily: '"DM Sans", sans-serif', letterSpacing: "0.06em" }}
            lineClamp={1}
          >
            {habit.name}
          </Text>
        </Group>
        <Group gap={4}>
          {stats && stats.current_streak > 0 && (
            <Tooltip label="Current streak">
              <Group gap={2} c="orange">
                <IconFlame size={12} />
                <Text size="xs" fw={600}>
                  {stats.current_streak}
                </Text>
              </Group>
            </Tooltip>
          )}
          <ActionIcon
            variant="subtle"
            size="xs"
            color="gray"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            style={{ transition: "color var(--transition-standard)" }}
          >
            <IconEdit size={14} />
          </ActionIcon>
        </Group>
      </Group>

      {/* Content */}
      <div
        style={{
          flex: 1,
          padding: "var(--mantine-spacing-sm)",
          overflow: "auto",
        }}
      >
        <Stack gap="sm">
          {/* Description */}
          {habit.description && (
            <Text size="xs" c="dimmed" lineClamp={2}>
              {habit.description}
            </Text>
          )}

          {/* Progress Section */}
          <Group justify="space-between" align="center">
            <RingProgress
              size={60}
              thickness={6}
              roundCaps
              sections={[{ value: progress, color: ringColor }]}
              label={
                <Text size="xs" ta="center" fw={600}>
                  {todayCount}/{targetCount}
                </Text>
              }
            />

            <Stack gap={0} align="flex-end">
              {/* Completion Rate */}
              {stats && (
                <Text size="xs" c="dimmed">
                  {stats.completion_rate}% (30d)
                </Text>
              )}
              {/* Category badge */}
              {habit.category && (
                <Badge size="xs" variant="light" color="gray">
                  {habit.category}
                </Badge>
              )}
            </Stack>
          </Group>

          {/* Check-in Button */}
          <Button
            variant={isComplete ? "light" : "filled"}
            color={isComplete ? "teal" : undefined}
            w="fit-content"
            onClick={(e) => {
              e.stopPropagation();
              onCheckin();
            }}
            disabled={isComplete}
          >
            {isComplete ? "Done!" : "Check in"}
          </Button>
        </Stack>
      </div>
    </Paper>
  );
}
