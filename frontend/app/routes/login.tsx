import {
  Anchor,
  Button,
  Container,
  Paper,
  PasswordInput,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { Link, useNavigate } from "react-router";
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
    <Container size={420} my={40}>
      <Title ta="center">Welcome back</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Don&apos;t have an account?{" "}
        <Anchor component={Link} to="/register" size="sm">
          Register
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
          <PasswordInput
            label="Password"
            placeholder="Your password"
            required
            mt="md"
            {...form.getInputProps("password")}
          />
          <Anchor
            component={Link}
            to="/forgot-password"
            size="sm"
            mt="xs"
            display="block"
          >
            Forgot password?
          </Anchor>
          <Button type="submit" fullWidth mt="xl">
            Sign in
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
