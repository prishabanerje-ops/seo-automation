import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function TrendLine({ data = [], dataKey = "issues", color = "#60a5fa" }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} />
        <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} />
        <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "6px" }} />
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
