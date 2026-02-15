import { Button, Group, Loader, Menu, Stack, Text, Title } from "@mantine/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import {
  type WidgetInstance,
  getWidgetLayout,
  saveWidgetLayout,
} from "~/lib/api";
import { useAuth } from "~/lib/auth";
import { WidgetCard } from "~/components/WidgetCard";
import { widgetRegistry } from "~/components/widgets";

const ResponsiveGrid = WidthProvider(Responsive);

export default function DashboardHome() {
  const { user } = useAuth();
  const [widgets, setWidgets] = useState<WidgetInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const load = useCallback(async () => {
    try {
      const layout = await getWidgetLayout();
      setWidgets(layout.widgets);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const debouncedSave = useCallback((updated: WidgetInstance[]) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      saveWidgetLayout(updated).catch(() => {});
    }, 1000);
  }, []);

  const handleLayoutChange = (
    layout: readonly { i: string; x: number; y: number; w: number; h: number }[]
  ) => {
    const updated = widgets.map((w) => {
      const item = layout.find((l) => l.i === w.id);
      if (item) {
        return { ...w, x: item.x, y: item.y, w: item.w, h: item.h };
      }
      return w;
    });
    setWidgets(updated);
    debouncedSave(updated);
  };

  const addWidget = (type: string) => {
    const def = widgetRegistry[type];
    if (!def) return;
    const id = `${type}-${Date.now()}`;
    const newWidget: WidgetInstance = {
      id,
      type,
      x: 0,
      y: Infinity, // places at bottom
      w: def.defaultSize.w,
      h: def.defaultSize.h,
      config: {},
    };
    const updated = [...widgets, newWidget];
    setWidgets(updated);
    debouncedSave(updated);
  };

  const removeWidget = (id: string) => {
    const updated = widgets.filter((w) => w.id !== id);
    setWidgets(updated);
    debouncedSave(updated);
  };

  if (loading) {
    return (
      <Stack align="center" justify="center" h={300}>
        <Loader />
      </Stack>
    );
  }

  const gridLayout = widgets.map((w) => ({
    i: w.id,
    x: w.x,
    y: w.y,
    w: w.w,
    h: w.h,
    minW: widgetRegistry[w.type]?.minSize?.w ?? 1,
    minH: widgetRegistry[w.type]?.minSize?.h ?? 1,
  }));

  return (
    <>
      <Group justify="space-between" mb="md">
        <div>
          <Title order={2} fw={700}>
            Welcome back, {user?.first_name}
          </Title>
          <Text c="dimmed" size="sm" mt={4}>
            {widgets.length > 0
              ? "Drag and resize widgets to customize your dashboard."
              : "Add widgets to get started."}
          </Text>
        </div>
        <Menu shadow="md" position="bottom-end">
          <Menu.Target>
            <Button variant="light" size="sm">
              Add widget
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            {Object.entries(widgetRegistry).map(([type, def]) => (
              <Menu.Item key={type} onClick={() => addWidget(type)}>
                {def.label}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      </Group>

      {widgets.length === 0 ? (
        <Stack align="center" justify="center" h={300}>
          <Text c="dimmed">Your dashboard is empty.</Text>
          <Menu shadow="md">
            <Menu.Target>
              <Button>Add your first widget</Button>
            </Menu.Target>
            <Menu.Dropdown>
              {Object.entries(widgetRegistry).map(([type, def]) => (
                <Menu.Item key={type} onClick={() => addWidget(type)}>
                  {def.label}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        </Stack>
      ) : (
        <ResponsiveGrid
          layouts={{ lg: gridLayout }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 4, md: 3, sm: 2, xs: 1, xxs: 1 }}
          rowHeight={180}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".widget-drag-handle"
          style={{ margin: -10 }}
        >
          {widgets.map((w) => {
            const def = widgetRegistry[w.type];
            if (!def) return null;
            const WidgetComponent = def.component;

            const handleConfigChange = (newConfig: Record<string, any>) => {
              const updated = widgets.map((widget) =>
                widget.id === w.id ? { ...widget, config: newConfig } : widget
              );
              setWidgets(updated);
              debouncedSave(updated);
            };

            return (
              <div key={w.id}>
                <WidgetCard
                  title={def.label}
                  onRemove={() => removeWidget(w.id)}
                >
                  <WidgetComponent
                    config={w.config}
                    onConfigChange={handleConfigChange}
                  />
                </WidgetCard>
              </div>
            );
          })}          
        </ResponsiveGrid>
      )}
    </>
  );
}
