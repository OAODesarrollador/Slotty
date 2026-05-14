"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { upload } from "@vercel/blob/client";
import { AdminSubmitOverlay } from "@/components/admin-submit-feedback";

type AdminCompanySettingsFormProps = {
  tenantSlug: string;
  action: string;
  children: ReactNode;
};

function getExtension(fileName: string) {
  const match = fileName.match(/\.[a-z0-9]+$/i);
  return match?.[0]?.toLowerCase() ?? ".jpg";
}

function buildHeroPathname(tenantSlug: string, file: File) {
  const safeTenant = tenantSlug.replace(/[^a-z0-9-_]/gi, "-").toLowerCase();
  const randomId = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

  return `tenants/${safeTenant}/${Date.now()}-${randomId}${getExtension(file.name)}`;
}

export function AdminCompanySettingsForm({ tenantSlug, action, children }: AdminCompanySettingsFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const isResubmittingRef = useRef(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (isResubmittingRef.current) {
      setIsSubmitting(true);
      return;
    }

    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("heroImageFile") as HTMLInputElement | null;
    const file = fileInput?.files?.[0] ?? null;

    if (!file) {
      setIsSubmitting(true);
      return;
    }

    event.preventDefault();
    setUploadError(null);

    if (!file.type.startsWith("image/")) {
      setUploadError("El archivo seleccionado debe ser una imagen.");
      return;
    }

    setIsUploading(true);

    try {
      const blob = await upload(buildHeroPathname(tenantSlug, file), file, {
        access: "public",
        contentType: file.type || undefined,
        handleUploadUrl: `/api/owner/${tenantSlug}/hero-upload`,
        multipart: true
      });

      const heroUrlInput = form.elements.namedItem("heroImageUrl") as HTMLInputElement | null;
      if (heroUrlInput) {
        heroUrlInput.value = blob.url;
      }

      if (fileInput) {
        fileInput.disabled = true;
      }

      isResubmittingRef.current = true;
      setIsSubmitting(true);
      form.requestSubmit();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "No se pudo subir la foto de fondo.");
      setIsUploading(false);
    }
  }

  return (
    <>
      <form ref={formRef} method="post" action={action} className="stack" style={{ gap: 14 }} onSubmit={handleSubmit}>
        {children}
        {uploadError ? <div className="notice error">{uploadError}</div> : null}
        {isUploading ? <div className="notice">Subiendo foto de fondo...</div> : null}
      </form>
      <AdminSubmitOverlay active={isUploading || isSubmitting} />
    </>
  );
}
