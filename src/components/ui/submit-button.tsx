"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";
import { buttonClass } from "@/components/ui/button";
import { useActionFormPending } from "@/components/ui/action-form";

type Props = ComponentProps<"button"> & {
  variant?: Parameters<typeof buttonClass>[0];
  size?: Parameters<typeof buttonClass>[1];
  pendingText?: string;
  /** Tampilkan dialog konfirmasi sebelum submit. */
  confirm?: string;
};

export function SubmitButton({ children, variant, size, className, pendingText, confirm, onClick, disabled, ...props }: Props) {
  const formStatus = useFormStatus();
  const actionFormPending = useActionFormPending();
  const pending = actionFormPending ?? formStatus.pending;

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={buttonClass(variant, size, className)}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      {...props}
    >
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
