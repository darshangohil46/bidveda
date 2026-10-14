"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SEARCH_DEBOUNCE_MS } from "@/utils/constant";
import { debounce } from "@/utils/general";

interface SearchInputProps {
  id?: string;
  /** Initial text. To reset the box from outside, change the component's `key`. */
  defaultValue?: string;
  placeholder?: string;
  onSearch: (value: string) => void;
  delay?: number;
  className?: string;
  "aria-label"?: string;
}

/** Calls `onSearch` once the person stops typing, so the API is not hit on every keystroke. */
export function SearchInput({
  id,
  defaultValue = "",
  placeholder = "Search",
  onSearch,
  delay = SEARCH_DEBOUNCE_MS,
  className,
  "aria-label": ariaLabel,
}: SearchInputProps) {
  const [text, setText] = useState(defaultValue);
  const latestHandler = useRef(onSearch);
  const lastEmitted = useRef(defaultValue.trim());

  useEffect(() => {
    latestHandler.current = onSearch;
  });

  // Debounced on the util in utils/general.ts: fires `delay` ms after the last keystroke.
  useEffect(() => {
    const emit = debounce((value: string) => {
      if (value === lastEmitted.current) return;
      lastEmitted.current = value;
      latestHandler.current(value);
    }, delay);
    emit(text.trim());
    return () => emit.cancel();
  }, [text, delay]);

  function clear() {
    setText("");
    lastEmitted.current = "";
    latestHandler.current("");
  }

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
      <Input
        id={id}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? (id ? undefined : "Search")}
        className="h-9 bg-card pr-8 pl-9"
      />
      {text && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={clear}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-1 text-ink-3 hover:text-ink"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
