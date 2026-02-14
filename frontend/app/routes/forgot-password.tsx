import {
  Anchor,
  Button,
  Container,
  Paper,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { Link } from "react-router";
import { forgotPassword } from "~/lib/api";

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
    <Container size={420} my={40}>
      <Title ta="center">Forgot your password?</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Enter your email to get a reset link
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        {submitted ? (
          <>
            <Text ta="center">
              If an account with that email exists, we&apos;ve sent a reset
              link.
            </Text>
            <Anchor
              component={Link}
              to="/login"
              size="sm"
              mt="md"
              display="block"
              ta="center"
            >
              Back to login
            </Anchor>
          </>
        ) : (
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <TextInput
              label="Email"
              placeholder="you@example.com"
              required
              {...form.getInputProps("email")}
            />
            <Button type="submit" fullWidth mt="xl">
              Send reset link
            </Button>
            <Anchor
              component={Link}
              to="/login"
              size="sm"
              mt="md"
              display="block"
              ta="center"
            >
              Back to login
            </Anchor>
          </form>
        )}
      </Paper>
    </Container>
  );
}
