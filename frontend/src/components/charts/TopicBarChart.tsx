import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import { TopicStat } from "../../api/client";

interface Props { data: TopicStat[]; }

export default function TopicBarChart({ data }: Props) {
  if (!data.length)
    return <p className="text-gray-400 text-sm text-center py-10">No topic data yet.</p>;

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 100, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
        <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis dataKey="topic" type="category" tick={{ fill: "#374151", fontSize: 11 }} width={100} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
          labelStyle={{ color: "#374151", fontSize: 12, fontWeight: 600 }}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Bar dataKey="positive" stackId="a" fill="#10b981" name="Positive" />
        <Bar dataKey="neutral"  stackId="a" fill="#e5e7eb" name="Neutral" />
        <Bar dataKey="negative" stackId="a" fill="#f87171" name="Negative" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
