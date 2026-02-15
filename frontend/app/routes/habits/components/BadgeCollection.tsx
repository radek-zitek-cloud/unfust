import { Card, Grid, Text, Tooltip } from "@mantine/core";
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
  const earnedTypes = new Set(badges.map((b) => b.badge_type));

  return (
    <Grid>
      {ALL_BADGES.map((type) => {
        const info = BADGE_INFO[type];
        const isEarned = earnedTypes.has(type);
        const earnedBadge = badges.find((b) => b.badge_type === type);

        return (
          <Grid.Col key={type} span={{ base: 6, sm: 4, md: 3 }}>
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
                padding="sm"
                radius="md"
                style={{
                  opacity: isEarned ? 1 : 0.4,
                  filter: isEarned ? "none" : "grayscale(100%)",
                }}
              >
                <Text size="xl" ta="center">
                  {info.emoji}
                </Text>
                <Text size="xs" fw={600} ta="center" mt={4}>
                  {info.name}
                </Text>
              </Card>
            </Tooltip>
          </Grid.Col>
        );
      })}
    </Grid>
  );
}
