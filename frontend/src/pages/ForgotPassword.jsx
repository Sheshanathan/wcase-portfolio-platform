import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { apiFieldErrors, validateEmail } from "../utils/validation";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [requestError, setRequestError] = useState("");
    const [serverFieldError, setServerFieldError] = useState("");
    const [loading, setLoading] = useState(false);
    const [touched, setTouched] = useState(false);
    const lock = useRef(false);
    const validationError = validateEmail(email);
    const visibleFieldError = touched ? validationError || serverFieldError : "";

    const submit = async (event) => {
        event.preventDefault();
        setTouched(true);
        setServerFieldError("");
        setRequestError("");
        if (validationError || lock.current) return;
        lock.current = true;
        setLoading(true);
        try {
            const { data } = await api.post("/auth/forgot-password", { email: email.trim().toLowerCase() });
            setMessage(data.message);
        } catch (error) {
            const fields = apiFieldErrors(error);
            if (fields.email) setServerFieldError(fields.email);
            else setRequestError(error.response?.data?.message || "Password reset request failed. Please try again.");
        } finally {
            lock.current = false;
            setLoading(false);
        }
    };

    return <main className="auth-page"><div className="auth-card">
        <div className="auth-brand"><Link to="/" aria-label="WCase home"><img src="/wcase-logo.png" alt="WCase"/></Link></div>
        <div className="auth-heading"><h1>Reset your password</h1><p>Enter the email address registered to your WCase account.</p></div>
        {message ? <div className="message-box success-message" role="status">{message}</div> : <form className="auth-form" onSubmit={submit} noValidate>
            {requestError && <div className="message-box error-message" role="alert">{requestError}</div>}
            <div><label htmlFor="forgot-email">Email</label><input id="forgot-email" className={`form-input ${visibleFieldError ? "input-error" : ""}`} type="email" value={email} maxLength={150} autoComplete="email" onChange={(event) => { setEmail(event.target.value); setServerFieldError(""); setRequestError(""); }} onBlur={() => setTouched(true)} aria-invalid={Boolean(visibleFieldError)} aria-describedby={visibleFieldError ? "forgot-email-error" : undefined}/>{visibleFieldError && <p id="forgot-email-error" className="field-error" role="alert">{visibleFieldError}</p>}</div>
            <button className="btn-primary auth-submit" disabled={loading || !!validationError}>{loading ? "Sending..." : "Send reset link"}</button>
        </form>}
        <p className="auth-footer"><Link to="/login">Back to login</Link></p>
    </div></main>;
}
