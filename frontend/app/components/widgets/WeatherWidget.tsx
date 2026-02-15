import { Group, Loader, Stack, Text } from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
import { type WeatherData, fetchWeather } from "~/lib/api";

interface WeatherWidgetProps {
  config: { city?: string; units?: "metric" | "imperial" };
}

export function WeatherWidget({ config }: WeatherWidgetProps) {
  const [data, setData] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const city = config.city || "London";
  const units = config.units || "metric";

  const load = useCallback(async () => {
    try {
      const result = await fetchWeather(city, units);
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load weather");
    }
  }, [city, units]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 600_000); // 10 min
    return () => clearInterval(interval);
  }, [load]);

  if (error) {
    return (
      <Stack align="center" justify="center" h="100%">
        <Text size="sm" c="red">
          {error}
        </Text>
      </Stack>
    );
  }

  if (!data) {
    return (
      <Stack align="center" justify="center" h="100%">
        <Loader size="sm" />
      </Stack>
    );
  }

  const tempUnit = units === "metric" ? "\u00b0C" : "\u00b0F";

  return (
    <Stack gap="xs" justify="center" h="100%">
      <Group justify="space-between">
        <Text fw={700} size="xl">
          {Math.round(data.temp)}
          {tempUnit}
        </Text>
        <img
          src={`https://openweathermap.org/img/wn/${data.icon}@2x.png`}
          alt={data.description}
          width={48}
          height={48}
        />
      </Group>
      <Text size="sm" c="dimmed" tt="capitalize">
        {data.description}
      </Text>
      <Group gap="lg">
        <Text size="xs" c="dimmed">
          Feels like {Math.round(data.feels_like)}
          {tempUnit}
        </Text>
        <Text size="xs" c="dimmed">Humidity {data.humidity}%</Text>
        <Text size="xs" c="dimmed">
          Wind {data.wind_speed} {units === "metric" ? "m/s" : "mph"}
        </Text>
      </Group>
    </Stack>
  );
}
