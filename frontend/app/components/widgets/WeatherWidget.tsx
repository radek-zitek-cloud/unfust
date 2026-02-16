import {
  Button,
  Divider,
  Group,
  Loader,
  Modal,
  ScrollArea,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useCallback, useEffect, useState } from "react";
import {
  type ForecastItem,
  type ForecastResponse,
  type WeatherData,
  fetchForecast,
  fetchWeather,
} from "~/lib/api";
import { useAuth } from "~/lib/auth";
import type { WidgetComponentProps } from "./index";

function formatDay(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

// Map OpenWeatherMap icon codes to colorful emojis
function getWeatherEmoji(iconCode: string): string {
  const emojiMap: Record<string, string> = {
    "01d": "☀️", // clear sky day
    "01n": "🌙", // clear sky night
    "02d": "🌤️", // few clouds day
    "02n": "☁️", // few clouds night
    "03d": "☁️", // scattered clouds
    "03n": "☁️",
    "04d": "☁️", // broken clouds
    "04n": "☁️",
    "09d": "🌧️", // shower rain
    "09n": "🌧️",
    "10d": "🌦️", // rain day
    "10n": "🌧️", // rain night
    "11d": "⛈️", // thunderstorm
    "11n": "⛈️",
    "13d": "🌨️", // snow
    "13n": "🌨️",
    "50d": "🌫️", // mist
    "50n": "🌫️",
  };
  return emojiMap[iconCode] || "🌡️";
}

export function WeatherWidget({ config, onConfigChange }: WidgetComponentProps) {
  const { user } = useAuth();
  const [data, setData] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpened, { open: openSettings, close: closeSettings }] =
    useDisclosure(false);
  const [editCity, setEditCity] = useState(config.city || "");

  // Use config city first, then user profile location, then default
  const city = config.city || user?.location || "";
  const units = config.units || "metric";

  const load = useCallback(async () => {
    if (!city) return;
    try {
      const [weatherResult, forecastResult] = await Promise.all([
        fetchWeather(city, units),
        fetchForecast(city, units),
      ]);
      setData(weatherResult);
      setForecast(forecastResult);
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

  const handleSaveSettings = () => {
    onConfigChange({
      ...config,
      city: editCity.trim() || undefined,
    });
    closeSettings();
  };

  const handleOpenSettings = () => {
    setEditCity(config.city || "");
    openSettings();
  };

  const handleClearOverride = () => {
    const { city: _, ...restConfig } = config;
    onConfigChange(restConfig);
  };

  if (!city) {
    return (
      <Stack align="center" justify="center" h="100%">
        <Text size="sm" c="dimmed" ta="center">
          Set your location in profile or configure widget
        </Text>
        <Button variant="light" size="xs" onClick={handleOpenSettings}>
          Configure
        </Button>

        <Modal
          opened={settingsOpened}
          onClose={closeSettings}
          title="Weather Settings"
          size="sm"
        >
          <Stack gap="sm">
            <TextInput
              label="City"
              placeholder="Enter city name (e.g., London)"
              description="Leave empty to use profile location"
              value={editCity}
              onChange={(e) => setEditCity(e.currentTarget.value)}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={closeSettings}>
                Cancel
              </Button>
              <Button onClick={handleSaveSettings}>Save</Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack align="center" justify="center" h="100%">
        <Text size="sm" c="red">
          {error}
        </Text>
        <Button variant="light" size="xs" onClick={handleOpenSettings}>
          Change city
        </Button>

        <Modal
          opened={settingsOpened}
          onClose={closeSettings}
          title="Weather Settings"
          size="sm"
        >
          <Stack gap="sm">
            <TextInput
              label="City"
              placeholder="Enter city name"
              description="Leave empty to use profile location"
              value={editCity}
              onChange={(e) => setEditCity(e.currentTarget.value)}
            />
            {config.city && (
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                onClick={() => {
                  setEditCity("");
                }}
              >
                Use profile location
              </Button>
            )}
            <Group justify="flex-end">
              <Button variant="default" onClick={closeSettings}>
                Cancel
              </Button>
              <Button onClick={handleSaveSettings}>Save</Button>
            </Group>
          </Stack>
        </Modal>
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

  // Skip the first forecast item if it's today (current weather already shown)
  const forecastItems = forecast?.forecasts.slice(1, 5) || [];

  return (
    <>
      <Stack gap="xs" justify="center" h="100%">
        <Group justify="space-between" align="flex-start">
          <div>
            <Text fw={700} size="xl">
              {Math.round(data.temp)}
              {tempUnit}
            </Text>
            <Text size="sm" c="dimmed" tt="capitalize">
              {data.description}
            </Text>
          </div>
          <Text size="xl" style={{ fontSize: "48px", lineHeight: 1 }}>
            {getWeatherEmoji(data.icon)}
          </Text>
        </Group>

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

        {/* Forecast Section */}
        {forecastItems.length > 0 && (
          <>
            <Divider my="xs" />
            <ScrollArea scrollbars="x" scrollbarSize={6} offsetScrollbars>
              <Group
                gap="xs"
                wrap="nowrap"
                justify="center"
                style={{ minWidth: "100%" }}
              >
                {forecastItems.map((item, index) => (
                  <Stack
                    key={index}
                    align="flex-start"
                    gap={2}
                    py={4}
                    style={{ flex: 1, minWidth: 80 }}
                  >
                    <Text size="xs" fw={500} w="100%" ta="center">
                      {formatDay(item.date)}
                    </Text>
                    <Text size="xl" style={{ fontSize: "32px", lineHeight: 1 }} w="100%" ta="center">
                      {getWeatherEmoji(item.icon)}
                    </Text>
                    <Text size="xs" fw={600} w="100%" ta="center">
                      {Math.round(item.temp)}
                      {tempUnit}
                    </Text>
                    <Text
                      fz={10}
                      c="dimmed"
                      tt="capitalize"
                      ta="center"
                      style={{ whiteSpace: "normal", wordWrap: "break-word" }}
                      w="100%"
                    >
                      {item.description}
                    </Text>
                  </Stack>
                ))}
              </Group>
            </ScrollArea>
          </>
        )}

        <Group gap="xs" mt="auto">
          <Text size="xs" c="dimmed" fs="italic">
            {data.city}{data.country ? `, ${data.country}` : ""}
            <Text span size="xs" c="gray.6" ml={4}>
              ({data.lat.toFixed(2)}, {data.lon.toFixed(2)})
            </Text>
          </Text>
          {config.city && (
            <Text size="xs" c="teal">
              (custom)
            </Text>
          )}
        </Group>

        <Button
          variant="light"
          size="xs"
          onClick={handleOpenSettings}
          mt="xs"
        >
          {config.city ? "Change city" : "Set custom city"}
        </Button>
      </Stack>

      <Modal
        opened={settingsOpened}
        onClose={closeSettings}
        title="Weather Settings"
        size="sm"
      >
        <Stack gap="sm">
          <TextInput
            label="City"
            placeholder="Enter city name"
            description={
              user?.location
                ? `Leave empty to use profile location (${user.location})`
                : "Enter a city name"
            }
            value={editCity}
            onChange={(e) => setEditCity(e.currentTarget.value)}
          />

          {config.city && user?.location && (
            <Button
              variant="light"
              color="teal"
              size="xs"
              onClick={() => {
                setEditCity("");
              }}
            >
              Use profile location ({user.location})
            </Button>
          )}

          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={closeSettings}>
              Cancel
            </Button>
            <Button onClick={handleSaveSettings}>Save</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
