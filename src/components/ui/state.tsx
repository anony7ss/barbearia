import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type StateProps = {
  title: string;
  description?: string;
  className?: string;
};

export function EmptyState({ title, description, className }: StateProps) {
  return (
    <div className={cn("rounded-2xl border border-line p-8 text-center", className)}>
      <p className="text-lg font-semibold text-foreground">{title}</p>
      {description ? <p className="mt-2 text-sm leading-6 text-muted">{description}</p> : null}
    </div>
  );
}

export function LoadingState({ title, description, className }: StateProps) {
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl border border-line p-5", className)}>
      <Loader2 className="animate-spin text-brass" size={20} aria-hidden="true" />
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        {description ? <p className="text-sm text-muted">{description}</p> : null}
      </div>
    </div>
  );
}

export function ErrorState({ title, description, className }: StateProps) {
  return (
    <div className={cn("flex items-start gap-3 rounded-2xl border border-oxblood/40 bg-oxblood/15 p-5", className)}>
      <AlertCircle className="mt-0.5 text-brass" size={20} aria-hidden="true" />
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        {description ? <p className="mt-1 text-sm leading-6 text-muted">{description}</p> : null}
      </div>
    </div>
  );
}

export function SuccessState({ title, description, className }: StateProps) {
  return (
    <div className={cn("flex items-start gap-3 rounded-2xl border border-evergreen/50 bg-evergreen/20 p-5", className)}>
      <CheckCircle2 className="mt-0.5 text-brass" size={20} aria-hidden="true" />
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        {description ? <p className="mt-1 text-sm leading-6 text-muted">{description}</p> : null}
      </div>
    </div>
  );
}
