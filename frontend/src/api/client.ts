import axios from "axios";
import {
  MOCK_STATS, MOCK_TRENDS, MOCK_POSTS, MOCK_TOPICS,
  MOCK_ALERTS, MOCK_DIGEST,
} from "./mockData";

const api = axios.create({ baseURL: "/api", timeout: 3000 });

export interface Post {
  id: string; reddit_id: string; subreddit: string; title: string;
  author: string; upvote_score: number; url: string;
  created_utc: string; fetched_at: string;
  sentiment?: "positive" | "negative" | "neutral";
  confidence?: number; reasoning?: string; topics?: string[]; processed_at?: string;
}
export interface TopicStat {
  topic: string; total: number; positive: number; negative: number; neutral: number;
}
export interface TrendBucket {
  hour: string; positive: number; negative: number; neutral: number;
}
export interface Alert {
  id: string; subreddit: string; alert_type: string; summary: string;
  severity: "low" | "medium" | "high"; window_minutes: number;
  post_count: number; negative_pct: number; detected_at: string;
}
export interface Digest {
  id: string; week_start: string; week_end: string; subreddits: string[];
  summary: string; top_topics: { topic: string; count: number }[];
  sentiment_breakdown: Record<string, number>; created_at: string;
}
export interface Stats {
  total_posts: number; analyzed_posts: number; alerts_24h: number;
  subreddits_tracked: number; top_sentiment: string;
}

// True when API calls are failing (backend not running)
export let isDemoMode = false;

function withFallback<T>(call: () => Promise<T>, fallback: T): Promise<T> {
  return call().catch(() => {
    isDemoMode = true;
    return fallback;
  });
}

export const fetchStats = () =>
  withFallback(() => api.get<Stats>("/stats").then(r => r.data), MOCK_STATS);

export const fetchTrends = (params?: { subreddit?: string; hours?: number }) =>
  withFallback(() => api.get<TrendBucket[]>("/trends", { params }).then(r => r.data), MOCK_TRENDS);

export const fetchPosts = (params?: {
  subreddit?: string; sentiment?: string; limit?: number; offset?: number;
}) =>
  withFallback(
    () => api.get<Post[]>("/posts", { params }).then(r => r.data),
    params?.sentiment
      ? MOCK_POSTS.filter(p => p.sentiment === params.sentiment)
      : params?.subreddit
      ? MOCK_POSTS.filter(p => p.subreddit === params.subreddit)
      : MOCK_POSTS,
  );

export const fetchTopics = (params?: { subreddit?: string; hours?: number }) =>
  withFallback(() => api.get<TopicStat[]>("/topics", { params }).then(r => r.data), MOCK_TOPICS);

export const fetchAlerts = (params?: {
  subreddit?: string; severity?: string; limit?: number;
}) =>
  withFallback(
    () => api.get<Alert[]>("/alerts", { params }).then(r => r.data),
    params?.severity
      ? MOCK_ALERTS.filter(a => a.severity === params.severity)
      : params?.subreddit
      ? MOCK_ALERTS.filter(a => a.subreddit === params.subreddit)
      : MOCK_ALERTS,
  );

export const fetchLatestDigest = () =>
  withFallback(() => api.get<Digest>("/digest/latest").then(r => r.data), MOCK_DIGEST);

export const generateDigest = () =>
  withFallback(() => api.post<Digest>("/digest/generate").then(r => r.data), MOCK_DIGEST);

export const fetchStats_ = fetchStats;
