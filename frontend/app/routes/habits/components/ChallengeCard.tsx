import { 
  Badge, 
  Card, 
  Group, 
  Progress, 
  Stack, 
  Text, 
  Tooltip,
  useComputedColorScheme,
} from "@mantine/core";
import type { HabitChallengeProgress } from "~/lib/habits-api";

interface ChallengeCardProps {
  progress: HabitChallengeProgress;
}

function getDaysRemaining(endsAt: string): number {
  const end = new Date(endsAt);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function ChallengeCard({ progress }: ChallengeCardProps) {
  const scheme = useComputedColorScheme("light");
  const isDark = scheme === "dark";
  
  // Card background - between header (gray-1/dark-7) and page background
  const cardBg = isDark ? "var(--mantine-color-dark-8)" : "var(--mantine-color-gray-0)";
  const shadow = isDark 
    ? "0 1px 3px rgba(0,0,0,0.3)" 
    : "0 1px 3px rgba(0,0,0,0.08)";
  
  const challenge = progress.challenge;
  const percent = Math.min(
    (progress.current_value / challenge.target) * 100,
    100
  );
  const daysLeft = getDaysRemaining(challenge.ends_at);
  const isCompleted = !!progress.completed_at;

  return (
    <Card 
      withBorder 
      padding="md" 
      radius="md"
      bg={cardBg}
      style={{ boxShadow: shadow }}
    >
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap">
          <div>
            <Text fw={600} size="sm">
              {challenge.name}
            </Text>
            <Text size="xs" c="dimmed">
              {challenge.description}
            </Text>
          </div>
          {isCompleted && (
            <Badge color="teal" variant="light">
              Completed
            </Badge>
          )}
        </Group>

        <Tooltip
          label={`${progress.current_value} of ${challenge.target}`}
        >
          <Progress
            value={percent}
            color={isCompleted ? "teal" : "blue"}
            radius="xl"
            size="sm"
          />
        </Tooltip>

        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            {progress.current_value} / {challenge.target}
          </Text>
          <Text size="xs" c={daysLeft <= 3 ? "red" : "dimmed"}>
            {daysLeft > 0 ? `${daysLeft} days left` : "Ended"}
          </Text>
        </Group>
      </Stack>
    </Card>
  );
}
