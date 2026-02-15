import type { ComponentType } from "react";
import { ClockWidget } from "./ClockWidget";
import { WeatherWidget } from "./WeatherWidget";
import { BookmarksWidget } from "./BookmarksWidget";
import { RssWidget } from "./RssWidget";
import { SystemWidget } from "./SystemWidget";

interface WidgetDefinition {
  component: ComponentType<{ config: any }>;
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
    component: BookmarksWidget as ComponentType<{ config: any }>,
    label: "Bookmarks",
    defaultSize: { w: 2, h: 2 },
  },
  rss: {
    component: RssWidget as ComponentType<{ config: any }>,
    label: "RSS Feed",
    defaultSize: { w: 2, h: 2 },
  },
  system: {
    component: SystemWidget as ComponentType<{ config: any }>,
    label: "System Monitor",
    defaultSize: { w: 2, h: 2 },
  },
};
