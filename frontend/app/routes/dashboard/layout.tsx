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
  useComputedColorScheme,
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

function IconSun({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function IconMoon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function IconDashboard({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

function IconUser({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function DashboardLayout() {
  const { user, isLoading, logout } = useAuth();
  const [opened, { toggle, close }] = useDisclosure();
  const navigate = useNavigate();
  const location = useLocation();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [backendOk, setBackendOk] = useState(true);
  const { toggleColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("light");

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
    { to: "/dashboard", label: "Dashboard", icon: <IconDashboard size={18} /> },
    { to: "/dashboard/profile", label: "Profile", icon: <IconUser size={18} /> },
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
                {computedColorScheme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
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
              leftSection={item.icon}
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
