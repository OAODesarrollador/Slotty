"use client";

import { useState } from "react";

type AppointmentReceiptActionsProps = {
  downloadUrl: string;
  filename: string;
  shareTitle: string;
  shareText: string;
  fallbackSharePath: string;
};

function buildAbsoluteUrl(path: string) {
  if (typeof window === "undefined") {
    return path;
  }

  return new URL(path, window.location.origin).toString();
}

export function AppointmentReceiptActions({
  downloadUrl,
  filename,
  shareTitle,
  shareText,
  fallbackSharePath
}: AppointmentReceiptActionsProps) {
  const [busyAction, setBusyAction] = useState<"save" | "share" | null>(null);
  const [feedback, setFeedback] = useState("");

  const setTransientFeedback = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(""), 2600);
  };

  const fetchReceiptBlob = async () => {
    const response = await fetch(downloadUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("No se pudo generar el comprobante.");
    }

    return response.blob();
  };

  const handleSave = async () => {
    setBusyAction("save");

    try {
      const blob = await fetchReceiptBlob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
      setTransientFeedback("El comprobante se esta guardando en tu dispositivo.");
    } catch {
      setTransientFeedback("No pudimos guardar el comprobante. Volve a intentarlo.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleShare = async () => {
    setBusyAction("share");

    try {
      const blob = await fetchReceiptBlob();
      const absoluteShareUrl = buildAbsoluteUrl(fallbackSharePath);
      const file = new File([blob], filename, { type: "application/pdf" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          files: [file]
        });
        setFeedback("");
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: absoluteShareUrl
        });
        setFeedback("");
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(absoluteShareUrl);
        setTransientFeedback("Copiamos el link de tu reserva para que puedas compartirlo.");
        return;
      }

      window.open(absoluteShareUrl, "_blank", "noopener,noreferrer");
      setTransientFeedback("Abrimos el link de tu reserva para que puedas compartirlo.");
    } catch {
      setTransientFeedback("No pudimos compartir el comprobante en este momento.");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div
        className="card"
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid var(--line)",
          borderRadius: "24px",
          padding: "18px"
        }}
      >
        <div className="stack" style={{ gap: 10 }}>
          <strong style={{ fontSize: "1rem", color: "white" }}>Comprobante de reserva</strong>
          <small className="muted" style={{ fontSize: "0.82rem" }}>
            Guardalo en tu dispositivo o compartilo desde tu celular cuando lo necesites.
          </small>
          <div className="stack" style={{ gap: 10 }}>
            <button
              type="button"
              className="btn"
              onClick={handleSave}
              disabled={busyAction !== null}
              style={{ minHeight: "54px" }}
            >
              {busyAction === "save" ? "Preparando comprobante..." : "Guardar comprobante"}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={handleShare}
              disabled={busyAction !== null}
              style={{
                minHeight: "54px",
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.92)"
              }}
            >
              {busyAction === "share" ? "Preparando para compartir..." : "Compartir comprobante"}
            </button>
          </div>
          {feedback ? (
            <small style={{ color: "var(--accent)", fontSize: "0.78rem", fontWeight: 700 }}>{feedback}</small>
          ) : null}
        </div>
      </div>
    </div>
  );
}
