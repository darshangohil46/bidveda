import { Clock } from "lucide-react";
import { to12Hour, type TimePart } from "@/lib/date-picker";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 12 }, (_, index) => index + 1);
const MINUTES = Array.from({ length: 12 }, (_, index) => index * 5);

interface TimeColumnProps {
  label: string;
  options: Array<{ value: number; text: string }>;
  selected: number | null;
  onPick: (value: number) => void;
}

/** One scrollable list of choices (hours, minutes or AM / PM). */
function TimeColumn({ label, options, selected, onPick }: TimeColumnProps) {
  return (
    <div
      role="listbox"
      aria-label={label}
      className="flex max-h-36 flex-col gap-0.5 overflow-y-auto rounded-sm border p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="option"
          aria-selected={selected === option.value}
          onClick={() => onPick(option.value)}
          className={cn(
            "t-figure rounded-sm px-2 py-1 text-center text-[0.8125rem] transition-colors",
            selected === option.value
              ? "bg-pine text-white"
              : "hover:bg-sunken",
          )}
        >
          {option.text}
        </button>
      ))}
    </div>
  );
}

interface TimeColumnsProps {
  /** The chosen time, or null while nothing is chosen. */
  selected: Date | null;
  onChange: (part: TimePart, amount: number) => void;
}

/** Three lists side by side: hour, minute (every 5) and AM / PM. */
export function TimeColumns({ selected, onChange }: TimeColumnsProps) {
  const clock = selected ? to12Hour(selected) : null;

  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[0.75rem] font-medium text-ink-2">
        <Clock className="size-3.5" /> Time
      </p>
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
        <TimeColumn
          label="Hour"
          options={HOURS.map((hour) => ({ value: hour, text: String(hour) }))}
          selected={clock?.hour ?? null}
          onPick={(hour) => onChange("hour", hour)}
        />
        <TimeColumn
          label="Minute"
          options={MINUTES.map((minute) => ({
            value: minute,
            text: String(minute).padStart(2, "0"),
          }))}
          selected={clock?.minute ?? null}
          onPick={(minute) => onChange("minute", minute)}
        />
        <TimeColumn
          label="AM / PM"
          options={[
            { value: 0, text: "AM" },
            { value: 1, text: "PM" },
          ]}
          selected={clock ? (clock.pm ? 1 : 0) : null}
          onPick={(meridiem) => onChange("meridiem", meridiem)}
        />
      </div>
    </div>
  );
}
