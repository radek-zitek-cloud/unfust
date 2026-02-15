import type { ComponentType } from "react";
import { BookmarksWidget } from "./BookmarksWidget";
import { ClockWidget } from "./ClockWidget";
import { HabitsWidget } from "./HabitsWidget";
import { RssWidget } from "./RssWidget";
import { SystemWidget } from "./SystemWidget";
import { WeatherWidget } from "./WeatherWidget";

export interface WidgetConfig {
  [key: string]: any;
}

export interface WidgetComponentProps {
  config: WidgetConfig;
  onConfigChange: (newConfig: WidgetConfig) => void;
}

interface WidgetDefinition {
  component: ComponentType<WidgetComponentProps>;
  label: string;
  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
}

export const widgetRegistry: Record<string, WidgetDefinition> = {
  clock: {
    component: ClockWidget,
    label: "Clock",
    defaultSize: { w: 2, h: 1 },
  },
  weather: {
    component: WeatherWidget,
    label: "Weather",
    defaultSize: { w: 2, h: 1 },
  },
  bookmarks: {
    component: BookmarksWidget,
    label: "Bookmarks",
    defaultSize: { w: 2, h: 2 },
  },
  rss: {
    component: RssWidget,
    label: "RSS Feed",
    defaultSize: { w: 2, h: 2 },
  },
  system: {
    component: SystemWidget,
    label: "System Monitor",
    defaultSize: { w: 2, h: 2 },
  },
  habits: {
    component: HabitsWidget,
    label: "Habits",
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 2, h: 2 },
  },
};
