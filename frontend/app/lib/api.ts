let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const resp = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    setAccessToken(data.access_token);
    return data.access_token;
  } catch {
    return null;
  }
}

export async function apiClient(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers);
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  let resp = await fetch(path, { ...options, headers, credentials: "include" });

  // If 401, try refreshing the token once
  if (resp.status === 401 && accessToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set("Authorization", `Bearer ${newToken}`);
      resp = await fetch(path, { ...options, headers, credentials: "include" });
    }
  }

  return resp;
}

// Typed API functions

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_admin: boolean;
  notes: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
}

export interface HealthResponse {
  status: string;
  version: string;
}

export async function login(email: string, password: string) {
  const resp = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: "Login failed" }));
    throw new Error(err.detail || "Login failed");
  }
  const data = await resp.json();
  setAccessToken(data.access_token);
  return data;
}

export async function register(
  email: string,
  firstName: string,
  lastName: string,
  password: string
) {
  const resp = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      first_name: firstName,
      last_name: lastName,
      password,
    }),
    credentials: "include",
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: "Registration failed" }));
    throw new Error(err.detail || "Registration failed");
  }
  const data = await resp.json();
  setAccessToken(data.access_token);
  return data;
}

export async function logout() {
  await apiClient("/api/auth/logout", { method: "POST" });
  setAccessToken(null);
}

export async function getProfile(): Promise<UserProfile> {
  const resp = await apiClient("/api/users/me");
  if (!resp.ok) throw new Error("Failed to fetch profile");
  return resp.json();
}

export async function updateProfile(data: {
  first_name?: string;
  last_name?: string;
  notes?: string | null;
  location?: string | null;
}): Promise<UserProfile> {
  const resp = await apiClient("/api/users/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  if (!resp.ok) throw new Error("Failed to update profile");
  return resp.json();
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
) {
  const resp = await apiClient("/api/users/me/change-password", {
    method: "POST",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: "Failed" }));
    throw new Error(err.detail || "Failed to change password");
  }
  return resp.json();
}

export async function forgotPassword(email: string) {
  const resp = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return resp.json();
}

export async function resetPassword(token: string, newPassword: string) {
  const resp = await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: "Failed" }));
    throw new Error(err.detail || "Failed to reset password");
  }
  return resp.json();
}

export async function fetchHealth(): Promise<HealthResponse> {
  const resp = await fetch("/api/health");
  if (!resp.ok) throw new Error("Backend unreachable");
  return resp.json();
}

// --- Widget Layout ---

export interface WidgetInstance {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  config: Record<string, any>;
}

export interface WidgetLayout {
  widgets: WidgetInstance[];
}

export async function getWidgetLayout(): Promise<WidgetLayout> {
  const resp = await apiClient("/api/widgets/layout");
  return resp.json();
}

export async function saveWidgetLayout(
  widgets: WidgetInstance[]
): Promise<void> {
  await apiClient("/api/widgets/layout", {
    method: "PUT",
    body: JSON.stringify({ widgets }),
  });
}

// --- Weather ---

export interface WeatherData {
  city: string;
  temp: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  description: string;
  icon: string;
}

export async function fetchWeather(
  city: string,
  units = "metric"
): Promise<WeatherData> {
  const resp = await apiClient(
    `/api/widgets/weather?city=${encodeURIComponent(city)}&units=${units}`
  );
  return resp.json();
}

// --- Bookmarks ---

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  category: string | null;
  position: number;
  created_at: string;
}

export async function getBookmarks(): Promise<Bookmark[]> {
  const resp = await apiClient("/api/bookmarks");
  return resp.json();
}

export async function createBookmark(data: {
  title: string;
  url: string;
  category?: string;
}): Promise<Bookmark> {
  const resp = await apiClient("/api/bookmarks", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return resp.json();
}

export async function updateBookmark(
  id: string,
  data: Partial<Bookmark>
): Promise<Bookmark> {
  const resp = await apiClient(`/api/bookmarks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return resp.json();
}

export async function deleteBookmark(id: string): Promise<void> {
  await apiClient(`/api/bookmarks/${id}`, { method: "DELETE" });
}

// --- RSS ---

export interface RssFeed {
  id: string;
  url: string;
  title: string | null;
  last_fetched_at: string | null;
  created_at: string;
}

export interface RssItem {
  title: string;
  link: string;
  published: string | null;
  source: string | null;
}

export async function getRssFeeds(): Promise<RssFeed[]> {
  const resp = await apiClient("/api/rss/feeds");
  return resp.json();
}

export async function addRssFeed(url: string): Promise<RssFeed> {
  const resp = await apiClient("/api/rss/feeds", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
  return resp.json();
}

export async function deleteRssFeed(id: string): Promise<void> {
  await apiClient(`/api/rss/feeds/${id}`, { method: "DELETE" });
}

export async function getRssItems(): Promise<RssItem[]> {
  const resp = await apiClient("/api/rss/items");
  return resp.json();
}

// --- System ---

export interface SystemStats {
  cpu_percent: number;
  memory_percent: number;
  memory_used_gb: number;
  memory_total_gb: number;
  disk_percent: number;
  disk_used_gb: number;
  disk_total_gb: number;
  containers: { name: string; status: string; image: string }[] | null;
}

export async function fetchSystemStats(): Promise<SystemStats> {
  const resp = await apiClient("/api/widgets/system");
  return resp.json();
}
