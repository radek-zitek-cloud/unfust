import {
  Anchor,
  Button,
  Container,
  Group,
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

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const form = useForm({
    initialValues: {
      email: "",
      firstName: "",
      lastName: "",
      password: "",
      confirmPassword: "",
    },
    validate: {
      email: (v) => (/^\S+@\S+$/.test(v) ? null : "Invalid email"),
      firstName: (v) => (v.trim().length > 0 ? null : "Required"),
      lastName: (v) => (v.trim().length > 0 ? null : "Required"),
      password: (v) => (v.length >= 8 ? null : "Minimum 8 characters"),
      confirmPassword: (v, values) =>
        v === values.password ? null : "Passwords don't match",
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    try {
      await register(
        values.email,
        values.firstName,
        values.lastName,
        values.password,
      );
      navigate("/dashboard");
    } catch (err: any) {
      notifications.show({
        title: "Registration failed",
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
          Create your account
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
            <Group grow>
              <TextInput
                label="First name"
                placeholder="John"
                required
                {...form.getInputProps("firstName")}
              />
              <TextInput
                label="Last name"
                placeholder="Doe"
                required
                {...form.getInputProps("lastName")}
              />
            </Group>
            <PasswordInput
              label="Password"
              placeholder="Minimum 8 characters"
              required
              {...form.getInputProps("password")}
            />
            <PasswordInput
              label="Confirm password"
              placeholder="Repeat password"
              required
              {...form.getInputProps("confirmPassword")}
            />
            <Button type="submit" fullWidth>
              Register
            </Button>
          </Stack>
        </form>
      </Paper>

      <Text ta="center" size="sm" mt="lg" c="dimmed">
        Already have an account?{" "}
        <Anchor component={Link} to="/login" size="sm" fw={600}>
          Sign in
        </Anchor>
      </Text>
    </Container>
  );
}
