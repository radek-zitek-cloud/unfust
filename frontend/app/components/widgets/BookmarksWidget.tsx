import {
  ActionIcon,
  Anchor,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { useCallback, useEffect, useState } from "react";
import {
  type Bookmark,
  createBookmark,
  deleteBookmark,
  getBookmarks,
} from "~/lib/api";
import type { WidgetComponentProps } from "./index";

function IconPlus({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconTrash({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export function BookmarksWidget({ config: _config }: WidgetComponentProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [opened, { open, close }] = useDisclosure(false);
  const form = useForm({
    initialValues: { title: "", url: "", category: "" },
  });

  const load = useCallback(async () => {
    try {
      setBookmarks(await getBookmarks());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async (values: typeof form.values) => {
    await createBookmark({
      title: values.title,
      url: values.url,
      category: values.category || undefined,
    });
    form.reset();
    close();
    await load();
  };

  const handleDelete = async (id: string) => {
    await deleteBookmark(id);
    await load();
  };

  const grouped = bookmarks.reduce<Record<string, Bookmark[]>>((acc, b) => {
    const cat = b.category || "Uncategorized";
    (acc[cat] ||= []).push(b);
    return acc;
  }, {});

  return (
    <>
      <Stack gap="xs" h="100%">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <Text size="xs" c="dimmed" fw={600} mb={4}>
              {category}
            </Text>
            {items.map((b) => (
              <Group key={b.id} gap="xs" mb={2} wrap="nowrap">
                <Anchor
                  href={b.url}
                  target="_blank"
                  size="sm"
                  style={{ flex: 1 }}
                  lineClamp={1}
                >
                  {b.title}
                </Anchor>
                <ActionIcon
                  variant="subtle"
                  size="xs"
                  color="gray"
                  onClick={() => handleDelete(b.id)}
                >
                  <IconTrash size={12} />
                </ActionIcon>
              </Group>
            ))}
          </div>
        ))}
        {bookmarks.length === 0 && (
          <Text size="sm" c="dimmed" ta="center">
            No bookmarks yet
          </Text>
        )}
        <Button
          variant="light"
          size="xs"
          leftSection={<IconPlus />}
          onClick={open}
        >
          Add bookmark
        </Button>
      </Stack>

      <Modal opened={opened} onClose={close} title="Add bookmark" size="sm">
        <form onSubmit={form.onSubmit(handleAdd)}>
          <Stack gap="sm">
            <TextInput
              label="Title"
              required
              {...form.getInputProps("title")}
            />
            <TextInput label="URL" required {...form.getInputProps("url")} />
            <TextInput label="Category" {...form.getInputProps("category")} />
            <Button type="submit">Add</Button>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
