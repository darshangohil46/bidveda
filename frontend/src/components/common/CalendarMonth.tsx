import {
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  setMonth,
  setYear,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  isDayBlocked,
  isMonthBlocked,
  monthGrid,
  yearOptions,
} from "@/lib/date-picker";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTH_NAMES = Array.from({ length: 12 }, (_, index) =>
  format(new Date(2000, index, 1), "MMMM"),
);
/** The month and year dropdowns look like plain text until hovered. */
const HEADER_SELECT =
  "gap-1 border-transparent bg-transparent px-1.5 text-sm font-medium text-ink shadow-none hover:bg-sunken";

interface CalendarMonthProps {
  /** First day of the month being shown. */
  month: Date;
  onMonthChange: (month: Date) => void;
  selected: Date | null;
  today: Date;
  min?: Date;
  max?: Date;
  onPickDay: (day: Date) => void;
}

/** One month: arrows and month / year dropdowns on top, then the weekday names and the days. */
export function CalendarMonth({
  month,
  onMonthChange,
  selected,
  today,
  min,
  max,
  onPickDay,
}: CalendarMonthProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Previous month"
          onClick={() => onMonthChange(subMonths(month, 1))}
        >
          <ChevronLeft className="size-4" />
        </Button>

        <div className="flex items-center gap-1">
          <Select
            value={String(month.getMonth())}
            onValueChange={(value) =>
              onMonthChange(setMonth(month, Number(value)))
            }
          >
            <SelectTrigger
              size="sm"
              aria-label="Month"
              className={HEADER_SELECT}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((name, index) => (
                <SelectItem
                  key={name}
                  value={String(index)}
                  disabled={isMonthBlocked(month, index, min, max)}
                >
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(month.getFullYear())}
            onValueChange={(value) =>
              onMonthChange(setYear(month, Number(value)))
            }
          >
            <SelectTrigger
              size="sm"
              aria-label="Year"
              className={cn(HEADER_SELECT, "t-figure")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions(month, today, min, max).map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Next month"
          onClick={() => onMonthChange(addMonths(month, 1))}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 text-center">
        {WEEKDAYS.map((weekday) => (
          <span
            key={weekday}
            className="py-1 text-[0.6875rem] font-medium text-ink-3"
          >
            {weekday}
          </span>
        ))}
        {monthGrid(month).map((day) => {
          const isSelected = !!selected && isSameDay(day, selected);
          const blocked = isDayBlocked(day, min, max);
          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={blocked}
              onClick={() => onPickDay(day)}
              aria-pressed={isSelected}
              className={cn(
                "t-figure mx-auto my-0.5 flex size-8 items-center justify-center rounded-sm text-[0.8125rem] transition-colors",
                !isSameMonth(day, month) && "text-ink-3/60",
                !isSelected && !blocked && "hover:bg-sunken",
                isSameDay(day, today) &&
                  !isSelected &&
                  "ring-1 ring-line-strong",
                isSelected && "bg-pine text-white",
                blocked && "cursor-not-allowed text-ink-3/40",
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
