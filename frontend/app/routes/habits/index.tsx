import {
  Button,
  Divider,
  Grid,
  Group,
  Loader,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type Habit,
  type HabitBadge,
  type HabitChallengeProgress,
  createHabit,
  getBadges,
  getChallenges,
  getHabits,
  logCompletion,
  updateHabit,
} from "~/lib/habits-api";
import { BadgeCollection } from "./components/BadgeCollection";
import { ChallengeCard } from "./components/ChallengeCard";
import { HabitCard } from "./components/HabitCard";
import { HabitDetail } from "./components/HabitDetail";
import { HabitForm } from "./components/HabitForm";

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>("all");
  const [formOpened, setFormOpened] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [detailHabit, setDetailHabit] = useState<Habit | null>(null);
  const [challenges, setChallenges] = useState<HabitChallengeProgress[]>([]);
  const [badges, setBadges] = useState<HabitBadge[]>([]);

  const loadHabits = useCallback(async () => {
    try {
      const [habitsData, challengesData, badgesData] = await Promise.all([
        getHabits(),
        getChallenges(),
        getBadges(),
      ]);
      setHabits(habitsData);
      setChallenges(challengesData);
      setBadges(badgesData);
    } catch (err: any) {
      notifications.show({
        title: "Error",
        message: err.message || "Failed to load habits",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    habits.forEach((h) => {
      if (h.category) cats.add(h.category);
    });
    return Array.from(cats).sort();
  }, [habits]);

  const filteredHabits = useMemo(() => {
    if (activeTab === "all") return habits;
    return habits.filter((h) => h.category === activeTab);
  }, [habits, activeTab]);

  const handleCreate = async (data: Parameters<typeof createHabit>[0]) => {
    try {
      await createHabit(data);
      notifications.show({
        title: "Success",
        message: "Habit created",
        color: "teal",
      });
      loadHabits();
    } catch (err: any) {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    }
  };

  const handleUpdate = async (
    id: string,
    data: Parameters<typeof updateHabit>[1]
  ) => {
    try {
      await updateHabit(id, data);
      notifications.show({
        title: "Success",
        message: "Habit updated",
        color: "teal",
      });
      loadHabits();
    } catch (err: any) {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    }
  };

  const handleCheckin = async (habit: Habit) => {
    try {
      await logCompletion(habit.id);
      notifications.show({
        title: "Checked in!",
        message: `+${10 + (habit.stats?.current_streak || 0)} XP`,
        color: "teal",
      });
      loadHabits();
    } catch (err: any) {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    }
  };

  const openCreateForm = () => {
    setEditingHabit(null);
    setFormOpened(true);
  };

  const openEditForm = (habit: Habit) => {
    setEditingHabit(habit);
    setFormOpened(true);
  };

  const openDetail = (habit: Habit) => {
    setDetailHabit(habit);
  };

  const closeDetail = () => {
    setDetailHabit(null);
  };

  if (loading) {
    return (
      <Stack align="center" justify="center" h={400}>
        <Loader />
      </Stack>
    );
  }

  return (
    <>
      {/* Header */}
      <Group justify="space-between" mb="md">
        <div>
          <Title order={2} fw={700}>
            Habits
          </Title>
          <Text c="dimmed" size="sm" mt={4}>
            Build consistency, earn streaks, level up
          </Text>
        </div>
        <Button variant="light" size="sm" onClick={openCreateForm}>
          Add habit
        </Button>
      </Group>

      {/* Active Challenges */}
      {challenges.length > 0 && (
        <>
          <div>
            <Text fw={600} mb="md">
              Active Challenges
            </Text>
            <Grid gutter="md">
              {challenges.slice(0, 3).map((progress) => (
                <Grid.Col key={progress.id} span={{ base: 12, sm: 6, md: 4 }}>
                  <ChallengeCard progress={progress} />
                </Grid.Col>
              ))}
            </Grid>
          </div>
          <Divider my="xl" />
        </>
      )}

      {/* Habits Section - Full Width */}
      <Stack gap="lg">
        {/* Category Tabs */}
        {categories.length > 0 && (
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Tab value="all">All</Tabs.Tab>
              {categories.map((cat) => (
                <Tabs.Tab key={cat} value={cat}>
                  {cat}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs>
        )}

        {/* Habits Grid */}
        {filteredHabits.length === 0 ? (
          <Stack align="center" justify="center" h={300}>
            <Text c="dimmed">
              {activeTab === "all"
                ? "No habits yet. Create your first one!"
                : "No habits in this category."}
            </Text>
            <Button onClick={openCreateForm} w="fit-content">
              Create habit
            </Button>
          </Stack>
        ) : (
          <Grid>
            {filteredHabits.map((habit) => (
              <Grid.Col
                key={habit.id}
                span={{ base: 12, sm: 6, md: 4, lg: 3 }}
              >
                <HabitCard
                  habit={habit}
                  onCheckin={() => handleCheckin(habit)}
                  onEdit={() => openEditForm(habit)}
                  onClick={() => openDetail(habit)}
                />
              </Grid.Col>
            ))}
          </Grid>
        )}
      </Stack>

      <Divider my="xl" />

      {/* Badges Section - Bottom of page */}
      <div>
        <Text fw={600} mb="md" size="lg">
          Badges
        </Text>
        <BadgeCollection badges={badges} />
      </div>

      {/* Form Modal */}
      <HabitForm
        opened={formOpened}
        onClose={() => setFormOpened(false)}
        onSubmit={(data) => {
          if (editingHabit) {
            handleUpdate(
              editingHabit.id,
              data as Parameters<typeof updateHabit>[1]
            );
          } else {
            handleCreate(data as Parameters<typeof createHabit>[0]);
          }
        }}
        habit={editingHabit}
      />

      {/* Detail Drawer */}
      <HabitDetail
        habit={detailHabit}
        opened={!!detailHabit}
        onClose={closeDetail}
        onCheckin={() => {
          if (detailHabit) {
            handleCheckin(detailHabit);
          }
        }}
      />
    </>
  );
}
