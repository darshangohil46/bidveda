"use client";

import { useState } from "react";
import { startOfDay, startOfMonth } from "date-fns";
import { CalendarDays, Clock, X } from "lucide-react";
import { CalendarMonth } from "@/components/common/CalendarMonth";
import { TimeColumns } from "@/components/common/TimeColumns";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNow } from "@/hooks/use-now";
import {
  changeTimePart,
  clampToRange,
  parsePickerValue,
  pickDay,
  serializePickerValue,
  type TimePart,
} from "@/lib/date-picker";
import { cn } from "@/lib/utils";
import { PickerMode } from "@/types/enums";
import { formatDate, formatDateTime, formatTime } from "@/utils/general";

interface DateTimePickerProps {
  id?: string;
  mode?: PickerMode;
  /** date: "yyyy-MM-dd" · time: "HH:mm" · datetime: ISO string. Empty/null = nothing chosen. */
  value: string | null;
  onChange: (value: string | null) => void;
  /** Earliest selectable moment (days before it are disabled; times before it are clamped). */
  min?: Date;
  max?: Date;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  invalid?: boolean;
  className?: string;
}

/** The text shown on the button for the chosen value. */
function labelFor(selected: Date | null, mode: PickerMode): string | null {
  if (!selected) return null;
  if (mode === PickerMode.DATE) return formatDate(selected);
  if (mode === PickerMode.TIME) return formatTime(selected);
  return formatDateTime(selected);
}

/**
 * Our own date / time picker (the browser's one is not used). A button shows the chosen value;
 * pressing it opens a calendar, a time list, or both, depending on `mode`.
 *
 * The date maths lives in lib/date-picker.ts, the calendar in CalendarMonth and the time lists
 * in TimeColumns. This component only connects them to the value.
 */
export function DateTimePicker({
  id,
  mode = PickerMode.DATE,
  value,
  onChange,
  min,
  max,
  placeholder,
  disabled,
  clearable = true,
  invalid,
  className,
}: DateTimePickerProps) {
  const now = useNow(60_000);
  const today = new Date(now);
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date | null>(null);

  const selected = parsePickerValue(value, mode, today);
  // The calendar opens on the month being looked at, else the chosen date, else the earliest allowed, else today.
  const month = startOfMonth(viewMonth ?? selected ?? min ?? today);
  const label = labelFor(selected, mode);

  const showCalendar = mode !== PickerMode.TIME;
  const showTime = mode !== PickerMode.DATE;

  function commit(next: Date) {
    onChange(serializePickerValue(clampToRange(next, mode, min, max), mode));
  }

  function onPickDay(day: Date) {
    const next = pickDay(day, selected);
    commit(mode === PickerMode.DATE ? startOfDay(next) : next);
    if (mode === PickerMode.DATE) setOpen(false);
  }

  function onChangeTime(part: TimePart, amount: number) {
    commit(changeTimePart(selected, today, part, amount));
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn("relative flex", className)}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={invalid}
            className={cn(
              "h-9 w-full justify-start bg-card px-3 text-left font-normal",
              !label && "text-ink-3",
              invalid && "border-rust",
              clearable && label && "pr-9",
            )}
          >
            {mode === PickerMode.TIME ? (
              <Clock className="size-4 text-ink-3" />
            ) : (
              <CalendarDays className="size-4 text-ink-3" />
            )}
            <span className="truncate">{label ?? placeholder ?? "Select"}</span>
          </Button>
        </PopoverTrigger>
        {clearable && label && !disabled && (
          <button
            type="button"
            aria-label="Clear"
            onClick={() => onChange(null)}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-1 text-ink-3 hover:text-ink"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Never taller than the room left on screen: a modal near the bottom of the window scrolls the picker instead of cutting it off. */}
      <PopoverContent
        align="start"
        collisionPadding={16}
        className="max-h-(--radix-popover-content-available-height) w-76 overflow-y-auto p-3 [&>*]:shrink-0"
      >
        {showCalendar && (
          <CalendarMonth
            month={month}
            onMonthChange={setViewMonth}
            selected={selected}
            today={today}
            min={min}
            max={max}
            onPickDay={onPickDay}
          />
        )}

        {showTime && (
          <div className={cn(showCalendar && "mt-3 border-t pt-3")}>
            <TimeColumns selected={selected} onChange={onChangeTime} />
          </div>
        )}

        {mode !== PickerMode.DATE && (
          <div className="mt-3 flex justify-end">
            <Button type="button" size="sm" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
