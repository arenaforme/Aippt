import { cn } from "@/lib/utils";
import { CheckCircle, Loader2, XCircle } from "lucide-react";

interface GenerationProgressProps {
  currentStep: number;
  totalSteps: number;
  stepLabel?: string;
  percentage?: number;
  status: "idle" | "loading" | "success" | "error";
}

export function GenerationProgress({
  currentStep,
  totalSteps,
  stepLabel,
  percentage,
  status,
}: GenerationProgressProps) {
  const progress = percentage ?? Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="w-full space-y-3">
      {/* 进度条 */}
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-300 ease-out rounded-full",
            status === "error" ? "bg-destructive" : "bg-primary"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 状态信息 */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {status === "loading" && (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
          {status === "success" && (
            <CheckCircle className="h-4 w-4 text-green-500" />
          )}
          {status === "error" && (
            <XCircle className="h-4 w-4 text-destructive" />
          )}
          <span className="text-muted-foreground">
            {stepLabel || `步骤 ${currentStep}/${totalSteps}`}
          </span>
        </div>
        <span className="text-muted-foreground">{progress}%</span>
      </div>
    </div>
  );
}
