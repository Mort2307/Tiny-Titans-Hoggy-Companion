import { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import type { WeightRecord } from "../types/Weight";
import { useUnits } from "../context/UnitContextValue";
import { useAuth } from "../context/useAuth";
import { useParams } from "react-router-dom";
import { getSnakeWeights } from "../services/weightService";

type WeightMiniChartProps = { history: WeightRecord[] };

function WeightMiniChart({ history }: WeightMiniChartProps) {
  const { isImperial, weightUnit } = useUnits();
  const { user } = useAuth();
  const { id: snakeId } = useParams<{ id: string }>();
  const [canonicalHistory, setCanonicalHistory] = useState<WeightRecord[] | null>(null);

  useEffect(() => {
    if (!user || !snakeId) {
      setCanonicalHistory(null);
      return;
    }

    let cancelled = false;
    void getSnakeWeights(user.uid, snakeId)
      .then((records) => {
        if (!cancelled) setCanonicalHistory(records);
      })
      .catch((error) => {
        console.error("Tiny Titans: unable to load canonical mini-chart weights", error);
        if (!cancelled) setCanonicalHistory(null);
      });

    return () => {
      cancelled = true;
    };
  }, [user, snakeId]);

  const chartHistory = canonicalHistory ?? history;

  const data = useMemo(() => [...chartHistory]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((record) => ({
      date: new Date(record.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      weight: (record.unit === "kg" ? record.weight * 1000 : record.weight) / (isImperial ? 28.349523125 : 1),
    })), [chartHistory, isImperial]);

  if (!chartHistory || chartHistory.length < 2) return <div className="weight-chart-empty">📈 Add more weight records<br />to see growth progress</div>;

  return (
    <div className="weight-chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 16 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 9 }} tickMargin={4} />
          <YAxis tick={{ fontSize: 9 }} width={38} domain={["auto", "auto"]} tickFormatter={(value) => `${Number(value).toFixed(1)}${weightUnit}`} />
          <Tooltip formatter={(value) => [`${Number(value ?? 0).toFixed(1)} ${weightUnit}`, "Weight"]} />
          <Line type="monotone" dataKey="weight" strokeWidth={2.5} dot={{ r: 2.5 }} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default WeightMiniChart;
