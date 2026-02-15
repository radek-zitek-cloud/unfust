import {
  Button,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useCallback, useEffect, useState } from "react";
import { type WeatherData, fetchWeather } from "~/lib/api";
import { useAuth } from "~/lib/auth";
import type { WidgetComponentProps } from "./index";

export function WeatherWidget({ config, onConfigChange }: WidgetComponentProps) {
  const { user } = useAuth();
  const [data, setData] = useState<WeatherData | null>(null);
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
          <img
            src={`https://openweathermap.org/img/wn/${data.icon}@2x.png`}
            alt={data.description}
            width={48}
            height={48}
          />
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

        <Group gap="xs" mt="auto">
          <Text size="xs" c="dimmed" fs="italic">
            {data.city}
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
