"use client";

import { type FormEvent, type FormEventHandler, type FormHTMLAttributes, type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type AdminSubmitOverlayProps = {
  active: boolean;
};

type AdminActionFormProps = Omit<FormHTMLAttributes<HTMLFormElement>, "onSubmit"> & {
  children: ReactNode;
  onSubmit?: FormEventHandler<HTMLFormElement>;
};

export function AdminProcessingOverlay() {
  return (
    <div className="admin-processing-backdrop" role="status" aria-live="polite" aria-label="Procesando">
      <div className="admin-processing-spinner" aria-hidden="true">
        <span />
        <span />
      </div>
      <span className="admin-processing-label">Procesando...</span>
    </div>
  );
}

export function AdminSubmitOverlay({ active }: AdminSubmitOverlayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted && active ? createPortal(<AdminProcessingOverlay />, document.body) : null;
}

export function AdminActionForm({ children, onSubmit, ...props }: AdminActionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    onSubmit?.(event);

    if (!event.defaultPrevented) {
      setIsSubmitting(true);
    }
  }

  return (
    <>
      <form {...props} onSubmit={handleSubmit}>
        {children}
      </form>
      <AdminSubmitOverlay active={isSubmitting} />
    </>
  );
}
