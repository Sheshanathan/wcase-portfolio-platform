import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api";
import ConfirmModal from "./ConfirmModal";

export default function CreatorEnquiries({ onTotalChange }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [confirm, setConfirm] = useState({ open: false });
    const [busy, setBusy] = useState(false);
    const [actionBusy, setActionBusy] = useState("");
    const mountedRef = useRef(true);
    const loadRequestRef = useRef(0);
    const totalRef = useRef(0);
    const load = useCallback(async ({ quiet = false } = {}) => {
        const requestId = ++loadRequestRef.current;
        if (!quiet) setLoading(true);
        try {
            const { data } = await api.get("/enquiries/me");
            if (mountedRef.current && requestId === loadRequestRef.current) {
                const enquiries = data.enquiries || [];
                const total = Math.max(0, Number(data.total) || 0);
                setItems(enquiries); totalRef.current = total; onTotalChange?.(total); setError("");
            }
        } catch (requestError) {
            if (mountedRef.current && requestId === loadRequestRef.current) setError(requestError.response?.data?.message || "Enquiries could not be loaded");
        } finally {
            if (mountedRef.current && requestId === loadRequestRef.current) setLoading(false);
        }
    }, [onTotalChange]);
    useEffect(() => {
        mountedRef.current = true;
        Promise.resolve().then(() => load());
        const timer = window.setInterval(() => load({ quiet: true }), 60_000);
        return () => { mountedRef.current = false; loadRequestRef.current += 1; window.clearInterval(timer); };
    }, [load]);
    const setRead = async (item, isRead) => {
        if (actionBusy) return;
        setActionBusy(item._id);
        try { const { data } = await api.put(`/enquiries/${item._id}/read`, { isRead }); if (mountedRef.current) setItems((current) => current.map((entry) => entry._id === item._id ? data.enquiry : entry)); }
        catch (requestError) { if (mountedRef.current) setError(requestError.response?.data?.message || "Enquiry could not be updated"); }
        finally { if (mountedRef.current) setActionBusy(""); }
    };
    const remove = async () => {
        if (!confirm.item || busy) return;
        setBusy(true);
        try { await api.delete(`/enquiries/${confirm.item._id}`); if (mountedRef.current) { setItems((current) => current.filter((entry) => entry._id !== confirm.item._id)); totalRef.current = Math.max(0, totalRef.current - 1); onTotalChange?.(totalRef.current); setConfirm({ open: false }); } }
        catch (requestError) { if (mountedRef.current) setError(requestError.response?.data?.message || "Enquiry could not be deleted"); }
        finally { if (mountedRef.current) setBusy(false); }
    };
    const unread = items.filter((item) => !item.isRead).length;
    return <section className="panel enquiry-panel" aria-labelledby="enquiries-heading"><div className="section-header"><div><p className="eyebrow">INBOX</p><h2 id="enquiries-heading">Enquiries {unread > 0 && <span className="notification-badge" aria-label={`${unread} unread enquiries`}>{unread}</span>}</h2></div><button type="button" className="btn-secondary" onClick={() => load()} disabled={loading}>Refresh</button></div>{error && <p className="field-error" role="alert">{error}</p>}{loading ? <p>Loading enquiries…</p> : items.length === 0 ? <div className="empty-state">No enquiries yet. New visitor messages will appear here.</div> : <div className="enquiry-list">{items.map((item) => <article className={`enquiry-card ${item.isRead ? "" : "unread"}`} key={item._id}><div className="enquiry-card-header"><div><span className="enquiry-state">{item.isRead ? "Read" : "New"}</span><h3>{item.subject}</h3><div className="enquiry-contact-line"><strong>{item.name}</strong><span className="enquiry-contact-detail">{item.email}</span>{item.phone && <span className="enquiry-contact-detail">{item.phone}</span>}</div></div><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time></div><div className="enquiry-message"><span>Message</span><p>{item.message}</p></div><div className="enquiry-actions"><div className="button-group contact-actions"><a className="btn-primary" href={`mailto:${item.email}?subject=${encodeURIComponent(`Re: ${item.subject}`)}`} onClick={() => !item.isRead && setRead(item, true)}>Reply by Email</a>{item.phone && <a className="btn-secondary" href={`tel:${item.phone}`} onClick={() => !item.isRead && setRead(item, true)}>Call</a>}</div><div className="button-group management-actions"><button type="button" className="btn-secondary" onClick={() => setRead(item, !item.isRead)} disabled={actionBusy === item._id}>Mark as {item.isRead ? "unread" : "read"}</button><button type="button" className="btn-danger" onClick={() => setConfirm({ open: true, item, title: "Delete enquiry?", message: `Delete the enquiry from ${item.name}? This cannot be undone.`, confirmText: "Delete Enquiry", danger: true })} disabled={busy}>Delete</button></div></div></article>)}</div>}<ConfirmModal {...confirm} busy={busy} onConfirm={remove} onCancel={() => setConfirm({ open: false })}/></section>;
}
