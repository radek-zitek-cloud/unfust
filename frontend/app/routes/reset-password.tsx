import {
  Anchor,
  Button,
  Container,
  Paper,
  PasswordInput,
  Text,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { resetPassword } from "~/lib/api";

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
      <Container size={420} my={40}>
        <Title ta="center">Invalid link</Title>
        <Text c="dimmed" ta="center" mt="md">
          This password reset link is invalid or has expired.
        </Text>
        <Anchor
          component={Link}
          to="/forgot-password"
          size="sm"
          mt="md"
          display="block"
          ta="center"
        >
          Request a new link
        </Anchor>
      </Container>
    );
  }

  return (
    <Container size={420} my={40}>
      <Title ta="center">Reset your password</Title>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        {success ? (
          <>
            <Text ta="center">Password reset successfully!</Text>
            <Anchor
              component={Link}
              to="/login"
              size="sm"
              mt="md"
              display="block"
              ta="center"
            >
              Go to login
            </Anchor>
          </>
        ) : (
          <form onSubmit={form.onSubmit(handleSubmit)}>
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
              mt="md"
              {...form.getInputProps("confirmPassword")}
            />
            <Button type="submit" fullWidth mt="xl">
              Reset password
            </Button>
          </form>
        )}
      </Paper>
    </Container>
  );
}
