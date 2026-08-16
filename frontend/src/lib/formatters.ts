export function formatDollar(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "—";
  }
  const isNegative = value < 0;
  const absFormatted = new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    maximumFractionDigits: 0,
  }).format(Math.abs(value));

  return isNegative ? `-${absFormatted}` : absFormatted;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "—";
  }
  return `${(value * 100).toFixed(2)}%`;
}

export function formatFlatType(flatType: string): string {
  switch (flatType) {
    case "2_ROOM":
      return "2-Room";
    case "3_ROOM":
      return "3-Room";
    case "4_ROOM":
      return "4-Room";
    case "5_ROOM":
      return "5-Room";
    default:
      return flatType;
  }
}
