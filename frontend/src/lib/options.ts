import type { SelectOption } from "@/types/ui";

/** Turns a plain list of words into dropdown options whose value and label are the same. */
export function toOptions(values: readonly string[]): SelectOption[] {
  return values.map((value) => ({ value, label: value }));
}

/** The options whose label contains what was typed (ignoring case). With nothing typed, all of them, up to `max`. */
export function filterOptions(
  options: SelectOption[],
  query: string,
  max: number,
): SelectOption[] {
  const needle = query.trim().toLowerCase();
  const matches = needle
    ? options.filter((option) => option.label.toLowerCase().includes(needle))
    : options;
  return matches.slice(0, max);
}

/**
 * For a dropdown that also accepts text of the person's own: the extra "use what I typed" choice.
 * It is offered only when something was typed and no existing option already says the same.
 */
export function customOptionFor(
  options: SelectOption[],
  query: string,
): SelectOption | null {
  const typed = query.trim();
  if (!typed) return null;
  const exists = options.some(
    (option) => option.label.toLowerCase() === typed.toLowerCase(),
  );
  return exists ? null : { value: typed, label: typed };
}
