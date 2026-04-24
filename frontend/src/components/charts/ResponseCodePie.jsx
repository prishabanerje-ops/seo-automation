import React from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const COLORS = { "2xx": "#4ade80", "3xx": "#facc15", "4xx": "#f87171", "5xx": "#c084fc" };

export default function ResponseCodePie({ data = [] }) {
  return (
    <PieChart width={320} height={240}>
      <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
        {data.map((entry) => (
          <Cell key={entry.name} fill={COLORS[entry.name] || "#6b7280"} />
        ))}
      </Pie>
      <Tooltip />
      <Legend />
    </PieChart>
  );
}
