"use client";

import { useEffect } from "react";

type ValidatableField = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const ERROR_CLASS = "admin-field-error";
const TOUCHED_ATTR = "data-admin-touched";
const BOUND_ATTR = "data-admin-validation-bound";

function isValidatableField(element: Element): element is ValidatableField {
  if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement)) {
    return false;
  }

  if (element.disabled) {
    return false;
  }

  if ((element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) && element.readOnly) {
    return false;
  }

  if (element instanceof HTMLInputElement) {
    return !["hidden", "submit", "button", "reset"].includes(element.type);
  }

  return true;
}

function getFieldLabel(field: ValidatableField) {
  const label = field.closest("label");
  if (!label) {
    return "Este campo";
  }

  const text = Array.from(label.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent?.trim() ?? "")
    .join(" ")
    .trim();

  return text || "Este campo";
}

function getErrorAnchor(field: ValidatableField) {
  return field.closest(".admin-password-field") ?? field;
}

function getOrCreateError(field: ValidatableField) {
  const anchor = getErrorAnchor(field);
  const next = anchor.nextElementSibling;
  if (next?.classList.contains(ERROR_CLASS)) {
    return next as HTMLElement;
  }

  const error = document.createElement("small");
  error.className = ERROR_CLASS;
  error.setAttribute("aria-live", "polite");
  anchor.insertAdjacentElement("afterend", error);
  return error;
}

function clearFieldError(field: ValidatableField) {
  field.removeAttribute("aria-invalid");
  const anchor = getErrorAnchor(field);
  const next = anchor.nextElementSibling;
  if (next?.classList.contains(ERROR_CLASS)) {
    next.remove();
  }
}

function fieldValue(field: ValidatableField) {
  if (field instanceof HTMLInputElement && field.type === "checkbox") {
    return field.checked ? "on" : "";
  }

  return field.value.trim();
}

function getFieldError(field: ValidatableField) {
  const value = fieldValue(field);
  const label = getFieldLabel(field);

  if (field.required && !value) {
    return `${label} es obligatorio.`;
  }

  if (!value) {
    return "";
  }

  if (field instanceof HTMLInputElement) {
    if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return "Ingresá un email válido.";
    }

    if (field.type === "number") {
      const numberValue = Number(value);
      if (!Number.isFinite(numberValue)) {
        return `${label} debe ser un número válido.`;
      }

      if (field.min !== "" && numberValue < Number(field.min)) {
        return `${label} debe ser mayor o igual a ${field.min}.`;
      }

      if (field.max !== "" && numberValue > Number(field.max)) {
        return `${label} debe ser menor o igual a ${field.max}.`;
      }
    }

    if (field.minLength > -1 && value.length < field.minLength) {
      return `${label} debe tener al menos ${field.minLength} caracteres.`;
    }

    if (field.pattern) {
      const pattern = new RegExp(`^(?:${field.pattern})$`);
      if (!pattern.test(value)) {
        return field.title || `${label} no cumple el formato requerido.`;
      }
    }

    if (field.name === "passwordConfirm") {
      const form = field.form;
      const password = form?.elements.namedItem("password");
      if (password instanceof HTMLInputElement && password.value !== field.value) {
        return "Las contraseñas no coinciden.";
      }
    }
  }

  return "";
}

function validateField(field: ValidatableField, force = false) {
  if (!force && !field.hasAttribute(TOUCHED_ATTR) && !fieldValue(field)) {
    clearFieldError(field);
    return true;
  }

  const message = getFieldError(field);
  if (!message) {
    clearFieldError(field);
    return true;
  }

  const error = getOrCreateError(field);
  error.textContent = message;
  field.setAttribute("aria-invalid", "true");
  return false;
}

function getFields(form: HTMLFormElement) {
  return Array.from(form.querySelectorAll("input, select, textarea")).filter(isValidatableField);
}

function validateForm(form: HTMLFormElement) {
  const fields = getFields(form);
  return fields.every((field) => {
    field.setAttribute(TOUCHED_ATTR, "true");
    return validateField(field, true);
  });
}

function bindForm(form: HTMLFormElement) {
  if (form.hasAttribute(BOUND_ATTR)) {
    return;
  }

  form.setAttribute(BOUND_ATTR, "true");
  form.noValidate = true;

  const onSubmit = (event: SubmitEvent) => {
    if (!validateForm(form)) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  form.addEventListener("submit", onSubmit);

  getFields(form).forEach((field) => {
    const onBlur = () => {
      field.setAttribute(TOUCHED_ATTR, "true");
      validateField(field, true);
    };
    const onInput = () => {
      validateField(field);
      if (field.name === "password") {
        const confirmation = form.elements.namedItem("passwordConfirm");
        if (confirmation instanceof Element && isValidatableField(confirmation)) {
          validateField(confirmation);
        }
      }
    };

    field.addEventListener("blur", onBlur);
    field.addEventListener("input", onInput);
    field.addEventListener("change", onInput);
  });
}

export function AdminFormValidation() {
  useEffect(() => {
    const bindAll = () => {
      document.querySelectorAll<HTMLFormElement>(".admin-page form, .admin-modal form").forEach(bindForm);
    };

    bindAll();
    const observer = new MutationObserver(bindAll);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
