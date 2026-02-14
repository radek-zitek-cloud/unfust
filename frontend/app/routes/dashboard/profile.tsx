import {
  Button,
  Divider,
  Paper,
  PasswordInput,
  Stack,
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
      });
      await refreshUser();
      notifications.show({
        title: "Profile updated",
        message: "Your profile has been saved.",
        color: "green",
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
    values: typeof passwordForm.values
  ) => {
    try {
      await changePassword(values.currentPassword, values.newPassword);
      passwordForm.reset();
      notifications.show({
        title: "Password changed",
        message: "Your password has been updated.",
        color: "green",
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
    <Stack gap="xl">
      <div>
        <Title order={2}>Profile</Title>
        <Paper withBorder p="md" mt="md" maw={500}>
          <form onSubmit={profileForm.onSubmit(handleProfileSubmit)}>
            <TextInput label="Email" value={user?.email} disabled />
            <TextInput
              label="First name"
              mt="md"
              {...profileForm.getInputProps("firstName")}
            />
            <TextInput
              label="Last name"
              mt="md"
              {...profileForm.getInputProps("lastName")}
            />
            <Textarea
              label="Notes"
              mt="md"
              autosize
              minRows={3}
              {...profileForm.getInputProps("notes")}
            />
            <Button type="submit" mt="md">
              Save changes
            </Button>
          </form>
        </Paper>
      </div>

      <Divider />

      <div>
        <Title order={3}>Change password</Title>
        <Paper withBorder p="md" mt="md" maw={500}>
          <form onSubmit={passwordForm.onSubmit(handlePasswordSubmit)}>
            <PasswordInput
              label="Current password"
              {...passwordForm.getInputProps("currentPassword")}
            />
            <PasswordInput
              label="New password"
              mt="md"
              {...passwordForm.getInputProps("newPassword")}
            />
            <PasswordInput
              label="Confirm new password"
              mt="md"
              {...passwordForm.getInputProps("confirmPassword")}
            />
            <Button type="submit" mt="md">
              Change password
            </Button>
          </form>
        </Paper>
      </div>
    </Stack>
  );
}
