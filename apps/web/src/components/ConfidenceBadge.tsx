interface Props {
  confidence: number;
}

export function ConfidenceBadge({ confidence }: Props) {
  const level = confidence >= 0.8 ? "high" : confidence >= 0.5 ? "medium" : "low";
  const colors: Record<string, string> = {
    high: "#1a7f37",
    medium: "#9a6700",
    low: "#cf222e",
  };

  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 12,
        fontSize: 12,
        color: "white",
        backgroundColor: colors[level],
      }}
      title={`Extraction confidence: ${Math.round(confidence * 100)}%`}
    >
      {Math.round(confidence * 100)}%
    </span>
  );
}
