import { cn } from "@/lib/utils";
import { formatDateTime } from "@/utils/general";

type Json = unknown;

const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isObject = (value: Json): value is Record<string, Json> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isPrimitive = (value: Json) =>
  value === null || typeof value !== "object";

/** "avatarUrl" -> "Avatar url", "role_id" -> "Role ID", "id" -> "ID". */
function labelFor(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((word) => (word.toLowerCase() === "id" ? "ID" : word.toLowerCase()));
  const text = words.join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function parsed(value: Json): Json {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as Json;
  } catch {
    return value;
  }
}

function Empty() {
  return <span className="text-ink-3">-</span>;
}

function Leaf({ value }: { value: Json }) {
  if (value === null || value === undefined || value === "") return <Empty />;
  if (typeof value === "boolean") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden
          className={cn("size-2 rounded-full", value ? "bg-pine" : "bg-ink-3")}
        />
        {value ? "Yes" : "No"}
      </span>
    );
  }
  if (typeof value === "number")
    return <span className="t-figure">{value}</span>;

  const text = String(value);
  if (ISO_DATE_TIME.test(text) && !Number.isNaN(Date.parse(text))) {
    return <span className="t-figure">{formatDateTime(text)}</span>;
  }
  if (UUID.test(text))
    return <span className="t-figure break-all">{text}</span>;
  return <span className="break-words whitespace-pre-wrap">{text}</span>;
}

function Node({ value }: { value: Json }) {
  if (Array.isArray(value)) {
    if (value.length === 0) return <Empty />;
    if (value.every(isPrimitive)) {
      return (
        <span className="flex flex-wrap gap-x-1.5">
          {value.map((item, index) => (
            <span key={index}>
              <Leaf value={item} />
              {index < value.length - 1 && ","}
            </span>
          ))}
        </span>
      );
    }
    return (
      <ol className="grid gap-2">
        {value.map((item, index) => (
          <li key={index} className="border-l border-line-strong pl-3">
            <Node value={item} />
          </li>
        ))}
      </ol>
    );
  }

  if (isObject(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) return <Empty />;

    // A set of on/off flags (a role's create / read / update / delete) reads best on one line.
    if (entries.every(([, flag]) => typeof flag === "boolean")) {
      return (
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          {entries.map(([key, flag]) => (
            <span
              key={key}
              className={cn(
                "inline-flex items-center gap-1.5",
                !flag && "text-ink-3",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "size-2 rounded-full",
                  flag ? "bg-pine" : "bg-line-strong",
                )}
              />
              {labelFor(key)}
            </span>
          ))}
        </span>
      );
    }

    return (
      <dl className="grid gap-2">
        {entries.map(([key, child]) => {
          const nested =
            !isPrimitive(child) &&
            !(Array.isArray(child) && child.every(isPrimitive));
          return (
            <div
              key={key}
              className={
                nested
                  ? "grid gap-1"
                  : "grid grid-cols-[minmax(5.5rem,9rem)_minmax(0,1fr)] gap-3"
              }
            >
              <dt className="text-ink-3" title={key}>
                {labelFor(key)}
              </dt>
              <dd
                className={cn(
                  "min-w-0 text-ink",
                  nested && "border-l border-line-strong pl-3",
                )}
              >
                <Node value={child} />
              </dd>
            </div>
          );
        })}
      </dl>
    );
  }

  return <Leaf value={value} />;
}

/** Any JSON value as readable labelled rows: nothing is cut short, nested data is indented. */
export function JsonDetails({
  value,
  className,
}: {
  value: Json;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-sm border bg-sunken/60 p-3 text-[0.8125rem] leading-relaxed",
        className,
      )}
    >
      <Node value={parsed(value)} />
    </div>
  );
}
