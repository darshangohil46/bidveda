import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/utils/constant";

interface LogoProps {
  href?: string;
  /** Mark only, for tight spaces. */
  compact?: boolean;
  className?: string;
}

export function Logo({ href = "/", compact = false, className }: LogoProps) {
  return (
    <Link
      href={href}
      aria-label={`${APP_NAME} home`}
      className={cn(
        "inline-flex items-center gap-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <Image src="/logo-mark.svg" alt="" width={24} height={24} priority />
      {!compact && (
        <span className="font-serif text-[1.3rem] leading-none tracking-tight text-ink">
          {APP_NAME}
        </span>
      )}
    </Link>
  );
}
