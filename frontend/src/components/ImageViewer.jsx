import { useEffect, useRef, useState } from "react";
import useDialogFocus from "../hooks/useDialogFocus";

export default function ImageViewer({ src, alt, mediaType = "image", mimeType, poster, onClose }) {
    const closeRef = useRef(null);
    const mediaRef = useRef(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const viewerRef = useDialogFocus({ onClose, canClose: !isFullscreen });

    useEffect(() => {
        const syncFullscreen = () => setIsFullscreen(document.fullscreenElement === viewerRef.current);
        document.addEventListener("fullscreenchange", syncFullscreen);
        return () => document.removeEventListener("fullscreenchange", syncFullscreen);
    }, [viewerRef]);

    const enterFullscreen = async () => {
        const target = viewerRef.current;
        if (!target) return;
        try {
            if (target.requestFullscreen) await target.requestFullscreen();
            else target.webkitRequestFullscreen?.();
        } catch {
            // Keep normal playback available if fullscreen is blocked by the browser.
        }
    };

    const exitFullscreen = async () => {
        try {
            if (document.exitFullscreen) await document.exitFullscreen();
            else document.webkitExitFullscreen?.();
        } catch {
            // Escape and the browser's own controls remain available as fallbacks.
        }
    };

    return <div className="modal-backdrop image-viewer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
        <section ref={viewerRef} tabIndex={-1} className={`image-viewer ${mediaType === "video" ? "video-viewer" : ""}`} role="dialog" aria-modal="true" aria-label={`${mediaType === "video" ? "Video" : "Full image"}: ${alt}`}>
            <div className="viewer-close-reveal-zone">
                <button ref={closeRef} className="modal-close" type="button" onClick={onClose} aria-label="Close media viewer" title="Close">×</button>
            </div>
            {mediaType === "video"
                ? <video ref={mediaRef} poster={poster} controls controlsList="nodownload" playsInline autoPlay aria-label={alt}><source src={src} type={mimeType === "application/octet-stream" ? "video/mp4" : mimeType} /></video>
                : <img ref={mediaRef} src={src} alt={alt} />}
            {mediaType === "video" && !isFullscreen && <button type="button" className="video-fullscreen-button" onClick={enterFullscreen} aria-label="View video full screen" title="Full screen"><span aria-hidden="true">⛶</span></button>}
            {mediaType === "video" && isFullscreen && <div className="fullscreen-close-reveal-zone"><button type="button" className="fullscreen-exit-button" onClick={exitFullscreen} aria-label="Exit full screen" title="Exit full screen">×</button></div>}
        </section>
    </div>;
}
