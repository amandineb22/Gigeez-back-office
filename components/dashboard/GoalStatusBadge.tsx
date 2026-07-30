import { Badge } from "@/components/ui/Badge";
import type { GoalStatus } from "@/lib/calculations";

const LABELS: Record<GoalStatus, string> = {
  "on-track": "On track",
  "at-risk": "At risk",
  behind: "Behind",
};

const VARIANTS: Record<GoalStatus, "success" | "warning" | "danger"> = {
  "on-track": "success",
  "at-risk": "warning",
  behind: "danger",
};

export function GoalStatusBadge({ status }: { status: GoalStatus }) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}
