import {
  Button,
  ColorInput,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  TextInput,
  Textarea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useEffect } from "react";
import type {
  CreateHabitRequest,
  FrequencyType,
  Habit,
  HabitType,
  UpdateHabitRequest,
} from "~/lib/habits-api";

interface HabitFormProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: CreateHabitRequest | UpdateHabitRequest) => void;
  habit?: Habit | null;
}

const habitTypeOptions = [
  { value: "positive", label: "Positive (Do it)" },
  { value: "negative", label: "Negative (Avoid it)" },
];

const frequencyOptions = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom (rolling days)" },
];

export function HabitForm({ opened, onClose, onSubmit, habit }: HabitFormProps) {
  const isEditing = !!habit;

  const form = useForm({
    initialValues: {
      name: "",
      emoji: "✨",
      color: "#228be6",
      category: "",
      description: "",
      habit_type: "positive" as HabitType,
      frequency_type: "daily" as FrequencyType,
      target_count: 1,
      period_days: "" as string | number,
    },
    validate: {
      name: (v) => (v.length > 0 ? null : "Name is required"),
      target_count: (v) => (v > 0 ? null : "Target must be at least 1"),
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (habit) {
      form.setValues({
        name: habit.name,
        emoji: habit.emoji,
        color: habit.color,
        category: habit.category ?? "",
        description: habit.description ?? "",
        habit_type: habit.habit_type,
        frequency_type: habit.frequency_type,
        target_count: habit.target_count,
        period_days: habit.period_days ?? "",
      });
    } else {
      form.reset();
    }
  }, [habit, opened]);

  const handleSubmit = (values: typeof form.values) => {
    const data: CreateHabitRequest | UpdateHabitRequest = {
      ...values,
      category: values.category || null,
      description: values.description || null,
      period_days:
        values.frequency_type === "custom" && values.period_days
          ? Number(values.period_days)
          : null,
    };
    onSubmit(data);
    onClose();
  };

  const showPeriodDays = form.values.frequency_type === "custom";

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEditing ? "Edit Habit" : "Create New Habit"}
      size="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Group grow>
            <TextInput
              label="Name"
              placeholder="e.g., Morning Run"
              required
              {...form.getInputProps("name")}
            />
            <TextInput
              label="Emoji"
              placeholder="✨"
              style={{ width: 80 }}
              {...form.getInputProps("emoji")}
            />
          </Group>

          <ColorInput
            label="Color"
            format="hex"
            swatches={[
              "#228be6",
              "#40c057",
              "#fa5252",
              "#fd7e14",
              "#be4bdb",
              "#15aabf",
              "#fab005",
              "#868e96",
            ]}
            {...form.getInputProps("color")}
          />

          <TextInput
            label="Category"
            placeholder="e.g., Health, Productivity"
            {...form.getInputProps("category")}
          />

          <Textarea
            label="Description"
            placeholder="Why is this habit important?"
            autosize
            minRows={2}
            {...form.getInputProps("description")}
          />

          <Group grow>
            <Select
              label="Habit Type"
              data={habitTypeOptions}
              {...form.getInputProps("habit_type")}
            />
            <Select
              label="Frequency"
              data={frequencyOptions}
              {...form.getInputProps("frequency_type")}
            />
          </Group>

          <Group grow>
            <NumberInput
              label="Target Count"
              description="Completions needed per period"
              min={1}
              {...form.getInputProps("target_count")}
            />
            {showPeriodDays && (
              <NumberInput
                label="Period (days)"
                description="Rolling window in days"
                min={1}
                {...form.getInputProps("period_days")}
              />
            )}
          </Group>

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose} w="fit-content">
              Cancel
            </Button>
            <Button type="submit" w="fit-content">
              {isEditing ? "Save changes" : "Create habit"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
