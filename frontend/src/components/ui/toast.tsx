"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { Toast as ToastPrimitives } from "radix-ui";
import { cn } from "@/lib/utils";

const ToastProvider = ToastPrimitives.Provider;

/** Upper centre of the page, as required by rules.txt. */
function ToastViewport({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitives.Viewport>) {
  return (
    <ToastPrimitives.Viewport
      className={cn(
        "fixed top-0 left-1/2 z-100 flex max-h-screen w-full -translate-x-1/2 flex-col gap-2 p-4 outline-none sm:max-w-104",
        className,
      )}
      {...props}
    />
  );
}

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-sm border bg-card p-4 pr-9 text-card-foreground shadow-[0_8px_24px_rgba(28,27,24,0.08)] transition-all data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-top-2 data-[state=open]:animate-in data-[state=open]:slide-in-from-top-2 data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-(--radix-toast-swipe-end-x) data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x) data-[swipe=move]:transition-none",
  {
    variants: {
      variant: {
        default: "border-line",
        success: "border-pine/40 border-l-4 border-l-pine",
        destructive: "border-rust/40 border-l-4 border-l-rust",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Toast({
  className,
  variant,
  ...props
}: React.ComponentProps<typeof ToastPrimitives.Root> &
  VariantProps<typeof toastVariants>) {
  return (
    <ToastPrimitives.Root
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  );
}

function ToastClose({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitives.Close>) {
  return (
    <ToastPrimitives.Close
      aria-label="Dismiss"
      className={cn(
        "absolute top-2.5 right-2.5 rounded-sm p-1 text-ink-3 transition-colors hover:bg-sunken hover:text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className,
      )}
      toast-close=""
      {...props}
    >
      <X className="size-4" />
    </ToastPrimitives.Close>
  );
}

function ToastTitle({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitives.Title>) {
  return (
    <ToastPrimitives.Title
      className={cn("text-sm font-medium text-ink", className)}
      {...props}
    />
  );
}

function ToastDescription({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitives.Description>) {
  return (
    <ToastPrimitives.Description
      className={cn("text-[0.8125rem] text-ink-2", className)}
      {...props}
    />
  );
}

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastClose,
  ToastTitle,
  ToastDescription,
};
