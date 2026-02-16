import {
  ActionIcon,
  Anchor,
  Button,
  Divider,
  Group,
  Loader,
  Modal,
  ScrollArea,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useCallback, useEffect, useState } from "react";
import {
  type RssFeed,
  type RssItem,
  addRssFeed,
  deleteRssFeed,
  getRssFeeds,
  getRssItems,
  refreshRssFeeds,
} from "~/lib/api";
import type { WidgetComponentProps } from "./index";

function IconRefresh({ size = 16 }: { size?: number }) {
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
      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" />
    </svg>
  );
}

function IconSettings({ size = 16 }: { size?: number }) {
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
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconTrash({ size = 16 }: { size?: number }) {
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

export function RssWidget({ config: _config }: WidgetComponentProps) {
  const [items, setItems] = useState<RssItem[]>([]);
  const [feeds, setFeeds] = useState<RssFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [opened, { open, close }] = useDisclosure(false);
  const [feedUrl, setFeedUrl] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const [itemsData, feedsData] = await Promise.all([
        getRssItems(),
        getRssFeeds(),
      ]);
      setItems(itemsData);
      setFeeds(feedsData);
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
    setAdding(true);
    try {
      await addRssFeed(feedUrl.trim());
      setFeedUrl("");
      await load();
    } catch {
      /* ignore */
    }
    setAdding(false);
  };

  const handleDeleteFeed = async (id: string) => {
    try {
      await deleteRssFeed(id);
      await load();
    } catch {
      /* ignore */
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshRssFeeds();
      await load();
    } catch {
      /* ignore */
    }
    setRefreshing(false);
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
        {/* Top toolbar */}
        <Group justify="flex-end" gap="xs">
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={handleRefresh}
            loading={refreshing}
            title="Refresh feeds"
          >
            <IconRefresh />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={open}
            title="Manage feeds"
          >
            <IconSettings />
          </ActionIcon>
        </Group>

        {/* Feed items */}
        <ScrollArea style={{ flex: 1 }} scrollbarSize={6} offsetScrollbars>
          <Stack gap={6}>
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
              <Text size="sm" c="dimmed" ta="center" py="xl">
                No feeds configured
              </Text>
            )}
          </Stack>
        </ScrollArea>
      </Stack>

      {/* Manage Feeds Modal */}
      <Modal opened={opened} onClose={close} title="Manage RSS Feeds" size="md">
        <Stack gap="md">
          {/* Add new feed section */}
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              Add New Feed
            </Text>
            <Group gap="xs">
              <TextInput
                placeholder="https://example.com/feed.xml"
                value={feedUrl}
                onChange={(e) => setFeedUrl(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddFeed();
                  }
                }}
                style={{ flex: 1 }}
              />
              <Button onClick={handleAddFeed} loading={adding}>
                Add
              </Button>
            </Group>
          </Stack>

          <Divider />

          {/* Existing feeds list */}
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              Your Feeds ({feeds.length})
            </Text>
            {feeds.length === 0 ? (
              <Text size="sm" c="dimmed">
                No feeds added yet. Add one above.
              </Text>
            ) : (
              <Stack gap="xs">
                {feeds.map((feed) => (
                  <Group key={feed.id} gap="xs" justify="space-between">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text size="sm" truncate>
                        {feed.title || feed.url}
                      </Text>
                      <Text size="xs" c="dimmed" truncate>
                        {feed.url}
                      </Text>
                    </div>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      onClick={() => handleDeleteFeed(feed.id)}
                      title="Delete feed"
                    >
                      <IconTrash />
                    </ActionIcon>
                  </Group>
                ))}
              </Stack>
            )}
          </Stack>

          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={close}>
              Close
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
