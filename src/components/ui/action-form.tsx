"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef, type FormEvent, type ReactNode } from "react";
import type { ActionState } from "@/lib/types";
import { Alert } from "@/components/ui/card";

const PendingContext = createContext<boolean | null>(null);

/** Status pending dari ActionForm terdekat (null jika tidak di dalam ActionForm). */
export function useActionFormPending() {
  return useContext(PendingContext);
}

type Props = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode | ((state: ActionState) => ReactNode);
  className?: string;
  /** Kosongkan form setelah berhasil. */
  resetOnSuccess?: boolean;
  showMessage?: boolean;
};

/**
 * Form untuk Server Action yang mengembalikan ActionState.
 * Isian form tidak dikosongkan saat gagal, sehingga pengguna tidak perlu mengetik ulang.
 */
export function ActionForm({ action, children, className, resetOnSuccess, showMessage = true }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && resetOnSuccess) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const formData = new FormData(e.currentTarget, submitter);
    startTransition(() => formAction(formData));
  }

  return (
    <PendingContext.Provider value={pending}>
      <form ref={formRef} onSubmit={handleSubmit} className={className}>
        {showMessage && state.message && (
          <Alert tone={state.ok ? "success" : "error"} className="mb-4">
            {state.message}
          </Alert>
        )}
        {typeof children === "function" ? children(state) : children}
      </form>
    </PendingContext.Provider>
  );
}
