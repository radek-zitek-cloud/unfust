import {
  Button,
  Drawer,
  Group,
  RingProgress,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import HeatMap from "@uiw/react-heat-map";
import type { Habit, HabitLog } from "~/lib/habits-api";
import { getLogHistory } from "~/lib/habits-api";

interface HabitDetailProps {
  habit: Habit | null;
  opened: boolean;
  onClose: () => void;
  onCheckin: () => void;
}

// Generate dates for the last year
function getLastYearDates(): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  for (let i = 365; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d);
  }
  return dates;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function HabitDetail({
  habit,
  opened,
  onClose,
  onCheckin,
}: HabitDetailProps) {
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (habit && opened) {
      loadLogs();
    }
  }, [habit, opened]);

  const loadLogs = async () => {
    if (!habit) return;
    setLoading(true);
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 365);

    try {
      const data = await getLogHistory(
        habit.id,
        formatDate(start),
        formatDate(end)
      );
      setLogs(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const heatmapData = useMemo(() => {
    const counts: Record<string, number> = {};
    logs.forEach((log) => {
      const date = log.logged_date;
      counts[date] = (counts[date] || 0) + 1;
    });

    return Object.entries(counts).map(([date, count]) => ({
      date,
      count,
    }));
  }, [logs]);

  const stats = habit?.stats;
  const isComplete = stats?.is_complete_today ?? false;
  const progress = stats
    ? Math.min((stats.today_count / habit.target_count) * 100, 100)
    : 0;

  if (!habit) return null;

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <Text size="xl">{habit.emoji}</Text>
          <Text fw={600}>{habit.name}</Text>
        </Group>
      }
      size="lg"
      position="right"
    >
      <Stack gap="lg">
        {/* Description */}
        {habit.description && (
          <Text c="dimmed" size="sm">
            {habit.description}
          </Text>
        )}

        {/* Stats Row */}
        <Group justify="space-between">
          <Group gap="xl">
            <Tooltip label="Current streak">
              <div>
                <Text size="xs" c="dimmed">
                  Current Streak
                </Text>
                <Text fw={700} size="xl">
                  🔥 {stats?.current_streak ?? 0}
                </Text>
              </div>
            </Tooltip>

            <Tooltip label="Longest streak">
              <div>
                <Text size="xs" c="dimmed">
                  Best Streak
                </Text>
                <Text fw={700} size="xl">
                  {stats?.longest_streak ?? 0}
                </Text>
              </div>
            </Tooltip>

            <Tooltip label="Total completions">
              <div>
                <Text size="xs" c="dimmed">
                  Total
                </Text>
                <Text fw={700} size="xl">
                  {stats?.total_completions ?? 0}
                </Text>
              </div>
            </Tooltip>

            <Tooltip label="30-day completion rate">
              <div>
                <Text size="xs" c="dimmed">
                  30-Day Rate
                </Text>
                <Text fw={700} size="xl">
                  {stats?.completion_rate ?? 0}%
                </Text>
              </div>
            </Tooltip>
          </Group>

          <RingProgress
            size={80}
            thickness={8}
            roundCaps
            sections={[
              {
                value: progress,
                color: isComplete ? "teal" : "blue",
              },
            ]}
            label={
              <Text size="xs" ta="center" fw={600}>
                {stats?.today_count ?? 0}/{habit.target_count}
              </Text>
            }
          />
        </Group>

        {/* Check-in Button */}
        <Button
          variant={isComplete ? "light" : "filled"}
          color={isComplete ? "teal" : undefined}
          w="fit-content"
          onClick={onCheckin}
          disabled={isComplete}
        >
          {isComplete ? "Done for today!" : "Check in"}
        </Button>

        {/* Heatmap */}
        <div>
          <Text fw={600} mb="sm">
            Activity (Last Year)
          </Text>
          {loading ? (
            <Text c="dimmed">Loading...</Text>
          ) : (
            <HeatMap
              value={heatmapData}
              width="100%"
              height={160}
              style={{ color: "#ad001d" }}
              startDate={new Date(new Date().setDate(new Date().getDate() - 365))}
              endDate={new Date()}
              rectProps={{
                rx: 2,
              }}
              legendRender={(props) => (
                <rect {...props} y={Number(props.y || 0) + 10} rx={2} />
              )}
            />
          )}
        </div>

        {/* Habit Details */}
        <div>
          <Text fw={600} mb="xs">
            Details
          </Text>
          <Stack gap="xs">
            <Group>
              <Text size="sm" c="dimmed">
                Type:
              </Text>
              <Text size="sm" tt="capitalize">
                {habit.habit_type}
              </Text>
            </Group>
            <Group>
              <Text size="sm" c="dimmed">
                Frequency:
              </Text>
              <Text size="sm" tt="capitalize">
                {habit.frequency_type}
              </Text>
            </Group>
            <Group>
              <Text size="sm" c="dimmed">
                Target:
              </Text>
              <Text size="sm">
                {habit.target_count} per {habit.frequency_type}
              </Text>
            </Group>
            {habit.category && (
              <Group>
                <Text size="sm" c="dimmed">
                  Category:
                </Text>
                <Text size="sm">{habit.category}</Text>
              </Group>
            )}
          </Stack>
        </div>
      </Stack>
    </Drawer>
  );
}
