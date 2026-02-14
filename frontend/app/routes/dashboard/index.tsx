import { Text, Title } from "@mantine/core";
import { useAuth } from "~/lib/auth";

export default function DashboardHome() {
  const { user } = useAuth();

  return (
    <>
      <Title order={2}>
        Welcome, {user?.first_name}
      </Title>
      <Text c="dimmed" mt="sm">
        This is your personal dashboard.
      </Text>
    </>
  );
}
