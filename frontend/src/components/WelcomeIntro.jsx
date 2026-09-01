import { useEffect } from "react";

export default function WelcomeIntro({ creatorName, onComplete }) {
    useEffect(() => {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const timer = window.setTimeout(onComplete, reduced ? 900 : 2500);
        return () => window.clearTimeout(timer);
    }, [onComplete]);

    return <div className="welcome-intro" role="status" aria-live="polite"><div className="welcome-intro-content"><img src="/wcase-logo.png" alt="WCase" /><p>Welcome, {creatorName || "Creator"}</p></div></div>;
}
