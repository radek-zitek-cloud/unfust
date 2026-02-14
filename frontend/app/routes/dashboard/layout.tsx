import {
  ActionIcon,
  AppShell,
  Avatar,
  Badge,
  Burger,
  Divider,
  Group,
  LoadingOverlay,
  Menu,
  NavLink,
  Text,
  Tooltip,
  useMantineColorScheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useCallback, useEffect, useState } from "react";
import {
  Link,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router";
import { fetchHealth, type HealthResponse } from "~/lib/api";
import { useAuth } from "~/lib/auth";
import { Logo } from "~/components/Logo";

export default function DashboardLayout() {
  const { user, isLoading, logout } = useAuth();
  const [opened, { toggle, close }] = useDisclosure();
  const navigate = useNavigate();
  const location = useLocation();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [backendOk, setBackendOk] = useState(true);
  const { toggleColorScheme } = useMantineColorScheme();

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

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: "◈" },
    { to: "/dashboard/profile", label: "Profile", icon: "◉" },
  ];

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{
        width: 240,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      footer={{ height: 32 }}
      padding="lg"
    >
      <AppShell.Header
        style={{
          borderBottom: "1px solid var(--mantine-color-default-border)",
        }}
      >
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
            />
            <Logo size="sm" />
          </Group>

          <Group gap="xs">
            <Tooltip label="Toggle theme" position="bottom">
              <ActionIcon
                variant="subtle"
                color="gray"
                size="lg"
                onClick={toggleColorScheme}
                aria-label="Toggle color scheme"
              >
                <Text size="sm">◐</Text>
              </ActionIcon>
            </Tooltip>

            <Menu shadow="md" width={200} position="bottom-end">
              <Menu.Target>
                <ActionIcon variant="subtle" color="gray" size="lg" radius="xl">
                  <Avatar
                    size="sm"
                    radius="xl"
                    color="teal"
                    variant="filled"
                    style={{ cursor: "pointer" }}
                  >
                    {initials}
                  </Avatar>
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>
                  {user.first_name} {user.last_name}
                </Menu.Label>
                <Menu.Item
                  component={Link}
                  to="/dashboard/profile"
                  onClick={close}
                >
                  Profile
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item color="red" onClick={handleLogout}>
                  Sign out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        <AppShell.Section grow>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              component={Link}
              to={item.to}
              label={item.label}
              leftSection={
                <Text size="xs" c="dimmed" ff="monospace">
                  {item.icon}
                </Text>
              }
              active={location.pathname === item.to}
              onClick={close}
              style={{ borderRadius: "var(--mantine-radius-md)" }}
              mb={2}
            />
          ))}
        </AppShell.Section>

        <Divider my="xs" />

        <AppShell.Section>
          <Group gap="xs" px="xs" pb="xs">
            <Badge
              size="xs"
              variant="light"
              color={user.is_admin ? "teal" : "gray"}
            >
              {user.is_admin ? "Admin" : "User"}
            </Badge>
            {health && (
              <Badge size="xs" variant="dot" color="dimmed">
                v{health.version}
              </Badge>
            )}
          </Group>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>

      <AppShell.Footer
        style={{
          borderTop: "1px solid var(--mantine-color-default-border)",
        }}
      >
        <Group justify="space-between" px="md" h="100%">
          <Group gap={6}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: backendOk
                  ? "var(--mantine-color-teal-6)"
                  : "var(--mantine-color-red-6)",
                boxShadow: backendOk
                  ? "0 0 6px var(--mantine-color-teal-6)"
                  : "0 0 6px var(--mantine-color-red-6)",
              }}
            />
            <Text size="xs" c="dimmed" ff="monospace">
              {backendOk ? "connected" : "unreachable"}
            </Text>
          </Group>
          <Text size="xs" c="dimmed" ff="monospace">
            {health ? `v${health.version}` : "—"}
          </Text>
        </Group>
      </AppShell.Footer>
    </AppShell>
  );
}
