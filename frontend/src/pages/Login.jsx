import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { validateEmail, apiFieldErrors } from "../utils/validation";
import { getToken, storeSession } from "../utils/authStorage";

function Login() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: "", password: "" });
    const [touched, setTouched] = useState({});
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const requestLockRef = useRef(false);
    const emailError = validateEmail(form.email);
    const passwordError = !form.password ? "Password is required" : form.password.length > 100 ? "Password is too long" : "";
    const valid = !emailError && !passwordError;

    useEffect(() => { if (getToken()) navigate("/dashboard", { replace: true }); }, [navigate]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setMessage("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setTouched({ email: true, password: true });
        if (!valid || loading || requestLockRef.current) return;
        requestLockRef.current = true;
        setLoading(true);
        try {
            const response = await api.post("/auth/login", { email: form.email.trim().toLowerCase(), password: form.password });
            storeSession(response.data.token, response.data.user);
            navigate("/dashboard", { replace: true, state: { showWelcome: true, creatorName: response.data.user.name } });
        } catch (error) {
            const fields = apiFieldErrors(error);
            if (Object.keys(fields).length) setTouched((current) => ({ ...current, ...Object.fromEntries(Object.keys(fields).map((key) => [key, true])) }));
            setMessage(error.response?.data?.message || "Login failed. Please try again.");
        } finally { requestLockRef.current = false; setLoading(false); }
    };

    return (
        <main className="auth-page"><div className="auth-card">
            <div className="auth-brand"><Link to="/" aria-label="WCase home"><img src="/wcase-logo.png" alt="WCase" /></Link></div>
            <div className="auth-heading"><h1>Welcome back</h1><p>Login to manage your portfolio and showcase your work.</p></div>
            {message && <div className="message-box error-message" role="alert">{message}</div>}
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
                <div><label htmlFor="login-email">Email</label><input id="login-email" className={`form-input ${touched.email && emailError ? "input-error" : ""}`} type="email" name="email" value={form.email} onChange={handleChange} onBlur={() => setTouched((value) => ({ ...value, email: true }))} maxLength={150} autoComplete="email" placeholder="you@example.com" aria-invalid={Boolean(touched.email && emailError)} aria-describedby={touched.email && emailError ? "login-email-error" : undefined}/>{touched.email && emailError && <p id="login-email-error" className="field-error">{emailError}</p>}</div>
                <div><label htmlFor="login-password">Password</label><div className="password-field"><input id="login-password" className={`form-input ${touched.password && passwordError ? "input-error" : ""}`} type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={handleChange} onBlur={() => setTouched((value) => ({ ...value, password: true }))} maxLength={100} autoComplete="current-password" placeholder="Enter your password" aria-invalid={Boolean(touched.password && passwordError)} aria-describedby={touched.password && passwordError ? "login-password-error" : undefined}/><button type="button" aria-label={`${showPassword ? "Hide" : "Show"} password`} aria-pressed={showPassword} onClick={() => setShowPassword((v) => !v)}>{showPassword ? "Hide" : "Show"}</button></div>{touched.password && passwordError && <p id="login-password-error" className="field-error">{passwordError}</p>}</div>
                <button className="btn-primary auth-submit" type="submit" disabled={!valid || loading}>{loading ? "Logging in..." : "Login"}</button>
            </form>
            <p className="auth-footer"><Link to="/forgot-password">Forgot password?</Link></p>
            <p className="auth-footer">Don't have an account? <Link to="/register">Create account</Link></p>
        </div></main>
    );
}
export default Login;
