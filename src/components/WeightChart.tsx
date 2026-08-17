import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { WeightRecord } from "../types/Weight";
<<<<<<< HEAD
import { useUnits } from "../context/UnitContextValue";
=======
import { useUnits } from "../context/UnitContextValueValue";
>>>>>>> origin/master

type WeightChartProps = { history: WeightRecord[] };

type ChartPoint = WeightRecord & { displayWeight: number };

function WeightChart({ history }: WeightChartProps) {
  const { isImperial, weightUnit } = useUnits();

  if (!history || history.length === 0) return <p>No weight records yet.</p>;

  const sortedHistory = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const chartData: ChartPoint[] = sortedHistory.map((record) => ({
    ...record,
    displayWeight: isImperial ? record.weight / 28.349523125 : record.weight,
  }));

  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis dataKey="displayWeight" unit={weightUnit} />
          <Tooltip formatter={(value) => `${Number(value).toFixed(1)} ${weightUnit}`} />
          <Line type="monotone" dataKey="displayWeight" strokeWidth={2} dot />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default WeightChart;
