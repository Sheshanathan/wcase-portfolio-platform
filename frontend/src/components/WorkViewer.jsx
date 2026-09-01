import { useEffect, useRef, useState } from "react";
import ShareActions from "./ShareActions";
import useDialogFocus from "../hooks/useDialogFocus";

export default function WorkViewer({ work, mediaUrl, onClose, onShare, onCopy, onLike, liked, likeBusy, onPrevious, onNext, hasPrevious, hasNext, navigationBusy }) {
    const closeRef = useRef(null);
    const mediaRef = useRef(null);
    const [failedId, setFailedId] = useState("");
    const [isFullscreen, setIsFullscreen] = useState(false);
    const viewerRef = useDialogFocus({
        onClose,
        canClose: !isFullscreen,
        onKeyDown: (event) => {
            if (event.key === "ArrowLeft" && hasPrevious && !navigationBusy) { event.preventDefault(); onPrevious(); }
            if (event.key === "ArrowRight" && hasNext && !navigationBusy) { event.preventDefault(); onNext(); }
        }
    });
    useEffect(() => {
        const syncFullscreen = () => setIsFullscreen(document.fullscreenElement === mediaRef.current);
        document.addEventListener("fullscreenchange", syncFullscreen);
        return () => document.removeEventListener("fullscreenchange", syncFullscreen);
    }, []);
    const enterFullscreen = async () => {
        const target = mediaRef.current;
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
            // Escape remains available as a browser-level fallback.
        }
    };
    const protectMedia = (event) => event.preventDefault();
    return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section ref={viewerRef} className="work-viewer" tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="viewer-title">
        <div className="viewer-close-reveal-zone"><button ref={closeRef} className="modal-close" type="button" onClick={onClose} aria-label="Close work viewer" title="Close">×</button></div>
        {hasPrevious && <button className="viewer-nav viewer-previous" type="button" onClick={onPrevious} disabled={navigationBusy} aria-label="Previous work" title="Previous work"><span aria-hidden="true">←</span></button>}
        {hasNext && <button className="viewer-nav viewer-next" type="button" onClick={onNext} disabled={navigationBusy} aria-label="Next work" title="Next work"><span aria-hidden="true">→</span></button>}
        <div ref={mediaRef} className="viewer-media">{failedId === work._id ? <div className="media-error">Media could not be loaded.</div> : work.mediaType === "video" ? <video key={work._id} controls controlsList="nodownload" disablePictureInPicture playsInline preload="metadata" poster={work.thumbnailPath ? mediaUrl(work.thumbnailPath) : undefined} onContextMenu={protectMedia} onError={() => setFailedId(work._id)}><source src={mediaUrl(work.filePath)} type={work.mimeType === "application/octet-stream" ? "video/mp4" : work.mimeType}/></video> : <img key={work._id} src={mediaUrl(work.filePath)} alt={work.title} draggable="false" onDragStart={protectMedia} onContextMenu={protectMedia} onError={() => setFailedId(work._id)}/>} {work.mediaType === "video" && !isFullscreen && <button type="button" className="video-fullscreen-button" onClick={enterFullscreen} aria-label="View video full screen" title="Full screen"><span aria-hidden="true">⛶</span></button>}{work.mediaType === "video" && isFullscreen && <div className="fullscreen-close-reveal-zone"><button type="button" className="fullscreen-exit-button" onClick={exitFullscreen} aria-label="Exit full screen" title="Exit full screen">×</button></div>}</div>
        <div className="viewer-copy"><div className="viewer-title-row"><div><p className="work-kicker">{work.category || "Project"}{work.featured ? " · Featured" : ""}</p><h2 id="viewer-title">{work.title}</h2></div><div className="viewer-actions"><button type="button" className={`like-button ${liked ? "liked" : ""}`} aria-pressed={liked} disabled={likeBusy} onClick={() => onLike(work)}><span aria-hidden="true">{liked ? "♥" : "♡"}</span> {work.likeCount || 0}</button><ShareActions onShare={() => onShare(work)} onCopy={() => onCopy(work)} /></div></div>{work.description && <p>{work.description}</p>}{(work.projectName || work.year) && <p className="muted-text">{[work.projectName, work.year].filter(Boolean).join(" · ")}</p>}{work.tags?.length > 0 && <div className="tag-list">{work.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}</div>
    </section></div>;
}
