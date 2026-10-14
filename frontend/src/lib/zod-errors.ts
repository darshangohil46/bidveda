import type { z } from "zod";

/**
 * zod reports every problem as a flat list. For a simple form this keeps the first message of each
 * field: `{ email: "Enter a valid email address." }`.
 */
export function firstErrorPerField<Field extends string>(
  error: z.ZodError,
): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0]) as Field;
    errors[field] ??= issue.message;
  }
  return errors;
}
