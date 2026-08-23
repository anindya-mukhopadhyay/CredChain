import React from "react";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface RelationshipVisualizerProps {
  currentSemester: number;
}

export function RelationshipVisualizer({ currentSemester }: RelationshipVisualizerProps) {
  const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex items-center min-w-max gap-2">
        {semesters.map((sem, idx) => {
          const isCompleted = sem < currentSemester;
          const isCurrent = sem === currentSemester;

          return (
            <React.Fragment key={sem}>
              <div
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-semibold select-none transition-all",
                  isCurrent
                    ? "bg-sky-50 border-sky-400 text-sky-900 ring-2 ring-sky-500/20"
                    : isCompleted
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                    : "bg-slate-50 border-slate-200 text-slate-400 opacity-60"
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <span
                    className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center text-[10px]",
                      isCurrent
                        ? "bg-sky-600 text-white"
                        : "bg-slate-200 text-slate-600"
                    )}
                  >
                    {sem}
                  </span>
                )}
                <span>Sem {sem}</span>
              </div>
              {idx < semesters.length - 1 && (
                <ArrowRight
                  className={cn(
                    "w-3.5 h-3.5 shrink-0",
                    sem < currentSemester ? "text-emerald-500" : "text-slate-300"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
