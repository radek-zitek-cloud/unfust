import {
  Anchor,
  Button,
  Container,
  Paper,
  PasswordInput,
  Stack,
  Text,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { resetPassword } from "~/lib/api";
import { Logo } from "~/components/Logo";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [success, setSuccess] = useState(false);

  const form = useForm({
    initialValues: { password: "", confirmPassword: "" },
    validate: {
      password: (v) => (v.length >= 8 ? null : "Minimum 8 characters"),
      confirmPassword: (v, values) =>
        v === values.password ? null : "Passwords don't match",
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    try {
      await resetPassword(token, values.password);
      setSuccess(true);
    } catch (err: any) {
      notifications.show({
        title: "Reset failed",
        message: err.message,
        color: "red",
      });
    }
  };

  if (!token) {
    return (
      <Container size={420} pt={80} pb={40}>
        <Stack align="center" gap={4} mb="xl">
          <Logo size="lg" />
        </Stack>
        <Paper withBorder shadow="sm" p="xl" radius="md">
          <Stack align="center" gap="md">
            <Text fw={600}>Invalid link</Text>
            <Text c="dimmed" ta="center" size="sm">
              This password reset link is invalid or has expired.
            </Text>
            <Anchor component={Link} to="/forgot-password" size="sm" fw={600}>
              Request a new link
            </Anchor>
          </Stack>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size={420} pt={80} pb={40}>
      <Stack align="center" gap={4} mb="xl">
        <Logo size="lg" />
        <Text c="dimmed" size="sm">
          Choose a new password
        </Text>
      </Stack>

      <Paper withBorder shadow="sm" p="xl" radius="md">
        {success ? (
          <Stack align="center" gap="md">
            <Text ta="center">Password reset successfully!</Text>
            <Anchor component={Link} to="/login" size="sm" fw={600}>
              Go to login
            </Anchor>
          </Stack>
        ) : (
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
              <PasswordInput
                label="New password"
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
                Reset password
              </Button>
            </Stack>
          </form>
        )}
      </Paper>
    </Container>
  );
}
