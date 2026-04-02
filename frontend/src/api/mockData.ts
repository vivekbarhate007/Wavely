import { Post, TopicStat, TrendBucket, Alert, Digest, Stats } from "./client";

export const MOCK_STATS: Stats = {
  total_posts: 342,
  analyzed_posts: 318,
  alerts_24h: 3,
  subreddits_tracked: 3,
  top_sentiment: "positive",
};

export const MOCK_TRENDS: TrendBucket[] = (() => {
  const now = new Date();
  return Array.from({ length: 24 }, (_, i) => {
    const h = new Date(now);
    h.setHours(h.getHours() - (23 - i), 0, 0, 0);
    const base = 4 + Math.round(Math.sin(i / 3) * 3);
    return {
      hour: h.toISOString(),
      positive: Math.max(1, base + Math.round(Math.random() * 3)),
      negative: Math.max(0, Math.round(base * 0.4 + Math.random() * 2)),
      neutral:  Math.max(1, Math.round(base * 0.6 + Math.random() * 2)),
    };
  });
})();

export const MOCK_POSTS: Post[] = [
  {
    id: "1", reddit_id: "abc1", subreddit: "MachineLearning",
    title: "Llama 3.3 70B beats GPT-4 on several benchmarks — detailed analysis",
    author: "ml_researcher", upvote_score: 1847, url: "#",
    created_utc: new Date(Date.now() - 3600000).toISOString(),
    fetched_at: new Date().toISOString(),
    sentiment: "positive", confidence: 0.92,
    reasoning: "Enthusiastic reception of new model performance results.",
    topics: ["LLM benchmarks", "open source AI", "Llama 3.3", "model comparison"],
  },
  {
    id: "2", reddit_id: "abc2", subreddit: "LocalLLaMA",
    title: "Running 70B models locally on M4 Max — my experience after 2 weeks",
    author: "local_ai_fan", upvote_score: 934, url: "#",
    created_utc: new Date(Date.now() - 7200000).toISOString(),
    fetched_at: new Date().toISOString(),
    sentiment: "positive", confidence: 0.88,
    reasoning: "Positive hands-on experience with local inference setup.",
    topics: ["local inference", "Apple Silicon", "M4 Max", "quantization"],
  },
  {
    id: "3", reddit_id: "abc3", subreddit: "python",
    title: "Why is pip dependency resolution still so painful in 2026?",
    author: "frustrated_dev", upvote_score: 723, url: "#",
    created_utc: new Date(Date.now() - 10800000).toISOString(),
    fetched_at: new Date().toISOString(),
    sentiment: "negative", confidence: 0.85,
    reasoning: "Frustration expressed about package management tooling.",
    topics: ["pip", "dependency hell", "packaging", "uv"],
  },
  {
    id: "4", reddit_id: "abc4", subreddit: "MachineLearning",
    title: "Survey: State of ML infrastructure at mid-size companies in 2026",
    author: "ml_survey_bot", upvote_score: 512, url: "#",
    created_utc: new Date(Date.now() - 14400000).toISOString(),
    fetched_at: new Date().toISOString(),
    sentiment: "neutral", confidence: 0.79,
    reasoning: "Informational survey results without strong positive/negative lean.",
    topics: ["ML infrastructure", "MLOps", "industry survey", "2026 trends"],
  },
  {
    id: "5", reddit_id: "abc5", subreddit: "python",
    title: "uv is the best thing to happen to Python packaging — a love letter",
    author: "uv_convert", upvote_score: 2103, url: "#",
    created_utc: new Date(Date.now() - 18000000).toISOString(),
    fetched_at: new Date().toISOString(),
    sentiment: "positive", confidence: 0.96,
    reasoning: "Strong positive sentiment about the uv package manager.",
    topics: ["uv", "Python packaging", "developer tools", "pip alternative"],
  },
  {
    id: "6", reddit_id: "abc6", subreddit: "LocalLLaMA",
    title: "GGUF quantization artifacts ruining my outputs — anyone else?",
    author: "quant_issues", upvote_score: 287, url: "#",
    created_utc: new Date(Date.now() - 21600000).toISOString(),
    fetched_at: new Date().toISOString(),
    sentiment: "negative", confidence: 0.81,
    reasoning: "User reporting quality issues with quantized model outputs.",
    topics: ["GGUF", "quantization", "model quality", "llama.cpp"],
  },
];

