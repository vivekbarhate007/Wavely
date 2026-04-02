import { useEffect, useState } from "react";
import { fetchLatestDigest, generateDigest, Digest as DigestType } from "../api/client";

export default function Digest() {
  const [digest, setDigest]   = useState<DigestType | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGen]  = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchLatestDigest()
      .then((d) => { if (!("detail" in (d as any))) setDigest(d as DigestType); })
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleGenerate = async () => {
    setGen(true);
    try { setDigest(await generateDigest()); }
    catch (e) { console.error(e); }
    finally { setGen(false); }
  };

  const breakdown = digest?.sentiment_breakdown ?? {};
  const totalSent = Object.values(breakdown).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weekly Digest</h1>
          <p className="text-sm text-gray-500 mt-1">AI-generated summary for the past 7 days</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-orange-200"
        >
          {generating ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate Digest
            </>
          )}
        </button>
      </div>

      {loading && (
        <div className="bg-white border border-gray-200 rounded-2xl py-16 text-center text-gray-400 text-sm shadow-sm">Loading...</div>
      )}

      {!loading && !digest && (
        <div className="bg-white border border-gray-200 rounded-2xl py-20 text-center shadow-sm">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-600 font-medium mb-1">No digest yet</p>
          <p className="text-sm text-gray-400">Click "Generate Digest" to create your first weekly summary.</p>
        </div>
      )}

      {digest && (
        <div className="space-y-4">
          {/* Date / subreddits */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {new Date(digest.week_start).toLocaleDateString()} — {new Date(digest.week_end).toLocaleDateString()}
            {digest.subreddits?.length > 0 && digest.subreddits.map(s => (
              <span key={s} className="text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full font-semibold">r/{s}</span>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2 bg-orange-50">
              <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h2 className="text-sm font-bold text-orange-700">AI Summary</h2>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{digest.summary}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            {/* Sentiment breakdown */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4">Sentiment Breakdown</h3>
              <div className="space-y-3">
                {[
                  { key: "positive", label: "Positive", bar: "bg-emerald-400", text: "text-emerald-600" },
                  { key: "negative", label: "Negative", bar: "bg-red-400",     text: "text-red-600"     },
                  { key: "neutral",  label: "Neutral",  bar: "bg-gray-300",    text: "text-gray-500"    },
                ].map(({ key, label, bar, text }) => {
                  const count = breakdown[key] ?? 0;
                  const pct = totalSent ? (count / totalSent) * 100 : 0;
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className={`font-semibold ${text}`}>{label}</span>
                        <span className="text-gray-400">{count} · {pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top topics */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4">Top Topics</h3>
              <ol className="space-y-2.5">
                {digest.top_topics.slice(0, 7).map((t, i) => (
                  <li key={t.topic} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-300 w-4 shrink-0">#{i + 1}</span>
                    <span className="text-sm text-gray-700 flex-1 truncate">{t.topic}</span>
                    <span className="text-xs font-bold text-orange-500">{t.count}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
