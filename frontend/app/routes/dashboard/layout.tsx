import {
  AppShell,
  Avatar,
  Badge,
  Box,
  Burger,
  Group,
  Indicator,
  LoadingOverlay,
  Menu,
  NavLink,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { fetchHealth, type HealthResponse } from "~/lib/api";
import { useAuth } from "~/lib/auth";

export default function DashboardLayout() {
  const { user, isLoading, logout } = useAuth();
  const [opened, { toggle }] = useDisclosure();
  const navigate = useNavigate();
  const location = useLocation();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [backendOk, setBackendOk] = useState(true);

  const pollHealth = useCallback(async () => {
    try {
      const data = await fetchHealth();
      setHealth(data);
      setBackendOk(true);
    } catch {
      setBackendOk(false);
    }
  }, []);

  useEffect(() => {
    pollHealth();
    const interval = setInterval(pollHealth, 30_000);
    return () => clearInterval(interval);
  }, [pollHealth]);

  if (isLoading) {
    return <LoadingOverlay visible />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const initials =
    (user.first_name?.[0] || "") + (user.last_name?.[0] || "");

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 250,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      footer={{ height: 30 }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
            />
            <Title order={3}>unfust</Title>
          </Group>

          <Menu shadow="md" width={200}>
            <Menu.Target>
              <UnstyledButton>
                <Group gap="xs">
                  <Avatar color="blue" radius="xl" size="sm">
                    {initials}
                  </Avatar>
                  <Text size="sm" visibleFrom="sm">
                    {user.first_name} {user.last_name}
                  </Text>
                </Group>
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item component={Link} to="/dashboard/profile">
                Profile
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item color="red" onClick={handleLogout}>
                Logout
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <NavLink
          component={Link}
          to="/dashboard"
          label="Dashboard"
          active={location.pathname === "/dashboard"}
        />
        <NavLink
          component={Link}
          to="/dashboard/profile"
          label="Profile"
          active={location.pathname === "/dashboard/profile"}
        />
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>

      <AppShell.Footer p={4}>
        <Group justify="space-between" px="md" h="100%">
          <Group gap="xs">
            <Indicator
              color={backendOk ? "green" : "red"}
              size={8}
              processing={!backendOk}
            >
              <Box />
            </Indicator>
            <Text size="xs" c="dimmed">
              {backendOk ? "Connected" : "Backend unreachable"}
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            {health ? `v${health.version}` : "—"}
          </Text>
          <Badge size="xs" variant="light">
            {user.is_admin ? "Admin" : "User"}
          </Badge>
        </Group>
      </AppShell.Footer>
    </AppShell>
  );
}
