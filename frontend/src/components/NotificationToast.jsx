import { useCallback, useEffect, useRef, useState } from "react";
import { subscribeToNotifications } from "../utils/notify";

const icons = { success: "✓", error: "!", warning: "!", info: "i" };

export default function NotificationToast() {
    const [notification, setNotification] = useState(null);
    const timerRef = useRef(null);
    const startedAtRef = useRef(0);
    const remainingRef = useRef(0);

    useEffect(() => subscribeToNotifications(setNotification), []);

    const startTimer = useCallback((duration, id) => {
        if (timerRef.current) window.clearTimeout(timerRef.current);
        remainingRef.current = duration;
        startedAtRef.current = Date.now();
        timerRef.current = window.setTimeout(() => setNotification((current) => current?.id === id ? null : current), duration);
    }, []);

    useEffect(() => {
        if (!notification || notification.autoClose === false) return undefined;
        startTimer(notification.autoClose, notification.id);
        return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
    }, [notification, startTimer]);

    const pauseTimer = () => {
        if (!timerRef.current || notification?.autoClose === false) return;
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
        remainingRef.current = Math.max(250, remainingRef.current - (Date.now() - startedAtRef.current));
    };
    const resumeTimer = () => {
        if (!notification || notification.autoClose === false || timerRef.current) return;
        startTimer(remainingRef.current, notification.id);
    };

    if (!notification) return null;

    return <div className="app-toast-region" aria-live={notification.type === "error" ? "assertive" : "polite"} aria-atomic="true">
        <div className={`app-toast app-toast-${notification.type}`} role={notification.type === "error" ? "alert" : "status"} onMouseEnter={pauseTimer} onMouseLeave={resumeTimer}>
            <span className="app-toast-icon" aria-hidden="true">{icons[notification.type]}</span>
            <p>{notification.message}</p>
            <button type="button" onClick={() => setNotification(null)} aria-label="Close notification">×</button>
            {notification.autoClose !== false && <span className="app-toast-progress" aria-hidden="true" style={{ animationDuration: `${notification.autoClose}ms` }} />}
        </div>
    </div>;
}
