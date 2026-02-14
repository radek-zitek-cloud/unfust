import {
  Anchor,
  Button,
  Container,
  Paper,
  PasswordInput,
  TextInput,
  Title,
  Text,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { Link, useNavigate } from "react-router";
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
        values.password
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
    <Container size={420} my={40}>
      <Title ta="center">Create an account</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Already have an account?{" "}
        <Anchor component={Link} to="/login" size="sm">
          Sign in
        </Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            label="Email"
            placeholder="you@example.com"
            required
            {...form.getInputProps("email")}
          />
          <TextInput
            label="First name"
            placeholder="John"
            required
            mt="md"
            {...form.getInputProps("firstName")}
          />
          <TextInput
            label="Last name"
            placeholder="Doe"
            required
            mt="md"
            {...form.getInputProps("lastName")}
          />
          <PasswordInput
            label="Password"
            placeholder="Minimum 8 characters"
            required
            mt="md"
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
            Register
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
