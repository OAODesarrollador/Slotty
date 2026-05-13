"use client";

import { useEffect, useState } from "react";

type BarberPhotoInputProps = {
  name?: string;
  currentPhotoUrl?: string | null;
  variant?: "default" | "avatar";
  label?: string;
};

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="admin-photo-input__icon">
      <path
        d="M9 4h6l1.4 2H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.6L9 4Zm3 14a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-2a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function BarberPhotoInput({ name = "photo", currentPhotoUrl, variant = "default", label = "Editar foto" }: BarberPhotoInputProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const displayUrl = previewUrl ?? currentPhotoUrl ?? null;

  const input = (
    <input
      name={name}
      type="file"
      accept="image/*"
      onChange={(event) => {
        const file = event.currentTarget.files?.[0] ?? null;
        setPreviewUrl((current) => {
          if (current) {
            URL.revokeObjectURL(current);
          }

          return file ? URL.createObjectURL(file) : null;
        });
      }}
    />
  );

  if (variant === "avatar") {
    return (
      <label className="admin-photo-input admin-photo-input--avatar">
        <span className="admin-photo-input__avatar-wrap">
          {displayUrl ? (
            <img src={displayUrl} alt="Vista previa de la foto del barbero" className="admin-photo-input__avatar" />
          ) : (
            <span className="admin-photo-input__avatar-placeholder">Sin foto</span>
          )}
          <span className="admin-photo-input__edit" aria-hidden="true">
            <CameraIcon />
          </span>
        </span>
        <span className="admin-photo-input__edit-text">{label}</span>
        {input}
      </label>
    );
  }

  return (
    <label className="admin-photo-input">
      <span>Foto</span>
      <div className="admin-photo-input__row">
        {displayUrl ? (
          <img src={displayUrl} alt="Vista previa de la foto del barbero" className="admin-photo-input__preview" />
        ) : (
          <span className="admin-photo-input__placeholder">Sin foto</span>
        )}
        {input}
      </div>
    </label>
  );
}
