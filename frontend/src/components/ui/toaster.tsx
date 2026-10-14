"use client";

import { useToast } from "@/hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

/** Mounted once in the root layout. */
export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastProvider duration={4500} swipeDirection="up">
      {toasts.map(({ id, title, description, variant, duration, open }) => (
        <Toast
          key={id}
          variant={variant}
          duration={duration}
          open={open}
          onOpenChange={(next) => {
            if (!next) dismiss(id);
          }}
        >
          <div className="grid gap-0.5">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