export const MOCK_TOPICS: TopicStat[] = [
  { topic: "LLM benchmarks",    total: 48, positive: 34, negative: 6,  neutral: 8  },
  { topic: "Python packaging",  total: 41, positive: 18, negative: 15, neutral: 8  },
  { topic: "local inference",   total: 37, positive: 28, negative: 4,  neutral: 5  },
  { topic: "open source AI",    total: 33, positive: 26, negative: 3,  neutral: 4  },
  { topic: "quantization",      total: 29, positive: 12, negative: 11, neutral: 6  },
  { topic: "MLOps",             total: 25, positive: 14, negative: 5,  neutral: 6  },
  { topic: "developer tools",   total: 22, positive: 17, negative: 2,  neutral: 3  },
  { topic: "Apple Silicon",     total: 19, positive: 15, negative: 1,  neutral: 3  },
];

export const MOCK_ALERTS: Alert[] = [
  {
    id: "a1", subreddit: "python", alert_type: "negative_spike",
    summary: "A surge of negative posts in r/python over the last 30 minutes, primarily driven by frustrations around pip dependency resolution and conflicting package versions. Community sentiment has shifted sharply downward with 68% of recent posts expressing dissatisfaction.",
    severity: "high", window_minutes: 30, post_count: 22, negative_pct: 0.68,
    detected_at: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: "a2", subreddit: "LocalLLaMA", alert_type: "negative_spike",
    summary: "Moderate negative sentiment detected in r/LocalLLaMA. Users are reporting quality degradation in GGUF quantized models, with several posts describing artifact issues at 4-bit quantization levels.",
    severity: "medium", window_minutes: 30, post_count: 14, negative_pct: 0.61,
    detected_at: new Date(Date.now() - 5400000).toISOString(),
  },
  {
    id: "a3", subreddit: "MachineLearning", alert_type: "negative_spike",
    summary: "Low-level negative sentiment spike in r/MachineLearning around reproducibility concerns in recent published papers. The discussion is constructive but carries an overall negative tone.",
    severity: "low", window_minutes: 60, post_count: 11, negative_pct: 0.62,
    detected_at: new Date(Date.now() - 14400000).toISOString(),
  },
];

export const MOCK_DIGEST: Digest = {
  id: "d1",
  week_start: new Date(Date.now() - 7 * 86400000).toISOString(),
  week_end: new Date().toISOString(),
  subreddits: ["python", "MachineLearning", "LocalLLaMA"],
  summary: `## Weekly Sentiment Digest — March 24–31, 2026

This week saw **overall positive sentiment** across tracked communities, with 58% of posts classified as positive. The dominant theme was excitement around open-source LLM progress, particularly Llama 3.3 70B's strong benchmark results which drove significant engagement in both r/MachineLearning and r/LocalLLaMA.

**r/python** experienced two notable negative spikes around packaging tooling frustrations, though these were balanced by strong positive reception of the \`uv\` package manager, which emerged as a top discussion topic with near-universal praise.

**r/LocalLLaMA** remained the most active community with the highest post volume, dominated by local inference optimization and Apple Silicon performance discussions — both trending positively.`,
  top_topics: [
    { topic: "LLM benchmarks",   count: 48 },
    { topic: "Python packaging",  count: 41 },
    { topic: "local inference",   count: 37 },
    { topic: "open source AI",    count: 33 },
    { topic: "quantization",      count: 29 },
    { topic: "MLOps",             count: 25 },
    { topic: "developer tools",   count: 22 },
    { topic: "Apple Silicon",     count: 19 },
  ],
  sentiment_breakdown: { positive: 184, negative: 78, neutral: 56 },
  created_at: new Date().toISOString(),
};
