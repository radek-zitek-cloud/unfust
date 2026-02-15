import {
  Anchor,
  Button,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useCallback, useEffect, useState } from "react";
import { type RssItem, addRssFeed, getRssItems } from "~/lib/api";

export function RssWidget() {
  const [items, setItems] = useState<RssItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  const [feedUrl, setFeedUrl] = useState("");

  const load = useCallback(async () => {
    try {
      setItems(await getRssItems());
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 900_000); // 15 min
    return () => clearInterval(interval);
  }, [load]);

  const handleAddFeed = async () => {
    if (!feedUrl.trim()) return;
    await addRssFeed(feedUrl.trim());
    setFeedUrl("");
    close();
    await load();
  };

  if (loading) {
    return (
      <Stack align="center" justify="center" h="100%">
        <Loader size="sm" />
      </Stack>
    );
  }

  return (
    <>
      <Stack gap={6} h="100%">
        {items.slice(0, 20).map((item, i) => (
          <div key={`${item.link}-${i}`}>
            <Anchor href={item.link} target="_blank" size="sm" lineClamp={1}>
              {item.title}
            </Anchor>
            <Group gap="xs">
              {item.source && (
                <Text size="xs" c="dimmed">
                  {item.source}
                </Text>
              )}
              {item.published && (
                <Text size="xs" c="dimmed">
                  {new Date(item.published).toLocaleDateString()}
                </Text>
              )}
            </Group>
          </div>
        ))}
        {items.length === 0 && (
          <Text size="sm" c="dimmed" ta="center">
            No feeds configured
          </Text>
        )}
        <Button variant="light" size="xs" onClick={open}>
          Manage feeds
        </Button>
      </Stack>

      <Modal opened={opened} onClose={close} title="Add RSS feed" size="sm">
        <Stack gap="sm">
          <TextInput
            label="Feed URL"
            placeholder="https://example.com/feed.xml"
            value={feedUrl}
            onChange={(e) => setFeedUrl(e.currentTarget.value)}
          />
          <Button onClick={handleAddFeed}>Add feed</Button>
        </Stack>
      </Modal>
    </>
  );
}
