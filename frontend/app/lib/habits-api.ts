import { apiClient } from "./api";

// --- Enums ---
export type HabitType = "positive" | "negative";
export type FrequencyType = "daily" | "weekly" | "monthly" | "custom";
export type ChallengeType = "streak" | "count" | "perfect_day";
export type ChallengePeriod = "weekly" | "monthly";
export type BadgeType =
  | "first_log"
  | "streak_7"
  | "streak_30"
  | "streak_100"
  | "perfect_day"
  | "sharp_focus";

// --- Habit ---
export interface HabitStats {
  current_streak: number;
  longest_streak: number;
  total_completions: number;
  completion_rate: number;
  today_count: number;
  is_complete_today: boolean;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  color: string;
  category: string | null;
  description: string | null;
  habit_type: HabitType;
  frequency_type: FrequencyType;
  target_count: number;
  period_days: number | null;
  is_active: boolean;
  order: number;
  created_at: string;
  stats: HabitStats | null;
}

export interface CreateHabitRequest {
  name: string;
  emoji?: string;
  color?: string;
  category?: string | null;
  description?: string | null;
  habit_type?: HabitType;
  frequency_type?: FrequencyType;
  target_count?: number;
  period_days?: number | null;
}

export interface UpdateHabitRequest {
  name?: string;
  emoji?: string;
  color?: string;
  category?: string | null;
  description?: string | null;
  habit_type?: HabitType;
  frequency_type?: FrequencyType;
  target_count?: number;
  period_days?: number | null;
  is_active?: boolean;
  order?: number;
}

// --- Log ---
export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  logged_date: string;
  notes: string | null;
  created_at: string;
}

export interface CreateLogRequest {
  logged_date?: string | null; // YYYY-MM-DD, defaults to today
  notes?: string | null;
}

// --- Badge ---
export interface HabitBadge {
  id: string;
  badge_type: BadgeType;
  earned_at: string;
}

// --- Challenge ---
export interface HabitChallenge {
  id: string;
  name: string;
  description: string;
  challenge_type: ChallengeType;
  target: number;
  period: ChallengePeriod;
  starts_at: string;
  ends_at: string;
  is_system_generated: boolean;
  created_at: string;
}

export interface HabitChallengeProgress {
  id: string;
  user_id: string;
  challenge_id: string;
  current_value: number;
  completed_at: string | null;
  challenge: HabitChallenge;
}

// --- Summary ---
export interface HabitSummaryItem {
  habit_id: string;
  name: string;
  emoji: string;
  color: string;
  target_count: number;
  today_count: number;
  is_complete: boolean;
  current_streak: number;
}

export interface HabitSummaryResponse {
  total_habits: number;
  completed_today: number;
  best_streak: number;
  user_level: number;
  user_xp: number;
  habits: HabitSummaryItem[];
}

// --- API Functions ---

export async function getHabits(): Promise<Habit[]> {
  const resp = await apiClient("/api/habits");
  if (!resp.ok) throw new Error("Failed to fetch habits");
  return resp.json();
}

export async function getHabit(id: string): Promise<Habit> {
  const resp = await apiClient(`/api/habits/${id}`);
  if (!resp.ok) throw new Error("Failed to fetch habit");
  return resp.json();
}

export async function createHabit(data: CreateHabitRequest): Promise<Habit> {
  const resp = await apiClient("/api/habits", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!resp.ok) throw new Error("Failed to create habit");
  return resp.json();
}

export async function updateHabit(
  id: string,
  data: UpdateHabitRequest
): Promise<Habit> {
  const resp = await apiClient(`/api/habits/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!resp.ok) throw new Error("Failed to update habit");
  return resp.json();
}

export async function deleteHabit(id: string): Promise<void> {
  const resp = await apiClient(`/api/habits/${id}`, { method: "DELETE" });
  if (!resp.ok) throw new Error("Failed to delete habit");
}

// --- Logs ---

export async function logCompletion(
  habitId: string,
  data: CreateLogRequest = {}
): Promise<HabitLog> {
  const resp = await apiClient(`/api/habits/${habitId}/logs`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!resp.ok) throw new Error("Failed to log completion");
  return resp.json();
}

export async function undoLog(habitId: string, logId: string): Promise<void> {
  const resp = await apiClient(`/api/habits/${habitId}/logs/${logId}`, {
    method: "DELETE",
  });
  if (!resp.ok) throw new Error("Failed to undo log");
}

export async function getLogHistory(
  habitId: string,
  start: string,
  end: string
): Promise<HabitLog[]> {
  const resp = await apiClient(
    `/api/habits/${habitId}/logs?start=${start}&end=${end}`
  );
  if (!resp.ok) throw new Error("Failed to fetch logs");
  return resp.json();
}

// --- Summary, Badges, Challenges ---

export async function getHabitsSummary(): Promise<HabitSummaryResponse> {
  const resp = await apiClient("/api/habits/summary");
  if (!resp.ok) throw new Error("Failed to fetch summary");
  return resp.json();
}

export async function getBadges(): Promise<HabitBadge[]> {
  const resp = await apiClient("/api/habits/badges");
  if (!resp.ok) throw new Error("Failed to fetch badges");
  return resp.json();
}

export async function getChallenges(): Promise<HabitChallengeProgress[]> {
  const resp = await apiClient("/api/habits/challenges");
  if (!resp.ok) throw new Error("Failed to fetch challenges");
  return resp.json();
}
