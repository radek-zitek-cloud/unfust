import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  RingProgress,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import type { Habit } from "~/lib/habits-api";

interface HabitCardProps {
  habit: Habit;
  onCheckin: () => void;
  onEdit: () => void;
  onClick: () => void;
}

function IconEdit({ size = 16 }: { size?: number }) {
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

function IconFlame({ size = 16 }: { size?: number }) {
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

export function HabitCard({ habit, onCheckin, onEdit, onClick }: HabitCardProps) {
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

  return (
    <Card
      withBorder
      padding="md"
      radius="md"
      style={{
        borderLeft: `4px solid ${habit.color}`,
        cursor: "pointer",
      }}
      onClick={onClick}
    >
      <Stack gap="xs">
        {/* Header */}
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <Text size="xl">{habit.emoji}</Text>
            <div>
              <Text fw={600} size="sm" lineClamp={1}>
                {habit.name}
              </Text>
              {habit.category && (
                <Badge size="xs" variant="light" color="gray">
                  {habit.category}
                </Badge>
              )}
            </div>
          </Group>
          <ActionIcon
            variant="subtle"
            size="sm"
            color="gray"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <IconEdit />
          </ActionIcon>
        </Group>

        {/* Description */}
        {habit.description && (
          <Text size="xs" c="dimmed" lineClamp={1}>
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

          <Stack gap={2} align="flex-end">
            {/* Streak */}
            {stats && stats.current_streak > 0 && (
              <Tooltip label="Current streak">
                <Group gap={4} c="orange">
                  <IconFlame size={14} />
                  <Text size="sm" fw={600}>
                    {stats.current_streak}
                  </Text>
                </Group>
              </Tooltip>
            )}

            {/* Completion Rate */}
            {stats && (
              <Text size="xs" c="dimmed">
                {stats.completion_rate}% (30d)
              </Text>
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
    </Card>
  );
}
