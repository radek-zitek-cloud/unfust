import { Card, Grid, Stack, Text, Tooltip, useComputedColorScheme } from "@mantine/core";
import type { BadgeType, HabitBadge } from "~/lib/habits-api";

interface BadgeCollectionProps {
  badges: HabitBadge[];
}

const BADGE_INFO: Record<
  BadgeType,
  { emoji: string; name: string; description: string }
> = {
  first_log: {
    emoji: "🌱",
    name: "First Step",
    description: "Log your first habit",
  },
  streak_7: {
    emoji: "🔥",
    name: "On Fire",
    description: "7-day streak on any habit",
  },
  streak_30: {
    emoji: "⚡",
    name: "Unstoppable",
    description: "30-day streak on any habit",
  },
  streak_100: {
    emoji: "💎",
    name: "Diamond Mind",
    description: "100-day streak on any habit",
  },
  perfect_day: {
    emoji: "✅",
    name: "Perfect Day",
    description: "Complete all habits in one day",
  },
  sharp_focus: {
    emoji: "🎯",
    name: "Sharp Focus",
    description: "Hit target 5x in one week",
  },
};

const ALL_BADGES: BadgeType[] = [
  "first_log",
  "streak_7",
  "streak_30",
  "streak_100",
  "perfect_day",
  "sharp_focus",
];

export function BadgeCollection({ badges }: BadgeCollectionProps) {
  const scheme = useComputedColorScheme("light");
  const isDark = scheme === "dark";
  
  // Card background - between header (gray-1/dark-7) and page background
  const cardBg = isDark ? "var(--mantine-color-dark-8)" : "var(--mantine-color-gray-0)";
  const shadow = isDark 
    ? "0 1px 3px rgba(0,0,0,0.3)" 
    : "0 1px 3px rgba(0,0,0,0.08)";
  
  const earnedTypes = new Set(badges.map((b) => b.badge_type));

  return (
    <Grid>
      {ALL_BADGES.map((type) => {
        const info = BADGE_INFO[type];
        const isEarned = earnedTypes.has(type);
        const earnedBadge = badges.find((b) => b.badge_type === type);

        return (
          <Grid.Col key={type} span={{ base: 6, sm: 4, md: 3, lg: 2 }}>
            <Tooltip
              label={
                isEarned
                  ? `${info.description} - Earned ${new Date(
                      earnedBadge!.earned_at
                    ).toLocaleDateString()}`
                  : info.description
              }
            >
              <Card
                withBorder
                padding="md"
                radius="md"
                h="100%"
                bg={cardBg}
                style={{
                  opacity: isEarned ? 1 : 0.4,
                  filter: isEarned ? "none" : "grayscale(100%)",
                  boxShadow: shadow,
                }}
              >
                <Stack gap="xs" align="center">
                  <Text style={{ fontSize: 32, lineHeight: 1 }}>
                    {info.emoji}
                  </Text>
                  <Text size="sm" fw={600} ta="center" lineClamp={2}>
                    {info.name}
                  </Text>
                </Stack>
              </Card>
            </Tooltip>
          </Grid.Col>
        );
      })}
    </Grid>
  );
}
