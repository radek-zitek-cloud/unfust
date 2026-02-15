import {
  Button,
  Group,
  Loader,
  RingProgress,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useCallback, useEffect, useState } from "react";
import type { WidgetComponentProps } from "~/components/widgets";
import {
  type HabitSummaryResponse,
  getHabitsSummary,
  logCompletion,
} from "~/lib/habits-api";

function IconCheck({ size = 14 }: { size?: number }) {
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
      <polyline points="20 6 9 17 4 12" />
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

export function HabitsWidget({ config: _config }: WidgetComponentProps) {
  const [summary, setSummary] = useState<HabitSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await getHabitsSummary();
      setSummary(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000); // Refresh every minute
    return () => clearInterval(interval);
  }, [load]);

  const handleCheckin = async (habitId: string) => {
    try {
      await logCompletion(habitId);
      notifications.show({
        title: "Checked in!",
        message: "Keep up the streak!",
        color: "teal",
      });
      load();
    } catch (err: any) {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    }
  };

  if (loading) {
    return (
      <Stack align="center" justify="center" h="100%">
        <Loader size="sm" />
      </Stack>
    );
  }

  if (!summary || summary.total_habits === 0) {
    return (
      <Stack align="center" justify="center" h="100%" gap="xs">
        <Text size="sm" c="dimmed" ta="center">
          No habits yet
        </Text>
        <Text size="xs" c="dimmed">
          Go to Habits page to create one
        </Text>
      </Stack>
    );
  }

  const progress =
    summary.total_habits > 0
      ? (summary.completed_today / summary.total_habits) * 100
      : 0;

  return (
    <Stack gap="sm" h="100%">
      {/* Header Stats */}
      <Group justify="space-between" align="center">
        <Group gap="xs">
          <RingProgress
            size={40}
            thickness={4}
            sections={[
              {
                value: progress,
                color: progress === 100 ? "green" : "blue",
              },
            ]}
          />
          <div>
            <Text size="xs" c="dimmed">
              Today
            </Text>
            <Text size="sm" fw={600}>
              {summary.completed_today}/{summary.total_habits}
            </Text>
          </div>
        </Group>

        <Group gap="xs">
          <Tooltip label="Best streak">
            <Group gap={4} c="orange">
              <IconFlame size={14} />
              <Text size="sm" fw={600}>
                {summary.best_streak}
              </Text>
            </Group>
          </Tooltip>
          <Tooltip label={`Level ${summary.user_level}`}>
            <Text size="xs" c="dimmed">
              L{summary.user_level}
            </Text>
          </Tooltip>
        </Group>
      </Group>

      {/* Habits List */}
      <Stack gap="xs" style={{ flex: 1, overflow: "auto" }}>
        {summary.habits.slice(0, 5).map((habit) => {
          const pct = Math.min(
            (habit.today_count / habit.target_count) * 100,
            100
          );
          return (
            <Group key={habit.habit_id} justify="space-between" wrap="nowrap">
              <Group gap="xs" wrap="nowrap">
                <Text size="sm">{habit.emoji}</Text>
                <Text
                  size="sm"
                  lineClamp={1}
                  style={{
                    textDecoration: habit.is_complete ? "line-through" : "none",
                    opacity: habit.is_complete ? 0.6 : 1,
                  }}
                >
                  {habit.name}
                </Text>
              </Group>

              <Group gap="xs" wrap="nowrap">
                <Text size="xs" c="dimmed">
                  {habit.today_count}/{habit.target_count}
                </Text>
                {!habit.is_complete && (
                  <Button
                    size="compact-xs"
                    variant="light"
                    leftSection={<IconCheck size={12} />}
                    onClick={() => handleCheckin(habit.habit_id)}
                  >
                    Do
                  </Button>
                )}
              </Group>
            </Group>
          );
        })}

        {summary.habits.length > 5 && (
          <Text size="xs" c="dimmed" ta="center">
            +{summary.habits.length - 5} more habits
          </Text>
        )}
      </Stack>
    </Stack>
  );
}
