import { useState } from "react";

export default function PasswordField({ id, label, name, value, onChange, onBlur, error, autoComplete = "new-password" }) {
    const [visible, setVisible] = useState(false);
    const errorId = `${id}-error`;
    return <div>
        <label htmlFor={id}>{label}</label>
        <div className="password-field"><input id={id} className={`form-input ${error ? "input-error" : ""}`} type={visible ? "text" : "password"} name={name} value={value} onChange={onChange} onBlur={onBlur} maxLength={72} autoComplete={autoComplete} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined}/><button type="button" aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`} aria-pressed={visible} onClick={() => setVisible((value) => !value)}>{visible ? "Hide" : "Show"}</button></div>
        {error && <p id={errorId} className="field-error">{error}</p>}
    </div>;
}
