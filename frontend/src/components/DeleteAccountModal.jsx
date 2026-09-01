import { useRef, useState } from "react";
import api from "../api";
import useDialogFocus from "../hooks/useDialogFocus";

export default function DeleteAccountModal({ open, onDeleted, onCancel }) {
    const [step, setStep] = useState("warning");
    const [otp, setOtp] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("error");
    const [busy, setBusy] = useState(false);
    const lockRef = useRef(false);
    const cancelRef = useRef(null);
    const otpRef = useRef(null);
    const dialogRef = useDialogFocus({ open, onClose: onCancel, canClose: !busy, initialFocusRef: step === "warning" ? cancelRef : otpRef });

    if (!open) return null;

    const requestOtp = async () => {
        if (lockRef.current) return;
        lockRef.current = true; setBusy(true); setMessage("");
        try {
            const { data } = await api.post("/auth/delete-account/request-otp");
            setStep("verify"); setMessageType("success"); setMessage(data.message);
        } catch (error) {
            setMessageType("error"); setMessage(error.response?.data?.message || "Could not send the deletion code. Please try again.");
        } finally { lockRef.current = false; setBusy(false); }
    };

    const deleteAccount = async () => {
        if (!/^\d{6}$/.test(otp) || confirmation !== "DELETE" || lockRef.current) return;
        lockRef.current = true; setBusy(true); setMessage("");
        try {
            const { data } = await api.delete("/auth/delete-account", { data: { otp, confirmation } });
            onDeleted(data.message);
        } catch (error) {
            setMessageType("error"); setMessage(error.response?.data?.message || "Account deletion failed. Your account has not been deleted.");
        } finally { lockRef.current = false; setBusy(false); }
    };

    return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !busy && onCancel()}>
        <div ref={dialogRef} tabIndex={-1} className="confirm-modal delete-account-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-account-title" aria-describedby="delete-account-description">
            <p className="danger-label">Danger zone</p>
            <h2 id="delete-account-title">Permanently delete your account?</h2>
            {step === "warning" ? <div id="delete-account-description">
                <p>Your account, portfolio, works, uploaded media and creator enquiries will be permanently deleted. This action cannot be undone.</p>
                <p>To prevent accidental deletion, WCase will send a single-use verification code to your registered email address.</p>
            </div> : <div id="delete-account-description">
                <p>Enter the six-digit verification code, then type <strong>DELETE</strong> exactly. The code expires in 10 minutes.</p>
                <label htmlFor="delete-account-otp">Verification code</label>
                <input ref={otpRef} id="delete-account-otp" className="form-input otp-input" value={otp} onChange={(event) => { setOtp(event.target.value.replace(/\D/g, "").slice(0, 6)); setMessage(""); }} inputMode="numeric" autoComplete="one-time-code" maxLength={6} aria-describedby="delete-account-help" />
                <label htmlFor="delete-account-confirmation">Type DELETE to confirm</label>
                <input id="delete-account-confirmation" className="form-input" value={confirmation} onChange={(event) => { setConfirmation(event.target.value.toUpperCase().slice(0, 6)); setMessage(""); }} autoComplete="off" spellCheck="false" />
                <p id="delete-account-help" className="danger-help">Your account remains active unless both confirmation checks succeed.</p>
            </div>}
            {message && <div className={`message-box ${messageType === "success" ? "success-message" : "error-message"}`} role={messageType === "error" ? "alert" : "status"}>{message}</div>}
            <div className="modal-actions">
                <button ref={cancelRef} type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
                {step === "warning"
                    ? <button type="button" className="btn-danger" onClick={requestOtp} disabled={busy}>{busy ? "Sending verification code…" : "Continue to Verification"}</button>
                    : <><button type="button" className="btn-secondary" onClick={requestOtp} disabled={busy}>Resend code</button><button type="button" className="btn-danger" onClick={deleteAccount} disabled={busy || otp.length !== 6 || confirmation !== "DELETE"}>{busy ? "Deleting account…" : "Permanently Delete Account"}</button></>}
            </div>
        </div>
    </div>;
}
