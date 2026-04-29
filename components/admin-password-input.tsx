"use client";

type AdminPasswordInputProps = {
  password: string;
  passwordConfirm?: string;
  visible: boolean;
  required?: boolean;
  confirmRequired?: boolean;
  label?: string;
  confirmLabel?: string;
  placeholder?: string;
  confirmPlaceholder?: string;
  onPasswordChange: (value: string) => void;
  onPasswordConfirmChange?: (value: string) => void;
  onToggleVisible: () => void;
};

export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
export const PASSWORD_HELP = "Minimo 8 caracteres, una mayuscula, una minuscula, un numero y un simbolo.";

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="admin-password-field__icon">
      {visible ? (
        <>
          <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M10.58 10.58a2 2 0 0 0 2.84 2.84" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M9.88 5.09A9.8 9.8 0 0 1 12 4.86c5.4 0 9 5.14 9 7.14a5.5 5.5 0 0 1-1.22 2.62M6.61 6.61C4.42 8 3 10.57 3 12c0 2 3.6 7.14 9 7.14 1.46 0 2.78-.38 3.92-.99" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      ) : (
        <>
          <path d="M3 12c0-2 3.6-7.14 9-7.14S21 10 21 12s-3.6 7.14-9 7.14S3 14 3 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="2" fill="none" />
        </>
      )}
    </svg>
  );
}

export function getPasswordRules(password: string, passwordConfirm?: string) {
  const shouldCheckMatch = typeof passwordConfirm === "string";
  const passwordsMatch = password.length > 0 && password === passwordConfirm;
  const matchIsMet = password.length === 0 && !passwordConfirm ? true : passwordsMatch;

  return [
    { label: "Minimo 8 caracteres", met: password.length >= 8 },
    { label: "Una letra mayuscula", met: /[A-Z]/.test(password) },
    { label: "Una letra minuscula", met: /[a-z]/.test(password) },
    { label: "Un numero", met: /\d/.test(password) },
    { label: "Un simbolo", met: /[^A-Za-z\d]/.test(password) },
    ...(shouldCheckMatch ? [{ label: "Las contrasenas coinciden", met: matchIsMet }] : [])
  ];
}

export function AdminPasswordInput({
  password,
  passwordConfirm,
  visible,
  required = false,
  confirmRequired = false,
  label = "Contraseña",
  confirmLabel = "Repetir contraseña",
  placeholder,
  confirmPlaceholder,
  onPasswordChange,
  onPasswordConfirmChange,
  onToggleVisible
}: AdminPasswordInputProps) {
  const passwordRules = getPasswordRules(password, passwordConfirm);

  return (
    <>
      <label>
        {label}
        <span className="admin-password-field">
          <input
            name="password"
            type={visible ? "text" : "password"}
            required={required}
            minLength={8}
            pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}"
            title={PASSWORD_HELP}
            value={password}
            placeholder={placeholder}
            onChange={(event) => onPasswordChange(event.target.value)}
            autoComplete="new-password"
          />
          <button type="button" className="admin-password-field__button" aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={onToggleVisible}>
            <EyeIcon visible={visible} />
          </button>
        </span>
      </label>

      {typeof passwordConfirm === "string" && onPasswordConfirmChange ? (
        <label>
          {confirmLabel}
          <span className="admin-password-field">
            <input
              name="passwordConfirm"
              type={visible ? "text" : "password"}
              required={confirmRequired}
              minLength={8}
              value={passwordConfirm}
              placeholder={confirmPlaceholder}
              onChange={(event) => onPasswordConfirmChange(event.target.value)}
              autoComplete="new-password"
            />
            <button type="button" className="admin-password-field__button" aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={onToggleVisible}>
              <EyeIcon visible={visible} />
            </button>
          </span>
        </label>
      ) : null}

      {(password.length > 0 || required) ? (
        <ul className="admin-password-rules" aria-label="Requisitos de contraseña">
          {passwordRules.map((rule) => (
            <li key={rule.label} className={rule.met ? "is-met" : "is-pending"}>
              <span aria-hidden="true">{rule.met ? "✓" : "!"}</span>
              {rule.label}
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
