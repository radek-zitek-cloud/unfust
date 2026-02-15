import { Stack, Text } from "@mantine/core";
import { useEffect, useState } from "react";

interface ClockWidgetProps {
  config: { timezone?: string; format?: "12h" | "24h" };
}

export function ClockWidget({ config }: ClockWidgetProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: config.format === "12h",
    timeZone: config.timezone || undefined,
  };

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: config.timezone || undefined,
  };

  return (
    <Stack align="center" justify="center" h="100%" gap={4}>
      <Text size="2rem" fw={700} ff="monospace" lh={1}>
        {now.toLocaleTimeString(undefined, timeOptions)}
      </Text>
      <Text size="sm" c="dimmed">
        {now.toLocaleDateString(undefined, dateOptions)}
      </Text>
      {config.timezone && (
        <Text size="xs" c="dimmed" ff="monospace">
          {config.timezone}
        </Text>
      )}
    </Stack>
  );
}
