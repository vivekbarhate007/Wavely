import { useEffect, useState } from "react";
import { fetchTopics, TopicStat } from "../api/client";
import Card from "../components/ui/Card";
import TopicBarChart from "../components/charts/TopicBarChart";

const HOURS = [6, 12, 24, 48, 168];

export default function Topics() {
  const [topics, setTopics] = useState<TopicStat[]>([]);
  const [hours, setHours]   = useState(24);
  const [subreddit, setSub] = useState("");

  useEffect(() => {
    fetchTopics({ hours, subreddit: subreddit || undefined }).then(setTopics).catch(console.error);
  }, [hours, subreddit]);

  const total = topics.reduce((s, t) => s + t.total, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Topics</h1>
          <p className="text-sm text-gray-500 mt-1">{topics.length} topics from {total} analyzed posts</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              className="bg-white border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 w-44 transition shadow-sm"
              placeholder="Filter subreddit..."
              value={subreddit}
              onChange={(e) => setSub(e.target.value)}
            />
          </div>
          <select
            className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition shadow-sm cursor-pointer"
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
          >
            {HOURS.map((h) => <option key={h} value={h}>Last {h}h</option>)}
          </select>
        </div>
      </div>

      <Card title="Topic Frequency & Sentiment Breakdown">
        <TopicBarChart data={topics} />
      </Card>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">All Topics</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Topic</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-emerald-600 uppercase tracking-wider">Pos</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-red-500 uppercase tracking-wider">Neg</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Neu</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Split</th>
            </tr>
          </thead>
          <tbody>
            {topics.map((t, i) => {
              const posW = t.total ? (t.positive / t.total) * 100 : 0;
              const negW = t.total ? (t.negative / t.total) * 100 : 0;
              return (
                <tr key={t.topic} className={`hover:bg-orange-50 transition-colors ${i !== topics.length - 1 ? "border-b border-gray-100" : ""}`}>
                  <td className="px-5 py-3.5 font-semibold text-gray-800">{t.topic}</td>
                  <td className="px-5 py-3.5 text-right font-bold text-gray-700">{t.total}</td>
                  <td className="px-5 py-3.5 text-right text-emerald-600 font-medium">{t.positive}</td>
                  <td className="px-5 py-3.5 text-right text-red-500 font-medium">{t.negative}</td>
                  <td className="px-5 py-3.5 text-right text-gray-400">{t.neutral}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
                      <div className="bg-emerald-400 transition-all" style={{ width: `${posW}%` }} />
                      <div className="bg-red-400 transition-all"     style={{ width: `${negW}%` }} />
                    </div>
                  </td>
                </tr>
              );
            })}
            {topics.length === 0 && (
              <tr><td colSpan={6} className="py-12 text-center text-gray-400">No topic data yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
