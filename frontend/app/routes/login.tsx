import {
  Anchor,
  Button,
  Container,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { Link, useNavigate } from "react-router";
import { Logo } from "~/components/Logo";
import { useAuth } from "~/lib/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const form = useForm({
    initialValues: { email: "", password: "" },
    validate: {
      email: (v) => (/^\S+@\S+$/.test(v) ? null : "Invalid email"),
      password: (v) => (v.length > 0 ? null : "Password is required"),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    try {
      await login(values.email, values.password);
      navigate("/dashboard");
    } catch (err: any) {
      notifications.show({
        title: "Login failed",
        message: err.message,
        color: "red",
      });
    }
  };

  return (
    <Container size={420} pt={80} pb={40}>
      <Stack align="center" gap={4} mb="xl">
        <Logo size="lg" />
        <Text c="dimmed" size="sm">
          Personal dashboard
        </Text>
      </Stack>

      <Paper withBorder shadow="sm" p="xl" radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Email"
              placeholder="you@example.com"
              required
              {...form.getInputProps("email")}
            />
            <PasswordInput
              label="Password"
              placeholder="Your password"
              required
              {...form.getInputProps("password")}
            />
            <Anchor
              component={Link}
              to="/forgot-password"
              size="xs"
              c="dimmed"
            >
              Forgot password?
            </Anchor>
            <Button type="submit" fullWidth>
              Sign in
            </Button>
          </Stack>
        </form>
      </Paper>

      <Text ta="center" size="sm" mt="lg" c="dimmed">
        Don&apos;t have an account?{" "}
        <Anchor component={Link} to="/register" size="sm" fw={600}>
          Register
        </Anchor>
      </Text>
    </Container>
  );
}
