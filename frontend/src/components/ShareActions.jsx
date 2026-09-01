import { useEffect, useRef, useState } from "react";

export default function ShareActions({ onShare, onCopy, className = "" }) {
    const [copied, setCopied] = useState(false);
    const resetTimer = useRef(null);
    useEffect(() => () => window.clearTimeout(resetTimer.current), []);
    const runAction = (action) => (event) => {
        event.stopPropagation();
        action();
    };
    const copy = async (event) => {
        event.stopPropagation();
        if (copied) return;
        const succeeded = await onCopy();
        if (succeeded === false) return;
        setCopied(true);
        window.clearTimeout(resetTimer.current);
        resetTimer.current = window.setTimeout(() => setCopied(false), 2000);
    };

    return <div className={`share-actions ${className}`.trim()}><button type="button" className="share-button" onClick={runAction(onShare)} aria-label="Share this work">Share</button><button type="button" className="copy-link-button" onClick={copy} disabled={copied} aria-label={copied ? "Link copied" : "Copy link to this work"}>{copied ? "Link copied ✓" : "Copy Link"}</button></div>;
}
