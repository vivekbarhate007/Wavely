import { useEffect } from "react";
import { Post } from "../api/client";
import Badge from "./ui/Badge";

interface Props {
  post: Post | null;
  onClose: () => void;
}

const SENTIMENT_BAR: Record<string, string> = {
  positive: "bg-emerald-500",
  negative: "bg-red-500",
  neutral:  "bg-gray-300",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function PostDrawer({ post, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40 transition-opacity duration-300 ${
          post ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[540px] max-w-full bg-white border-l border-gray-200 z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-out ${
          post ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {post && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full">
                  hn:{post.subreddit}
                </span>
                {post.sentiment && <Badge value={post.sentiment} variant="sentiment" />}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

              {/* Title + meta */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 leading-snug">{post.title}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    u/{post.author}
                  </span>
                  <span className="text-gray-300">·</span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                    </svg>
                    {post.upvote_score.toLocaleString()} upvotes
                  </span>
                  <span className="text-gray-300">·</span>
                  <span className="text-xs text-gray-500">{timeAgo(post.created_utc)}</span>
                </div>
              </div>

              {/* Sentiment analysis */}
              {post.sentiment && (
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-orange-700 uppercase tracking-wider">AI Sentiment Analysis</p>
                  <div className="flex items-center justify-between">
                    <Badge value={post.sentiment} variant="sentiment" />
                    {post.confidence != null && (
                      <span className="text-sm font-bold text-gray-700">
                        {(post.confidence * 100).toFixed(0)}% confidence
                      </span>
                    )}
                  </div>
                  {post.confidence != null && (
                    <div className="w-full h-2 bg-orange-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${SENTIMENT_BAR[post.sentiment] ?? "bg-gray-300"}`}
                        style={{ width: `${(post.confidence * 100).toFixed(0)}%` }}
                      />
                    </div>
                  )}
                  {post.reasoning && (
                    <p className="text-sm text-gray-600 leading-relaxed border-t border-orange-100 pt-3">
                      "{post.reasoning}"
                    </p>
                  )}
                </div>
              )}

              {/* Topics */}
              {post.topics && post.topics.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Extracted Topics</p>
                  <div className="flex flex-wrap gap-2">
                    {post.topics.map((t) => (
                      <span key={t} className="text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Post body */}
              {post.body && post.body.trim() && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Post Content</p>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{post.body}</p>
                  </div>
                </div>
              )}

              {/* Meta dates */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <p className="text-gray-400 mb-0.5 font-medium">Posted</p>
                  <p className="text-gray-700 font-semibold">{new Date(post.created_utc).toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <p className="text-gray-400 mb-0.5 font-medium">Analyzed</p>
                  <p className="text-gray-700 font-semibold">
                    {post.processed_at ? new Date(post.processed_at).toLocaleString() : "Pending"}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3">
              <a
                href={post.url === "#" ? `https://news.ycombinator.com` : post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors shadow-sm shadow-orange-200"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                  <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                </svg>
                Open on Hacker News
              </a>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 hover:bg-white text-sm font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
