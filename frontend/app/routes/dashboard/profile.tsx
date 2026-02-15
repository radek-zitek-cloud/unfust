import {
  Button,
  Divider,
  Grid,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useAuth } from "~/lib/auth";
import { changePassword, updateProfile } from "~/lib/api";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();

  const profileForm = useForm({
    initialValues: {
      firstName: user?.first_name || "",
      lastName: user?.last_name || "",
      notes: user?.notes || "",
      location: user?.location || "",
    },
  });

  const passwordForm = useForm({
    initialValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    validate: {
      currentPassword: (v) => (v.length > 0 ? null : "Required"),
      newPassword: (v) => (v.length >= 8 ? null : "Minimum 8 characters"),
      confirmPassword: (v, values) =>
        v === values.newPassword ? null : "Passwords don't match",
    },
  });

  const handleProfileSubmit = async (values: typeof profileForm.values) => {
    try {
      await updateProfile({
        first_name: values.firstName,
        last_name: values.lastName,
        notes: values.notes || null,
        location: values.location || null,
      });
      await refreshUser();
      notifications.show({
        title: "Profile updated",
        message: "Your profile has been saved.",
        color: "teal",
      });
    } catch (err: any) {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    }
  };

  const handlePasswordSubmit = async (
    values: typeof passwordForm.values,
  ) => {
    try {
      await changePassword(values.currentPassword, values.newPassword);
      passwordForm.reset();
      notifications.show({
        title: "Password changed",
        message: "Your password has been updated.",
        color: "teal",
      });
    } catch (err: any) {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    }
  };

  return (
    <>
      <Title order={2} fw={700}>
        Profile
      </Title>
      <Text c="dimmed" size="sm" mt={4} mb="xl">
        Manage your account settings
      </Text>

      <Grid gutter="xl">
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Paper withBorder p="lg" radius="md">
            <Text fw={600} mb="md">
              Personal information
            </Text>
            <form onSubmit={profileForm.onSubmit(handleProfileSubmit)}>
              <Stack gap="md">
                <TextInput
                  label="Email"
                  value={user?.email}
                  disabled
                  styles={{
                    input: { fontFamily: "monospace", fontSize: 13 },
                  }}
                />
                <Grid>
                  <Grid.Col span={6}>
                    <TextInput
                      label="First name"
                      {...profileForm.getInputProps("firstName")}
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <TextInput
                      label="Last name"
                      {...profileForm.getInputProps("lastName")}
                    />
                  </Grid.Col>
                </Grid>
                <TextInput
                  label="Location"
                  description="City name for weather widget (e.g., London, New York)"
                  placeholder="Enter your city"
                  {...profileForm.getInputProps("location")}
                />
                <Textarea
                  label="Notes"
                  autosize
                  minRows={3}
                  maxRows={8}
                  {...profileForm.getInputProps("notes")}
                />
                <Button type="submit" w="fit-content">
                  Save changes
                </Button>
              </Stack>
            </form>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 5 }}>
          <Paper withBorder p="lg" radius="md">
            <Text fw={600} mb="md">
              Change password
            </Text>
            <form onSubmit={passwordForm.onSubmit(handlePasswordSubmit)}>
              <Stack gap="md">
                <PasswordInput
                  label="Current password"
                  {...passwordForm.getInputProps("currentPassword")}
                />
                <Divider
                  label="New password"
                  labelPosition="left"
                  variant="dashed"
                />
                <PasswordInput
                  label="New password"
                  {...passwordForm.getInputProps("newPassword")}
                />
                <PasswordInput
                  label="Confirm new password"
                  {...passwordForm.getInputProps("confirmPassword")}
                />
                <Button type="submit" variant="light" w="fit-content">
                  Change password
                </Button>
              </Stack>
            </form>
          </Paper>
        </Grid.Col>
      </Grid>
    </>
  );
}
