"use client";

import { useRef } from "react";
import { FileUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ACCEPTED_FILE_TYPES, MAX_UPLOAD_MB } from "@/utils/constant";
import { formatFileSize } from "@/utils/general";

interface FileUploaderProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

const ALLOWED_EXTENSIONS = ["pdf", "xlsx"];

/** Picks PDF / XLSX files and keeps them in the form until it is submitted. */
export function FileUploader({
  files,
  onChange,
  maxFiles = 5,
  disabled,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { error } = useToast();

  function add(picked: FileList | null) {
    if (!picked) return;
    const accepted: File[] = [];
    for (const file of Array.from(picked)) {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        error(
          "Unsupported file",
          `${file.name}: only PDF and XLSX files are allowed.`,
        );
      } else if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
        error("File too large", `${file.name} is over ${MAX_UPLOAD_MB} MB.`);
      } else {
        accepted.push(file);
      }
    }
    onChange([...files, ...accepted].slice(0, maxFiles));
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="grid gap-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_FILE_TYPES}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => add(event.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        className="h-auto justify-start gap-3 border-dashed px-4 py-3 text-left"
        disabled={disabled || files.length >= maxFiles}
        onClick={() => inputRef.current?.click()}
      >
        <FileUp className="size-5 text-ink-3" />
        <span>
          <span className="block text-[0.8125rem] font-medium text-ink">
            Attach PDF or XLSX files
          </span>
          <span className="block text-[0.75rem] font-normal text-ink-3">
            Up to {maxFiles} files, {MAX_UPLOAD_MB} MB each
          </span>
        </span>
      </Button>

      {files.length > 0 && (
        <ul className="divide-y rounded-sm border bg-card">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-3 px-3 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-ink">
                {file.name}
              </span>
              <span className="t-figure text-[0.75rem] text-ink-3">
                {formatFileSize(file.size)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${file.name}`}
                onClick={() =>
                  onChange(files.filter((_, position) => position !== index))
                }
              >
                <X className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
