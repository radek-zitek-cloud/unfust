import { Grid, Group, Paper, Text, Title } from "@mantine/core";
import { useAuth } from "~/lib/auth";

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Paper withBorder p="md" radius="md">
      <Text size="xs" c="dimmed" tt="uppercase" fw={600} ff="monospace">
        {label}
      </Text>
      <Group justify="space-between" align="flex-end" mt={4}>
        <Text fw={700} size="xl">
          {value}
        </Text>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: `var(--mantine-color-${color}-6)`,
          }}
        />
      </Group>
    </Paper>
  );
}

export default function DashboardHome() {
  const { user } = useAuth();

  return (
    <>
      <Title order={2} fw={700}>
        Welcome back, {user?.first_name}
      </Title>
      <Text c="dimmed" size="sm" mt={4} mb="xl">
        Here&apos;s your dashboard overview.
      </Text>

      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
          <StatCard
            label="Status"
            value={user?.is_active ? "Active" : "Inactive"}
            color={user?.is_active ? "teal" : "gray"}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
          <StatCard
            label="Role"
            value={user?.is_admin ? "Administrator" : "Member"}
            color={user?.is_admin ? "teal" : "blue"}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
          <StatCard
            label="Account"
            value={
              user?.created_at
                ? new Date(user.created_at).toLocaleDateString()
                : "—"
            }
            color="grape"
          />
        </Grid.Col>
      </Grid>
    </>
  );
}
