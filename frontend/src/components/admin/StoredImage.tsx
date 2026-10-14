"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { adminService } from "@/services/admin.service";
import { cn } from "@/lib/utils";

interface StoredImageProps {
  /** File name saved on the record (what the upload returned). */
  name: string;
  alt: string;
  className?: string;
}

/** A picture from the admin upload store. Shows a quiet placeholder while it loads or if it is missing. */
export function StoredImage({ name, alt, className }: StoredImageProps) {
  const [loaded, setLoaded] = useState<{
    name: string;
    url: string | null;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;
    adminService
      .image(name, controller.signal)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setLoaded({ name, url: objectUrl });
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoaded({ name, url: null });
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [name]);

  const url = loaded?.name === name ? loaded.url : null;

  return (
    <span
      className={cn(
        "relative inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-line-strong bg-sunken text-ink-3",
        className,
      )}
    >
      {url ? (
        // The bytes were fetched with the admin token and live in a blob: URL, so there is nothing to optimise.
        <Image
          src={url}
          alt={alt}
          fill
          unoptimized
          sizes="96px"
          className="object-cover"
        />
      ) : (
        <ImageIcon aria-hidden className="size-1/2" />
      )}
    </span>
  );
}
