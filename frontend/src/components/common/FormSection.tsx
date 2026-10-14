import { cn } from "@/lib/utils";

interface FormSectionProps {
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * A titled part of a form. When there is room (judged by the width of the form itself, not of the
 * screen) the title and its explanation sit in a narrow left column and the controls take the wide
 * right column; in a narrow place, such as a modal or a phone, the title simply sits above.
 */
export function FormSection({
  title,
  description,
  className,
  children,
}: FormSectionProps) {
  return (
    <section
      className={cn(
        "@container border-t py-7 first:border-t-0 first:pt-0",
        className,
      )}
    >
      <div className="grid gap-4 @3xl:grid-cols-[14rem_minmax(0,1fr)] @3xl:gap-10">
        <div>
          <h2 className="t-h2 text-[1.125rem]">{title}</h2>
          {description && (
            <p className="mt-1 max-w-xs text-[0.8125rem] text-ink-3">
              {description}
            </p>
          )}
        </div>
        <div className="grid min-w-0 gap-4">{children}</div>
      </div>
    </section>
  );
}
