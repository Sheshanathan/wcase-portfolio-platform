import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import OtpInput from "../components/OtpInput";
import { passwordChecks, validateEmail, validateName, validatePassword, validatePasswordConfirmation, apiFieldErrors } from "../utils/validation";
import { storeSession } from "../utils/authStorage";

const OTP_LENGTH = 6;
const emptyOtp = () => Array(OTP_LENGTH).fill("");
const maskEmail = (email) => {
    const [local, domain] = String(email).split("@");
    if (!local || !domain) return email;
    const visible = local.length <= 2 ? local[0] : local.slice(0, 2);
    return `${visible}${"•".repeat(Math.max(2, local.length - visible.length))}@${domain}`;
};
const formatTimer = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

function Register() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
    const [touched, setTouched] = useState({});
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("error");
    const [loading, setLoading] = useState(false);
    const [busyAction, setBusyAction] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [otpRequested, setOtpRequested] = useState(false);
    const [digits, setDigits] = useState(emptyOtp);
    const [resendSeconds, setResendSeconds] = useState(0);
    const [expiryMinutes, setExpiryMinutes] = useState(10);
    const requestLockRef = useRef(false);
    const countdownActive = otpRequested && resendSeconds > 0;

    useEffect(() => {
        if (!countdownActive) return undefined;
        const timer = window.setInterval(() => setResendSeconds((current) => Math.max(0, current - 1)), 1000);
        return () => window.clearInterval(timer);
    }, [countdownActive]);

    const errors = { name: validateName(form.name), email: validateEmail(form.email), password: validatePassword(form.password), confirmPassword: validatePasswordConfirmation(form.password, form.confirmPassword) };
    const checks = passwordChecks(form.password);
    const valid = !errors.name && !errors.email && !errors.password && !errors.confirmPassword;
    const otp = digits.join("");

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((previous) => ({ ...previous, [name]: value }));
        setMessage(""); setMessageType("error");
    };
    const requestOtp = async ({ resent = false } = {}) => {
        if (!valid || loading || requestLockRef.current || (resent && resendSeconds > 0)) return;
        requestLockRef.current = true; setLoading(true); setBusyAction("sending"); setMessage("");
        try {
            const { data } = await api.post("/auth/register/request-otp", { name: form.name.trim(), email: form.email.trim().toLowerCase(), password: form.password, confirmPassword: form.confirmPassword });
            setOtpRequested(true); setDigits(emptyOtp()); setExpiryMinutes(data.expiresInMinutes || 10); setResendSeconds(data.resendAfterSeconds || 60);
            setMessageType("success"); setMessage(resent ? "A new verification code has been sent." : data.message);
        } catch (error) {
            const retryAfter = Number(error.response?.data?.retryAfterSeconds);
            if (resent && retryAfter > 0) setResendSeconds(Math.ceil(retryAfter));
            const fields = apiFieldErrors(error); setTouched((current) => ({ ...current, ...Object.fromEntries(Object.keys(fields).map((key) => [key, true])) }));
            setMessageType("error"); setMessage(error.response?.data?.message || "We could not send the verification code. Please try again.");
        } finally { requestLockRef.current = false; setLoading(false); setBusyAction(""); }
    };
    const submitDetails = async (event) => { event.preventDefault(); setTouched({ name: true, email: true, password: true, confirmPassword: true }); await requestOtp(); };
    const verifyAccount = async (event) => {
        event.preventDefault();
        if (otp.length !== OTP_LENGTH || loading || requestLockRef.current) return;
        requestLockRef.current = true; setLoading(true); setBusyAction("verifying"); setMessage("");
        try {
            const { data } = await api.post("/auth/register", { name: form.name.trim(), email: form.email.trim().toLowerCase(), password: form.password, confirmPassword: form.confirmPassword, otp });
            storeSession(data.token, data.user);
            navigate("/dashboard", { replace: true, state: { showWelcome: true, creatorName: data.user.name } });
        } catch (error) {
            setMessageType("error");
            setMessage(error.response?.data?.code === "OTP_EXPIRED" ? "This verification code has expired. Please request a new code." : error.response?.data?.message || "Verification failed. Please try again.");
        } finally { requestLockRef.current = false; setLoading(false); setBusyAction(""); }
    };

    return <main className={`auth-page ${otpRequested ? "verify-account-page" : ""}`}><div className="auth-card">
        <div className="auth-brand"><Link to="/" aria-label="WCase home"><img src="/wcase-logo.png" alt="WCase" /></Link></div>
        {!otpRequested ? <>
            <div className="auth-heading"><h1>Create your account</h1><p>Build your portfolio, upload your work and share one public link.</p></div>
            {message && <div className="message-box error-message" role="alert">{message}</div>}
            <form className="auth-form" onSubmit={submitDetails} noValidate>
                <div><label htmlFor="name">Name</label><input id="name" className={`form-input ${touched.name && errors.name ? "input-error" : ""}`} name="name" value={form.name} onChange={handleChange} onBlur={() => setTouched((value) => ({ ...value, name: true }))} maxLength={80} autoComplete="name" placeholder="Your name" aria-invalid={Boolean(touched.name && errors.name)} aria-describedby={touched.name && errors.name ? "name-error" : undefined} />{touched.name && errors.name && <p id="name-error" className="field-error">{errors.name}</p>}</div>
                <div><label htmlFor="email">Email</label><input id="email" className={`form-input ${touched.email && errors.email ? "input-error" : ""}`} type="email" name="email" value={form.email} onChange={handleChange} onBlur={() => setTouched((value) => ({ ...value, email: true }))} maxLength={150} autoComplete="email" placeholder="you@example.com" aria-invalid={Boolean(touched.email && errors.email)} aria-describedby={touched.email && errors.email ? "email-error" : undefined} />{touched.email && errors.email && <p id="email-error" className="field-error">{errors.email}</p>}</div>
                <div><label htmlFor="password">Password</label><div className="password-field"><input id="password" className={`form-input ${touched.password && errors.password ? "input-error" : ""}`} type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={handleChange} onBlur={() => setTouched((value) => ({ ...value, password: true }))} maxLength={72} autoComplete="new-password" placeholder="Create a strong password" aria-invalid={Boolean(touched.password && errors.password)} aria-describedby="password-rules" /><button type="button" aria-label={`${showPassword ? "Hide" : "Show"} password`} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Hide" : "Show"}</button></div>{form.password && <div id="password-rules" className="password-rules" aria-live="polite"><span className={checks.length ? "valid" : ""}>8–72 characters</span><span className={checks.letter ? "valid" : ""}>At least one letter</span><span className={checks.number ? "valid" : ""}>At least one number</span></div>}{touched.password && errors.password && <p className="field-error">{errors.password}</p>}</div>
                <div><label htmlFor="confirmPassword">Confirm password</label><input id="confirmPassword" className={`form-input ${touched.confirmPassword && errors.confirmPassword ? "input-error" : ""}`} type={showPassword ? "text" : "password"} name="confirmPassword" value={form.confirmPassword} onChange={handleChange} onBlur={() => setTouched((value) => ({ ...value, confirmPassword: true }))} maxLength={72} autoComplete="new-password" placeholder="Enter your password again" aria-invalid={Boolean(touched.confirmPassword && errors.confirmPassword)} aria-describedby={touched.confirmPassword && errors.confirmPassword ? "confirm-password-error" : undefined}/>{touched.confirmPassword && errors.confirmPassword && <p id="confirm-password-error" className="field-error">{errors.confirmPassword}</p>}</div>
                <button className="btn-primary auth-submit" type="submit" disabled={!valid || loading}>{busyAction === "sending" ? "Sending code..." : "Send Verification Code"}</button>
            </form>
            <p className="auth-footer">Already have an account? <Link to="/login">Login</Link></p>
        </> : <section className="verify-account-section" aria-labelledby="verify-account-title">
            <div className="auth-heading"><h1 id="verify-account-title">Verify Your Account</h1><p>Enter the six-digit code sent to <strong>{maskEmail(form.email.trim().toLowerCase())}</strong>.</p></div>
            {message && <div className={`message-box ${messageType === "success" ? "success-message" : "error-message"}`} role={messageType === "error" ? "alert" : "status"}>{message}</div>}
            <form className="auth-form verification-form" onSubmit={verifyAccount} noValidate>
                <div><span className="otp-label">Verification code</span><OtpInput digits={digits} onChange={(next) => { setDigits(next); if (messageType === "error") setMessage(""); }} disabled={loading} /><p className="otp-expiry">The code expires in {expiryMinutes} minutes.</p></div>
                <div className="otp-resend-area" aria-live="polite">{resendSeconds > 0 ? <p>Resend OTP available in <strong>{formatTimer(resendSeconds)}</strong></p> : <button className="otp-resend" type="button" disabled={loading} onClick={() => requestOtp({ resent: true })}>{busyAction === "sending" ? "Sending..." : "Resend OTP"}</button>}</div>
                <button className="btn-primary auth-submit" type="submit" disabled={otp.length !== OTP_LENGTH || loading}>{busyAction === "verifying" ? "Verifying..." : "Verify Account"}</button>
            </form>
        </section>}
    </div></main>;
}
export default Register;
