import { useEffect, useState } from "react";
import { fetchStats, fetchTrends, fetchAlerts, Stats, TrendBucket, Alert } from "../api/client";
import { useRealtimePosts } from "../hooks/useRealtimePosts";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import SentimentLineChart from "../components/charts/SentimentLineChart";

const KPI_META = [
  { key: "total_posts",        label: "Total Posts",   bg: "bg-orange-50",  border: "border-orange-100", icon: "📄", val: "text-orange-600" },
  { key: "analyzed_posts",     label: "Analyzed",      bg: "bg-sky-50",     border: "border-sky-100",    icon: "🤖", val: "text-sky-600"    },
  { key: "alerts_24h",         label: "Alerts (24h)",  bg: "bg-red-50",     border: "border-red-100",    icon: "🔔", val: "text-red-600"    },
  { key: "subreddits_tracked", label: "Feeds Tracked", bg: "bg-emerald-50", border: "border-emerald-100",icon: "📌", val: "text-emerald-600"},
] as const;

const SENTIMENT_DOT: Record<string, string> = {
  positive: "bg-emerald-400",
  negative: "bg-red-400",
  neutral:  "bg-gray-300",
};

export default function Overview() {
  const [stats, setStats]   = useState<Stats | null>(null);
  const [trends, setTrends] = useState<TrendBucket[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const { posts: livePosts, connected } = useRealtimePosts(8);

  useEffect(() => {
    fetchStats().then(setStats).catch(console.error);
    fetchTrends({ hours: 24 }).then(setTrends).catch(console.error);
    fetchAlerts({ limit: 5 }).then(setAlerts).catch(console.error);
  }, []);

  // Bump total_posts count as live posts arrive
  useEffect(() => {
    if (livePosts.length > 0 && stats) {
      setStats((s) => s ? { ...s, total_posts: s.total_posts + 1, analyzed_posts: s.analyzed_posts + 1 } : s);
    }
  }, [livePosts.length]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time Hacker News sentiment at a glance</p>
        </div>
        {/* Live connection badge */}
        <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border ${
          connected
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : "bg-gray-50 border-gray-200 text-gray-400"
        }`}>
          <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-gray-300"}`} />
          {connected ? "Live" : "Connecting…"}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {KPI_META.map(({ key, label, bg, border, icon, val }) => (
          <div key={key} className={`${bg} border ${border} rounded-2xl p-5`}>
            <span className="text-2xl mb-3 block">{icon}</span>
            <p className={`text-3xl font-bold ${val}`}>
              {stats ? (stats[key as keyof Stats] ?? "—") : "—"}
            </p>
            <p className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>

      {/* Live feed */}
      <Card title={`Live Feed ${connected ? "— streaming" : ""}`}>
        {livePosts.length === 0 ? (
          <p className="text-gray-400 text-sm py-6 text-center">
            {connected ? "Waiting for next analyzed post…" : "Connecting to live feed…"}
          </p>
        ) : (
          <div className="space-y-0 divide-y divide-gray-100">
            {livePosts.map((p, i) => (
              <div
                key={p.post_id + i}
                className="flex items-start gap-3 py-3 first:pt-0 last:pb-0 animate-fade-in"
              >
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${SENTIMENT_DOT[p.sentiment] ?? "bg-gray-300"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-orange-600">hn:{p.subreddit}</span>
                    <span className="text-xs text-gray-400">u/{p.author}</span>
                  </div>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-gray-800 hover:text-orange-600 transition-colors line-clamp-1"
                  >
                    {p.title}
                  </a>
                  {p.topics.length > 0 && (
                    <div className="flex gap-1.5 mt-1 flex-wrap">
                      {p.topics.slice(0, 3).map((t) => (
                        <span key={t} className="text-[11px] text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <Badge value={p.sentiment} variant="sentiment" />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Chart */}
      <Card title="Sentiment Trend — Last 24h">
        <SentimentLineChart data={trends} />
      </Card>

      {/* Recent alerts */}
      <Card title="Recent Alerts">
        {alerts.length === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center">No alerts detected.</p>
        ) : (
          <div className="space-y-2">
            {alerts.map((a) => (
              <div key={a.id} className="flex items-start gap-3 p-3.5 bg-gray-50 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors">
                <Badge value={a.severity} variant="severity" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-gray-800">hn:{a.subreddit}</span>
                    <span className="text-xs text-red-500 font-medium">{(a.negative_pct * 100).toFixed(0)}% negative</span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-1">{a.summary}</p>
                </div>
                <span className="text-[11px] text-gray-400 shrink-0 mt-0.5">
                  {new Date(a.detected_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
