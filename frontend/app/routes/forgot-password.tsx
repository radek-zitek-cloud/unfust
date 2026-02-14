import {
  Anchor,
  Button,
  Container,
  Paper,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { Link } from "react-router";
import { forgotPassword } from "~/lib/api";
import { Logo } from "~/components/Logo";

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  const form = useForm({
    initialValues: { email: "" },
    validate: {
      email: (v) => (/^\S+@\S+$/.test(v) ? null : "Invalid email"),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    try {
      await forgotPassword(values.email);
      setSubmitted(true);
    } catch {
      notifications.show({
        title: "Error",
        message: "Something went wrong. Please try again.",
        color: "red",
      });
    }
  };

  return (
    <Container size={420} pt={80} pb={40}>
      <Stack align="center" gap={4} mb="xl">
        <Logo size="lg" />
        <Text c="dimmed" size="sm">
          Reset your password
        </Text>
      </Stack>

      <Paper withBorder shadow="sm" p="xl" radius="md">
        {submitted ? (
          <Stack align="center" gap="md">
            <Text ta="center">
              If an account with that email exists, we&apos;ve sent a reset
              link.
            </Text>
            <Anchor component={Link} to="/login" size="sm" fw={600}>
              Back to login
            </Anchor>
          </Stack>
        ) : (
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
              <TextInput
                label="Email"
                placeholder="you@example.com"
                required
                {...form.getInputProps("email")}
              />
              <Button type="submit" fullWidth>
                Send reset link
              </Button>
              <Anchor
                component={Link}
                to="/login"
                size="sm"
                ta="center"
                c="dimmed"
              >
                Back to login
              </Anchor>
            </Stack>
          </form>
        )}
      </Paper>
    </Container>
  );
}
