"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { customOptionFor, filterOptions } from "@/lib/options";
import { cn } from "@/lib/utils";
import type { SelectOption } from "@/types/ui";
import { SEARCH_DEBOUNCE_MS } from "@/utils/constant";
import { debounce } from "@/utils/general";

interface SearchSelectProps {
  id?: string;
  value: string | null;
  /** Shown on the button when `value` is not (yet) in `options`, e.g. a remote FK or a typed-in value. */
  selectedLabel?: string;
  options: SelectOption[];
  onChange: (option: SelectOption | null) => void;
  /** Provide for remote search; options are then shown as given and not filtered locally. */
  onSearch?: (query: string) => void;
  loading?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  invalid?: boolean;
  clearable?: boolean;
  /** Also accept text that is not in the list: whatever is typed is offered as "Use ...". */
  allowCustom?: boolean;
  /** Longest text that may be typed in the search box (matters for `allowCustom`). */
  maxLength?: number;
  /** Accessible name for the button when the visible text alone is not enough (for example "Item 1 unit"). */
  ariaLabel?: string;
  /** Show the search box. By default only long lists, remote lists and `allowCustom` have one. */
  searchable?: boolean;
  className?: string;
}

const MAX_RENDERED = 200;
/** Lists with more options than this get a search box when `searchable` is not set. */
const SEARCH_FROM = 7;

/**
 * The one dropdown of the app: a button that opens a panel with a search box and a list.
 * Short lists are filtered here; long server-side lists (`onSearch`) are searched on the server.
 */
export function SearchSelect({
  id,
  value,
  selectedLabel,
  options,
  onChange,
  onSearch,
  loading,
  placeholder = "Select",
  searchPlaceholder = "Search",
  emptyText = "No matches",
  disabled,
  invalid,
  clearable,
  allowCustom,
  maxLength,
  searchable,
  ariaLabel,
  className,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const latestSearch = useRef(onSearch);
  const lastSearched = useRef("");
  const isRemote = !!onSearch;
  const showSearch =
    searchable ?? (isRemote || !!allowCustom || options.length > SEARCH_FROM);

  useEffect(() => {
    latestSearch.current = onSearch;
  });

  // Remote lists: ask the server once typing pauses (debounce util from utils/general.ts).
  useEffect(() => {
    if (!open || !isRemote) return;
    const run = debounce((text: string) => {
      if (text === lastSearched.current) return;
      lastSearched.current = text;
      latestSearch.current?.(text);
    }, SEARCH_DEBOUNCE_MS);
    run(query.trim());
    return () => run.cancel();
  }, [query, open, isRemote]);

  const visible = useMemo(
    () => (onSearch ? options : filterOptions(options, query, MAX_RENDERED)),
    [options, query, onSearch],
  );
  const custom = allowCustom ? customOptionFor(options, query) : null;

  const selected = options.find((option) => option.value === value);
  const buttonLabel = selected?.label ?? selectedLabel ?? null;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setQuery("");
      // Load the default list straight away; typing refines it.
      lastSearched.current = "";
      onSearch?.("");
    }
  }

  function pick(option: SelectOption) {
    onChange(option);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <div className={cn("relative flex", className)}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-label={ariaLabel}
            aria-expanded={open}
            aria-invalid={invalid}
            disabled={disabled}
            className={cn(
              "h-9 w-full justify-between bg-card px-3 font-normal",
              !buttonLabel && "text-ink-3",
              invalid && "border-rust",
              clearable && buttonLabel && "pr-14",
            )}
          >
            <span className="truncate">{buttonLabel ?? placeholder}</span>
            <ChevronsUpDown className="size-4 shrink-0 text-ink-3" />
          </Button>
        </PopoverTrigger>
        {clearable && buttonLabel && !disabled && (
          <button
            type="button"
            aria-label="Clear selection"
            onClick={() => onChange(null)}
            className="absolute top-1/2 right-8 -translate-y-1/2 rounded-sm p-1 text-ink-3 hover:text-ink"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) min-w-56 p-2"
      >
        {showSearch && (
          <div className="relative mb-2">
            <Input
              autoFocus
              value={query}
              maxLength={maxLength}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-8"
            />
            {loading && (
              <Loader2 className="absolute top-1/2 right-2 size-4 -translate-y-1/2 animate-spin text-ink-3" />
            )}
          </div>
        )}

        <ul role="listbox" className="max-h-60 overflow-y-auto">
          {visible.length === 0 && !custom && !loading && (
            <li className="px-2 py-2 text-[0.8125rem] text-ink-3">
              {emptyText}
            </li>
          )}
          {visible.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => pick(option)}
                className={cn(
                  "flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-[0.8125rem] transition-colors hover:bg-sunken",
                  option.value === value && "bg-pine-soft",
                )}
              >
                <Check
                  className={cn(
                    "mt-0.5 size-3.5 shrink-0 text-pine",
                    option.value !== value && "invisible",
                  )}
                />
                <span className="min-w-0">
                  <span className="block truncate text-ink">
                    {option.label}
                  </span>
                  {option.description && (
                    <span className="block truncate text-[0.75rem] text-ink-3">
                      {option.description}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
          {custom && (
            <li>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => pick(custom)}
                className="flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-[0.8125rem] text-ink transition-colors hover:bg-sunken"
              >
                <Check className="mt-0.5 size-3.5 shrink-0 invisible" />
                <span className="min-w-0 truncate">
                  Use &ldquo;<strong>{custom.label}</strong>&rdquo;
                </span>
              </button>
            </li>
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
