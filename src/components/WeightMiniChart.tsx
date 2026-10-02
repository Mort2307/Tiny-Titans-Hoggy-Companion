import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import type { WeightRecord } from "../types/Weight";
import { useAuth } from "../context/useAuth";
import { getSnakeWeights } from "../services/weightService";
import WeightChart from "./WeightChart";

type WeightMiniChartProps = { history: WeightRecord[] };

function WeightMiniChart({ history }: WeightMiniChartProps) {
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
        console.error(
          "Tiny Titans: unable to load canonical mini-chart weights",
          error,
        );
        if (!cancelled) setCanonicalHistory(null);
      });

    return () => {
      cancelled = true;
    };
  }, [user, snakeId]);

  const chartHistory = useMemo(() => {
    const merged = [...history, ...(canonicalHistory ?? [])];
    const seen = new Set<string>();

    return merged.filter((record) => {
      const key =
        record.id ||
        record.date + "|" + record.weight + "|" + (record.unit ?? "g");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [history, canonicalHistory]);

  return <WeightChart history={chartHistory} compact />;
}

export default WeightMiniChart;
