import { Badge, Group, Loader, Progress, Stack, Text } from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
import { type SystemStats, fetchSystemStats } from "~/lib/api";

function StatBar({
  label,
  percent,
  detail,
}: {
  label: string;
  percent: number;
  detail: string;
}) {
  const color = percent > 90 ? "red" : percent > 70 ? "yellow" : "teal";
  return (
    <div>
      <Group justify="space-between" mb={2}>
        <Text size="xs" fw={600}>
          {label}
        </Text>
        <Text size="xs" c="dimmed">
          {detail}
        </Text>
      </Group>
      <Progress value={percent} size="sm" color={color} radius="xl" />
    </div>
  );
}

export function SystemWidget() {
  const [stats, setStats] = useState<SystemStats | null>(null);

  const load = useCallback(async () => {
    try {
      setStats(await fetchSystemStats());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  if (!stats) {
    return (
      <Stack align="center" justify="center" h="100%">
        <Loader size="sm" />
      </Stack>
    );
  }

  return (
    <Stack gap="sm" justify="center" h="100%">
      <StatBar
        label="CPU"
        percent={stats.cpu_percent}
        detail={`${stats.cpu_percent.toFixed(1)}%`}
      />
      <StatBar
        label="Memory"
        percent={stats.memory_percent}
        detail={`${stats.memory_used_gb} / ${stats.memory_total_gb} GB`}
      />
      <StatBar
        label="Disk"
        percent={stats.disk_percent}
        detail={`${stats.disk_used_gb} / ${stats.disk_total_gb} GB`}
      />
      {stats.containers && stats.containers.length > 0 && (
        <div>
          <Text size="xs" fw={600} mb={4}>
            Containers
          </Text>
          <Group gap={4}>
            {stats.containers.map((c) => (
              <Badge
                key={c.name}
                size="xs"
                variant="light"
                color={c.status === "running" ? "teal" : "gray"}
              >
                {c.name}
              </Badge>
            ))}
          </Group>
        </div>
      )}
    </Stack>
  );
}
