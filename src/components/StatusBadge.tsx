import { AlertTriangle, CheckCircle2, CircleSlash } from "lucide-react";
import type { OpeningPlanStatus } from "../types/domain";

const statusStyle: Record<OpeningPlanStatus, string> = {
  可开团: "border-emerald-200 bg-emerald-50 text-emerald-700",
  资源不足: "border-rose-200 bg-rose-50 text-rose-700",
  规则冲突: "border-amber-200 bg-amber-50 text-amber-700",
};

export function StatusBadge({ status }: { status: OpeningPlanStatus }) {
  const Icon =
    status === "可开团" ? CheckCircle2 : status === "资源不足" ? AlertTriangle : CircleSlash;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyle[status]}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}
