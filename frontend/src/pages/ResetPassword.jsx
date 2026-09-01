import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api";
import PasswordField from "../components/PasswordField";
import { apiFieldErrors, validatePassword, validatePasswordConfirmation } from "../utils/validation";

const TOKEN_PATTERN = /^[a-f0-9]{64}$/;

export default function ResetPassword() {
    const { token = "" } = useParams();
    const [state, setState] = useState(() => TOKEN_PATTERN.test(token) ? "checking" : "invalid");
    const [form, setForm] = useState({ password: "", confirmPassword: "" });
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [message, setMessage] = useState("");
    const lock = useRef(false);

    useEffect(() => {
        if (!TOKEN_PATTERN.test(token)) return undefined;
        let active = true;
        api.get(`/auth/reset-password/${encodeURIComponent(token)}`).then(() => active && setState("ready")).catch(() => active && setState("invalid"));
        return () => { active = false; };
    }, [token]);

    const validate = (nextForm) => ({ password: validatePassword(nextForm.password), confirmPassword: validatePasswordConfirmation(nextForm.password, nextForm.confirmPassword) });
    const change = (event) => {
        const nextForm = { ...form, [event.target.name]: event.target.value };
        setForm(nextForm);
        setErrors((current) => ({ ...current, [event.target.name]: "" }));
        setMessage("");
    };
    const submit = async (event) => {
        event.preventDefault();
        const nextErrors = validate(form);
        setTouched({ password: true, confirmPassword: true });
        setErrors(nextErrors);
        if (nextErrors.password || nextErrors.confirmPassword || lock.current) return;
        lock.current = true;
        setState("submitting");
        setMessage("");
        try {
            const { data } = await api.post(`/auth/reset-password/${encodeURIComponent(token)}`, form);
            setMessage(data.message);
            setState("success");
        } catch (error) {
            const fields = apiFieldErrors(error);
            setErrors((current) => ({ ...current, ...fields }));
            setTouched((current) => ({ ...current, ...Object.fromEntries(Object.keys(fields).map((key) => [key, true])) }));
            setMessage(error.response?.data?.message || "Password reset failed. Please try again.");
            setState(error.response?.data?.code ? "invalid" : "ready");
        } finally { lock.current = false; }
    };

    const brand = <div className="auth-brand"><Link to="/" aria-label="WCase home"><img src="/wcase-logo.png" alt="WCase" /></Link></div>;
    if (state === "checking") return <main className="auth-page"><div className="auth-card">{brand}<p role="status">Validating reset link…</p></div></main>;
    if (state === "invalid") return <main className="auth-page"><div className="auth-card">{brand}<h1>Reset link unavailable</h1><p>{message || "This password reset link is invalid, expired, or already used."}</p><Link className="btn-primary" to="/forgot-password">Request a new link</Link></div></main>;
    if (state === "success") return <main className="auth-page"><div className="auth-card">{brand}<h1>Password updated</h1><p>{message}</p><Link className="btn-primary" to="/login">Go to login</Link></div></main>;
    return <main className="auth-page"><div className="auth-card">{brand}
        <div className="auth-heading"><h1 className="reset-password-heading">Choose a new password</h1><p>Use 8–72 characters with at least one letter and one number.</p></div>
        <form className="auth-form" onSubmit={submit} noValidate>
            <PasswordField id="new-password" label="New password" name="password" value={form.password} onChange={change} onBlur={() => setTouched((value) => ({ ...value, password: true }))} error={touched.password ? errors.password : ""}/>
            <PasswordField id="confirm-password" label="Confirm new password" name="confirmPassword" value={form.confirmPassword} onChange={change} onBlur={() => setTouched((value) => ({ ...value, confirmPassword: true }))} error={touched.confirmPassword ? errors.confirmPassword : ""}/>
            {message && <div className="message-box error-message" role="alert">{message}</div>}
            <button className="btn-primary" disabled={state === "submitting"}>{state === "submitting" ? "Updating…" : "Reset password"}</button>
        </form>
    </div></main>;
}
