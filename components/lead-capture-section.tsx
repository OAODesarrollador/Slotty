"use client";

import { FormEvent, useMemo, useState } from "react";
import styles from "./lead-capture-section.module.css";

type FormValues = {
  name: string;
  whatsapp: string;
  businessName: string;
  email: string;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

type SubmitState = "idle" | "submitting" | "success" | "error";

const INITIAL_VALUES: FormValues = {
  name: "",
  whatsapp: "",
  businessName: "",
  email: ""
};

const FORM_ENDPOINT = "https://formspree.io/f/xkgjelby";

function normalizeArgentineWhatsApp(value: string) {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("549")) digits = digits.slice(3);
  else if (digits.startsWith("54")) {
    digits = digits.slice(2);
    if (digits.startsWith("9")) digits = digits.slice(1);
  }

  if (digits.startsWith("0")) digits = digits.slice(1);

  if (/^\d{10}$/.test(digits)) return digits;

  for (const areaLength of [2, 3, 4]) {
    const areaCode = digits.slice(0, areaLength);
    const remainder = digits.slice(areaLength);

    if (!remainder.startsWith("15")) continue;

    const localNumber = remainder.slice(2);
    if (localNumber.length >= 6 && localNumber.length <= 8 && areaCode.length + localNumber.length === 10) {
      return `${areaCode}${localNumber}`;
    }
  }

  return null;
}

export function LeadCaptureSection() {
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");

  const isSubmitting = submitState === "submitting";

  const feedbackClassName = useMemo(() => {
    if (submitState === "success") return `${styles.feedback} ${styles.feedbackSuccess}`;
    if (submitState === "error") return `${styles.feedback} ${styles.feedbackError}`;
    return styles.feedback;
  }, [submitState]);

  const validate = (nextValues: FormValues) => {
    const nextErrors: FormErrors = {};
    const normalizedWhatsApp = normalizeArgentineWhatsApp(nextValues.whatsapp);

    if (!nextValues.name.trim()) nextErrors.name = "Ingresá tu nombre.";
    if (!nextValues.whatsapp.trim()) nextErrors.whatsapp = "Ingresá tu WhatsApp.";
    else if (!normalizedWhatsApp) nextErrors.whatsapp = "Ingresá un WhatsApp argentino válido. Ej: +54 9 11 2345 6789.";
    if (!nextValues.businessName.trim()) nextErrors.businessName = "Ingresá el nombre del negocio.";

    if (nextValues.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(nextValues.email.trim())) {
        nextErrors.email = "Ingresá un email válido.";
      }
    }

    return { nextErrors, normalizedWhatsApp };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const { nextErrors, normalizedWhatsApp } = validate(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || !normalizedWhatsApp) {
      setSubmitState("error");
      setMessage("Revisá los campos marcados para continuar.");
      return;
    }

    setSubmitState("submitting");
    setMessage("");

    try {
      const payload = {
        nombre: values.name.trim(),
        whatsapp: normalizedWhatsApp,
        negocio: values.businessName.trim(),
        email: values.email.trim(),
        fuente: "Landing Slotty"
      };

      const response = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("submission_failed");
      }

      setValues(INITIAL_VALUES);
      setErrors({});
      setSubmitState("success");
      setMessage("Recibimos tus datos. Te contactamos pronto para mostrarte Dibok en tu negocio.");
    } catch {
      setSubmitState("error");
      setMessage("No pudimos enviar el formulario. Probá de nuevo en unos minutos.");
    }
  };

  const handleChange = (field: keyof FormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });

    if (submitState !== "idle") {
      setSubmitState("idle");
      setMessage("");
    }
  };

  return (
    <section id="start" className={styles.section} data-animate>
      <div className={styles.shell}>
        <div className={styles.contentColumn}>
          <div className={styles.header}>
            <span className={styles.eyebrow}>EMPEZÁ CON DIBOK</span>
            <h2 className={styles.title}>Dejanos tus datos y te mostramos cómo funciona en tu negocio</h2>
            <p className={styles.subtitle}>
              Completá este formulario y te contactamos para mostrarte cómo implementar Dibok de forma simple.
            </p>
          </div>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="lead-name">Nombre</label>
            <input
              id="lead-name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Tu nombre"
              className={`${styles.input} ${errors.name ? styles.inputError : ""}`}
              value={values.name}
              onChange={(event) => handleChange("name", event.target.value)}
              aria-invalid={errors.name ? "true" : "false"}
              aria-describedby={errors.name ? "lead-name-error" : undefined}
              disabled={isSubmitting}
            />
            {errors.name ? <span id="lead-name-error" className={styles.errorText}>{errors.name}</span> : null}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="lead-whatsapp">WhatsApp</label>
            <input
              id="lead-whatsapp"
              name="whatsapp"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="+54 9 11 2345 6789"
              className={`${styles.input} ${errors.whatsapp ? styles.inputError : ""}`}
              value={values.whatsapp}
              onChange={(event) => handleChange("whatsapp", event.target.value)}
              aria-invalid={errors.whatsapp ? "true" : "false"}
              aria-describedby={errors.whatsapp ? "lead-whatsapp-error" : undefined}
              disabled={isSubmitting}
            />
            {errors.whatsapp ? <span id="lead-whatsapp-error" className={styles.errorText}>{errors.whatsapp}</span> : null}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="lead-business">Nombre del negocio</label>
            <input
              id="lead-business"
              name="businessName"
              type="text"
              autoComplete="organization"
              placeholder="Nombre de tu negocio"
              className={`${styles.input} ${errors.businessName ? styles.inputError : ""}`}
              value={values.businessName}
              onChange={(event) => handleChange("businessName", event.target.value)}
              aria-invalid={errors.businessName ? "true" : "false"}
              aria-describedby={errors.businessName ? "lead-business-error" : undefined}
              disabled={isSubmitting}
            />
            {errors.businessName ? <span id="lead-business-error" className={styles.errorText}>{errors.businessName}</span> : null}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="lead-email">Email <span className={styles.optional}>(opcional)</span></label>
            <input
              id="lead-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="tunombre@negocio.com"
              className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
              value={values.email}
              onChange={(event) => handleChange("email", event.target.value)}
              aria-invalid={errors.email ? "true" : "false"}
              aria-describedby={errors.email ? "lead-email-error" : undefined}
              disabled={isSubmitting}
            />
            {errors.email ? <span id="lead-email-error" className={styles.errorText}>{errors.email}</span> : null}
          </div>

          <div className={styles.actions}>
            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
              {isSubmitting ? "Enviando..." : "Quiero empezar"}
            </button>
            <p className={styles.microcopy}>Sin compromiso</p>
          </div>

          {message ? (
            <p className={feedbackClassName} role="status" aria-live="polite">
              {message}
            </p>
          ) : null}
        </form>
      </div>
    </section>
  );
}
