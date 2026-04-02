import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import { TrendBucket } from "../../api/client";

interface Props { data: TrendBucket[]; }

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function SentimentLineChart({ data }: Props) {
  if (!data.length)
    return <p className="text-gray-400 text-sm text-center py-10">No trend data yet.</p>;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="hour" tickFormatter={fmt} tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
          labelStyle={{ color: "#374151", fontSize: 12 }}
          labelFormatter={fmt}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Line type="monotone" dataKey="positive" stroke="#10b981" strokeWidth={2.5} dot={false} name="Positive" />
        <Line type="monotone" dataKey="negative" stroke="#f87171" strokeWidth={2.5} dot={false} name="Negative" />
        <Line type="monotone" dataKey="neutral"  stroke="#d1d5db" strokeWidth={2}   dot={false} name="Neutral"  />
      </LineChart>
    </ResponsiveContainer>
  );
}
