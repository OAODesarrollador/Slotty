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

function buildTenantImagePathname(tenantSlug: string, file: File, kind: "hero" | "logo") {
  const safeTenant = tenantSlug.replace(/[^a-z0-9-_]/gi, "-").toLowerCase();
  const randomId = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

  return `tenants/${safeTenant}/${kind}-${Date.now()}-${randomId}${getExtension(file.name)}`;
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
    const heroFileInput = form.elements.namedItem("heroImageFile") as HTMLInputElement | null;
    const logoFileInput = form.elements.namedItem("logoImageFile") as HTMLInputElement | null;
    const heroFile = heroFileInput?.files?.[0] ?? null;
    const logoFile = logoFileInput?.files?.[0] ?? null;
    const filesToUpload = [
      { file: logoFile, kind: "logo" as const, urlInputName: "logoUrl", fileInput: logoFileInput },
      { file: heroFile, kind: "hero" as const, urlInputName: "heroImageUrl", fileInput: heroFileInput }
    ].filter((item): item is {
      file: File;
      kind: "hero" | "logo";
      urlInputName: "logoUrl" | "heroImageUrl";
      fileInput: HTMLInputElement | null;
    } => item.file !== null);

    if (filesToUpload.length === 0) {
      setIsSubmitting(true);
      return;
    }

    event.preventDefault();
    setUploadError(null);

    for (const item of filesToUpload) {
      if (!item.file.type.startsWith("image/")) {
        setUploadError("Los archivos seleccionados deben ser imagenes.");
        return;
      }
    }

    setIsUploading(true);

    try {
      for (const item of filesToUpload) {
        const blob = await upload(buildTenantImagePathname(tenantSlug, item.file, item.kind), item.file, {
          access: "public",
          contentType: item.file.type || undefined,
          handleUploadUrl: `/api/owner/${tenantSlug}/hero-upload`,
          multipart: true
        });

        const urlInput = form.elements.namedItem(item.urlInputName) as HTMLInputElement | null;
        if (urlInput) {
          urlInput.value = blob.url;
        }

        if (item.fileInput) {
          item.fileInput.disabled = true;
        }
      }

      isResubmittingRef.current = true;
      setIsSubmitting(true);
      form.requestSubmit();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "No se pudieron subir las imagenes.");
      setIsUploading(false);
    }
  }

  return (
    <>
      <form ref={formRef} method="post" action={action} className="stack" style={{ gap: 14 }} onSubmit={handleSubmit}>
        {children}
        {uploadError ? <div className="notice error">{uploadError}</div> : null}
        {isUploading ? <div className="notice">Subiendo imagenes...</div> : null}
      </form>
      <AdminSubmitOverlay active={isUploading || isSubmitting} />
    </>
  );
}
