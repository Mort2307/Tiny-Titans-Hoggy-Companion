export default function TitanUsageIndicator({ used, limit, remaining }: { used: number; limit: number; remaining: number }) {
  const label = remaining > 0 ? `${remaining} questions remaining this month` : "Monthly allowance reached";
  return (
    <div className="titan-usage" aria-label={label}>
      <span>Titan usage</span>
      <strong>{used} / {limit}</strong>
      <small>{label}</small>
    </div>
  );
}