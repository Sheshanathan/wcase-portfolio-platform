import { useMemo, useRef, useState } from "react";
import api from "../api";
import { apiFieldErrors, validateEmail, validateMessage, validateName, validatePhone, validateSubject } from "../utils/validation";

const initialForm = { name: "", email: "", phone: "", subject: "", message: "" };

export default function ContactForm({ slug }) {
    const [form, setForm] = useState(initialForm);
    const [touched, setTouched] = useState({});
    const [serverErrors, setServerErrors] = useState({});
    const [status, setStatus] = useState("idle");
    const [notice, setNotice] = useState("");
    const lock = useRef(false);
    const errors = useMemo(() => ({
        name: validateName(form.name),
        email: validateEmail(form.email),
        phone: validatePhone(form.phone),
        subject: validateSubject(form.subject),
        message: validateMessage(form.message)
    }), [form]);
    const valid = Object.values(errors).every((value) => !value);

    const change = (event) => {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
        setServerErrors((current) => ({ ...current, [name]: "" }));
        setNotice("");
        if (status === "success") setStatus("idle");
    };

    const submit = async (event) => {
        event.preventDefault();
        setTouched({ name: true, email: true, phone: true, subject: true, message: true });
        setNotice("");
        if (!valid || lock.current) return;
        lock.current = true;
        setStatus("loading");
        try {
            const payload = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]));
            const { data } = await api.post(`/enquiries/public/${encodeURIComponent(slug)}`, payload);
            setStatus("success");
            setForm(initialForm);
            setTouched({});
            setServerErrors({});
            setNotice(data.message);
        } catch (error) {
            setStatus("error");
            const fields = apiFieldErrors(error);
            setServerErrors(fields);
            setTouched((current) => ({ ...current, ...Object.fromEntries(Object.keys(fields).map((key) => [key, true])) }));
            setNotice(Object.keys(fields).length ? "Please correct the highlighted fields." : error.response?.data?.message || "Enquiry could not be sent. Please try again.");
        } finally { lock.current = false; }
    };

    const field = (name) => touched[name] ? errors[name] || serverErrors[name] : "";
    return <form className="contact-form" onSubmit={submit} noValidate aria-busy={status === "loading"}>
        <div className="form-row">
            <div><label htmlFor="contact-name">Name *</label><input id="contact-name" className={`form-input ${field("name") ? "input-error" : ""}`} name="name" maxLength={80} value={form.name} onChange={change} onBlur={() => setTouched((current) => ({ ...current, name: true }))} autoComplete="name" aria-invalid={Boolean(field("name"))} aria-describedby={field("name") ? "contact-name-error" : undefined}/>{field("name") && <p id="contact-name-error" className="field-error">{field("name")}</p>}</div>
            <div><label htmlFor="contact-email">Email *</label><input id="contact-email" className={`form-input ${field("email") ? "input-error" : ""}`} type="email" name="email" maxLength={150} value={form.email} onChange={change} onBlur={() => setTouched((current) => ({ ...current, email: true }))} autoComplete="email" aria-invalid={Boolean(field("email"))} aria-describedby={field("email") ? "contact-email-error" : undefined}/>{field("email") && <p id="contact-email-error" className="field-error">{field("email")}</p>}</div>
        </div>
        <div className="form-row">
            <div><label htmlFor="contact-phone">Phone</label><input id="contact-phone" className={`form-input ${field("phone") ? "input-error" : ""}`} name="phone" maxLength={25} value={form.phone} onChange={change} onBlur={() => setTouched((current) => ({ ...current, phone: true }))} autoComplete="tel" aria-invalid={Boolean(field("phone"))} aria-describedby={field("phone") ? "contact-phone-error" : undefined}/>{field("phone") && <p id="contact-phone-error" className="field-error">{field("phone")}</p>}</div>
            <div><label htmlFor="contact-subject">Subject *</label><input id="contact-subject" className={`form-input ${field("subject") ? "input-error" : ""}`} name="subject" maxLength={120} value={form.subject} onChange={change} onBlur={() => setTouched((current) => ({ ...current, subject: true }))} aria-invalid={Boolean(field("subject"))} aria-describedby={field("subject") ? "contact-subject-error" : undefined}/>{field("subject") && <p id="contact-subject-error" className="field-error">{field("subject")}</p>}</div>
        </div>
        <div><label htmlFor="contact-message">Message *</label><textarea id="contact-message" className={`form-input textarea ${field("message") ? "input-error" : ""}`} name="message" maxLength={2000} value={form.message} onChange={change} onBlur={() => setTouched((current) => ({ ...current, message: true }))} aria-invalid={Boolean(field("message"))} aria-describedby={field("message") ? "contact-message-error" : undefined}/>{field("message") && <p id="contact-message-error" className="field-error">{field("message")}</p>}</div>
        {notice && <p role={status === "error" ? "alert" : "status"} className={status === "success" ? "success-text" : "field-error"}>{notice}</p>}
        <button type="submit" className="btn-primary contact-submit" disabled={status === "loading" || !valid}><span>{status === "loading" ? "Sending…" : "Send enquiry"}</span><span aria-hidden="true" className="contact-submit-arrow">→</span></button>
    </form>;
}
