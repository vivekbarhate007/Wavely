import { useEffect, useState } from "react";
import { fetchAlerts, fetchPosts, Alert, Post } from "../api/client";
import Badge from "../components/ui/Badge";

const SEVERITIES = ["", "high", "medium", "low"];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const SEVERITY_COLORS: Record<string, string> = {
  high:   "border-red-300 bg-red-50",
  medium: "border-amber-300 bg-amber-50",
  low:    "border-blue-200 bg-blue-50",
};

function AlertCard({ a }: { a: Alert }) {
  const [open, setOpen]       = useState(false);
  const [posts, setPosts]     = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  function toggle() {
    if (!open && posts.length === 0) {
      setLoading(true);
      fetchPosts({ subreddit: a.subreddit, sentiment: "negative", limit: 10 })
        .then(setPosts)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
    setOpen((v) => !v);
  }

  return (
    <div className={`border rounded-2xl shadow-sm overflow-hidden transition-all ${SEVERITY_COLORS[a.severity] ?? "border-gray-200 bg-white"}`}>
      {/* Clickable header */}
      <button
        onClick={toggle}
        className="w-full text-left p-5 hover:brightness-95 transition-all"
      >
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-2.5">
            <Badge value={a.severity} variant="severity" />
            <span className="text-sm font-bold text-gray-800">hn:{a.subreddit}</span>
            <span className="text-xs text-gray-400">{timeAgo(a.detected_at)}</span>
          </div>
          <svg
            className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        <p className="text-sm text-gray-700 leading-relaxed mb-4">{a.summary}</p>

        {/* Stats row */}
        <div className="flex items-center gap-6 pt-4 border-t border-black/5">
          <div>
            <p className="text-lg font-bold text-red-500">{(a.negative_pct * 100).toFixed(0)}%</p>
            <p className="text-[11px] text-gray-400 uppercase tracking-wider">Negative</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-700">{a.post_count}</p>
            <p className="text-[11px] text-gray-400 uppercase tracking-wider">Posts</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-700">{a.window_minutes}m</p>
            <p className="text-[11px] text-gray-400 uppercase tracking-wider">Window</p>
          </div>
          <div className="flex-1">
            <div className="flex justify-between text-[11px] text-gray-400 mb-1.5">
              <span>Negative rate</span>
              <span>{(a.negative_pct * 100).toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-white/60 rounded-full overflow-hidden">
              <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${a.negative_pct * 100}%` }} />
            </div>
          </div>
        </div>
      </button>

      {/* Expandable related posts */}
      {open && (
        <div className="border-t border-black/10 bg-white">
          <div className="px-5 py-3 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Related negative posts from hn:{a.subreddit}
            </span>
          </div>

          {loading && (
            <div className="px-5 py-6 text-center text-sm text-gray-400">Loading posts...</div>
          )}

          {!loading && posts.length === 0 && (
            <div className="px-5 py-6 text-center text-sm text-gray-400">No negative posts found for this feed.</div>
          )}

          {!loading && posts.map((post, i) => (
            <div
              key={post.id}
              className={`px-5 py-3.5 flex items-start gap-3 ${i !== posts.length - 1 ? "border-b border-gray-100" : ""}`}
            >
              <div className="w-1 h-full min-h-[2rem] bg-red-300 rounded-full shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-400">u/{post.author}</span>
                  <span className="text-gray-300 text-xs">·</span>
                  <span className="text-xs text-gray-400">{timeAgo(post.created_utc)}</span>
                  <span className="text-xs text-gray-400 flex items-center gap-0.5 ml-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                    </svg>
                    {post.upvote_score}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-800 line-clamp-2">{post.title}</p>
                {post.reasoning && (
                  <p className="text-xs text-gray-500 mt-1 italic line-clamp-1">"{post.reasoning}"</p>
                )}
              </div>
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 hover:bg-orange-500 hover:text-white hover:border-orange-500 px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap mt-0.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View Article
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Alerts() {
  const [alerts, setAlerts]     = useState<Alert[]>([]);
  const [severity, setSeverity] = useState("");
  const [subreddit, setSub]     = useState("");

  useEffect(() => {
    fetchAlerts({ severity: severity || undefined, subreddit: subreddit || undefined, limit: 50 })
      .then(setAlerts).catch(console.error);
  }, [severity, subreddit]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trend Alerts</h1>
          <p className="text-sm text-gray-500 mt-1">AI-detected negative sentiment spikes — click to expand</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              className="bg-white border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 w-44 transition shadow-sm"
              placeholder="Filter feed..."
              value={subreddit}
              onChange={(e) => setSub(e.target.value)}
            />
          </div>
          <select
            className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition shadow-sm cursor-pointer"
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
          >
            {SEVERITIES.map((s) => <option key={s} value={s}>{s || "All severities"}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {alerts.map((a) => <AlertCard key={a.id} a={a} />)}
        {alerts.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl py-16 text-center shadow-sm">
            <p className="text-gray-400 text-sm">No alerts found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
