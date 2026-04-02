import { useEffect, useState } from "react";
import { fetchPosts, Post } from "../api/client";
import Badge from "../components/ui/Badge";
import PostDrawer from "../components/PostDrawer";

const SENTIMENTS = ["", "positive", "negative", "neutral"];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Posts() {
  const [posts, setPosts]         = useState<Post[]>([]);
  const [subreddit, setSubreddit] = useState("");
  const [sentiment, setSentiment] = useState("");
  const [loading, setLoading]     = useState(false);
  const [selected, setSelected]   = useState<Post | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchPosts({ subreddit: subreddit || undefined, sentiment: sentiment || undefined, limit: 30 })
      .then(setPosts).catch(console.error).finally(() => setLoading(false));
  }, [subreddit, sentiment]);

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Posts</h1>
            <p className="text-sm text-gray-500 mt-1">{posts.length} posts — click any row for AI analysis</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                className="bg-white border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 w-44 transition shadow-sm"
                placeholder="Filter feed (top/ask/show)..."
                value={subreddit}
                onChange={(e) => setSubreddit(e.target.value)}
              />
            </div>
            <select
              className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition shadow-sm cursor-pointer"
              value={sentiment}
              onChange={(e) => setSentiment(e.target.value)}
            >
              {SENTIMENTS.map((s) => <option key={s} value={s}>{s || "All sentiments"}</option>)}
            </select>
          </div>
        </div>

        {/* Posts list */}
        <div className="space-y-3">
          {loading && (
            <div className="bg-white border border-gray-200 rounded-2xl py-16 text-center text-gray-400 text-sm shadow-sm">
              Loading posts...
            </div>
          )}
          {!loading && posts.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl py-16 text-center text-gray-400 text-sm shadow-sm">
              No posts found.
            </div>
          )}
          {!loading && posts.map((post) => (
            <div
              key={post.id}
              className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:border-orange-200 hover:shadow-md transition-all"
            >
              {/* Top meta row */}
              <div className="flex items-center gap-2 px-5 pt-4 pb-2">
                <span className="text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                  hn:{post.subreddit}
                </span>
                <span className="text-gray-300 text-xs">·</span>
                <span className="text-xs text-gray-400">u/{post.author}</span>
                <span className="text-gray-300 text-xs">·</span>
                <span className="text-xs text-gray-400">{timeAgo(post.created_utc)}</span>
                <span className="text-gray-300 text-xs">·</span>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                  </svg>
                  {post.upvote_score.toLocaleString()}
                </span>
                <div className="ml-auto">
                  {post.sentiment && <Badge value={post.sentiment} variant="sentiment" />}
                </div>
              </div>

              {/* Title + Go to Article button */}
              <div className="flex items-start gap-3 px-5 pb-3">
                <div className={`w-1 self-stretch rounded-full shrink-0 mt-0.5 ${
                  post.sentiment === "positive" ? "bg-emerald-400" :
                  post.sentiment === "negative" ? "bg-red-400" : "bg-gray-200"
                }`} />
                <h2 className="flex-1 text-base font-bold text-gray-900 leading-snug">
                  {post.title}
                </h2>
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 hover:bg-orange-500 hover:text-white hover:border-orange-500 px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Go to Article
                </a>
              </div>

              {/* Topics + AI analysis trigger */}
              <div className="flex items-center justify-between px-5 pb-4 gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {post.topics && post.topics.slice(0, 4).map((t) => (
                    <span key={t} className="text-[11px] text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full">
                      {t}
                    </span>
                  ))}
                  {post.topics && post.topics.length > 4 && (
                    <span className="text-[11px] text-gray-400">+{post.topics.length - 4} more</span>
                  )}
                </div>
                <button
                  onClick={() => setSelected(post)}
                  className="shrink-0 flex items-center gap-1.5 text-xs text-gray-500 hover:text-orange-600 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  View AI Analysis
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <PostDrawer post={selected} onClose={() => setSelected(null)} />
    </>
  );
}
