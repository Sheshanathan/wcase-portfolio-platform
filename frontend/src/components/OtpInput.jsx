import { useEffect, useRef } from "react";

export default function OtpInput({ digits, onChange, disabled = false }) {
    const refs = useRef([]);
    const focus = (index) => refs.current[Math.max(0, Math.min(digits.length - 1, index))]?.focus();
    useEffect(() => { refs.current[0]?.focus(); }, []);
    const distribute = (start, value) => {
        const numeric = value.replace(/\D/g, "").slice(0, digits.length - start);
        if (!numeric) return;
        const next = [...digits];
        [...numeric].forEach((digit, offset) => { next[start + offset] = digit; });
        onChange(next);
        focus(Math.min(start + numeric.length, digits.length - 1));
    };
    const updateDigit = (index, value) => {
        const numeric = value.replace(/\D/g, "");
        if (!numeric) { const next = [...digits]; next[index] = ""; onChange(next); return; }
        if (numeric.length > 1) return distribute(index, numeric);
        const next = [...digits]; next[index] = numeric[0]; onChange(next);
        if (index < digits.length - 1) focus(index + 1);
    };
    const handleKeyDown = (event, index) => {
        if (event.key === "Backspace" && !digits[index] && index > 0) { event.preventDefault(); focus(index - 1); }
        else if (event.key === "ArrowLeft" && index > 0) { event.preventDefault(); focus(index - 1); }
        else if (event.key === "ArrowRight" && index < digits.length - 1) { event.preventDefault(); focus(index + 1); }
        else if (event.key === "Home") { event.preventDefault(); focus(0); }
        else if (event.key === "End") { event.preventDefault(); focus(digits.length - 1); }
    };

    return <div className="otp-boxes" role="group" aria-label="Six-digit verification code">
        {digits.map((digit, index) => <input key={index} ref={(node) => { refs.current[index] = node; }} className="otp-box" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete={index === 0 ? "one-time-code" : "off"} aria-label={`Verification code digit ${index + 1} of ${digits.length}`} value={digit} maxLength={1} disabled={disabled} onFocus={(event) => event.currentTarget.select()} onChange={(event) => updateDigit(index, event.target.value)} onKeyDown={(event) => handleKeyDown(event, index)} onPaste={(event) => { event.preventDefault(); distribute(index, event.clipboardData.getData("text")); }} />)}
    </div>;
}
