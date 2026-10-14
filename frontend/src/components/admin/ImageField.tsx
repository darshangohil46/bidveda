"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImageIcon, Loader2, Upload } from "lucide-react";
import { StoredImage } from "@/components/admin/StoredImage";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { adminService } from "@/services/admin.service";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_MB } from "@/utils/constant";
import { getErrorMessage } from "@/utils/general";

interface ImageFieldProps {
  id: string;
  label: string;
  /** Name of the saved picture, or an empty value when there is none. */
  value: unknown;
  onChange: (name: string) => void;
  disabled?: boolean;
  invalid?: boolean;
}

const IMAGE_MIME_TYPES = ACCEPTED_IMAGE_TYPES.split(",");

function problemWith(file: File): string | null {
  if (!IMAGE_MIME_TYPES.includes(file.type))
    return `${file.name}: only PNG, JPG and WebP images are allowed.`;
  if (file.size > MAX_IMAGE_MB * 1024 * 1024)
    return `${file.name} is over ${MAX_IMAGE_MB} MB.`;
  return null;
}

/** Pick a picture; it uploads straight away and the form keeps only the saved file's name. */
export function ImageField({
  id,
  label,
  value,
  onChange,
  disabled,
  invalid,
}: ImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { error } = useToast();
  const [busy, setBusy] = useState(false);
  // The file just picked, shown at once so nobody waits on a round trip to see it.
  const [local, setLocal] = useState<{
    url: string;
    name: string | null;
  } | null>(null);

  const name = typeof value === "string" && value ? value : null;
  const localUrl =
    local && (local.name === null || local.name === name) ? local.url : null;

  useEffect(() => {
    if (!local) return;
    return () => URL.revokeObjectURL(local.url);
  }, [local]);

  async function pick(file: File | undefined) {
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;

    const problem = problemWith(file);
    if (problem) {
      error("Can't use this image", problem);
      return;
    }

    setLocal({ url: URL.createObjectURL(file), name: null });
    setBusy(true);
    try {
      const uploaded = await adminService.uploadImage(file);
      setLocal((current) =>
        current ? { ...current, name: uploaded.name } : current,
      );
      onChange(uploaded.name);
    } catch (caught) {
      setLocal(null);
      error("Could not upload the image", getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    setLocal(null);
    onChange("");
  }

  return (
    <div className="flex items-center gap-4 py-1">
      <div
        className={`relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-sm border bg-sunken text-ink-3 ${
          invalid ? "border-rust" : "border-line-strong"
        }`}
      >
        {localUrl ? (
          <Image
            src={localUrl}
            alt={label}
            fill
            unoptimized
            sizes="80px"
            className="object-cover"
          />
        ) : name ? (
          <StoredImage
            name={name}
            alt={label}
            className="size-full rounded-none border-0"
          />
        ) : (
          <ImageIcon aria-hidden className="size-6" />
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-card/70">
            <Loader2
              aria-label="Uploading"
              className="size-5 animate-spin text-ink-2"
            />
          </span>
        )}
      </div>

      {!disabled && (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES}
            className="sr-only"
            onChange={(event) => pick(event.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <Upload />
            {name ? "Replace image" : "Upload image"}
          </Button>
          {name && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={remove}
            >
              Remove
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
