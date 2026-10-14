import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

/** Label above, control, then either the error or the hint (never both). */
export function FormField({
  label,
  htmlFor,
  required,
  hint,
  error,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <Label
        htmlFor={htmlFor}
        className="text-[0.8125rem] font-medium text-ink"
      >
        {label}
        {required && (
          <span className="ml-0.5 text-rust" aria-hidden>
            *
          </span>
        )}
      </Label>
      {children}
      {error ? (
        <p role="alert" className="text-[0.75rem] text-rust">
          {error}
        </p>
      ) : (
        hint && <p className="text-[0.75rem] text-ink-3">{hint}</p>
      )}
    </div>
  );
}
