import { Badge, Card, Group, Progress, Stack, Text, Tooltip } from "@mantine/core";
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
  const challenge = progress.challenge;
  const percent = Math.min(
    (progress.current_value / challenge.target) * 100,
    100
  );
  const daysLeft = getDaysRemaining(challenge.ends_at);
  const isCompleted = !!progress.completed_at;

  return (
    <Card withBorder padding="md" radius="md">
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
