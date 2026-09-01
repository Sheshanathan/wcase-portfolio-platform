import { useCallback, useEffect, useRef, useState } from "react";
import useDialogFocus from "../hooks/useDialogFocus";

const OUTPUTS = {
    profile: { width: 600, height: 600, label: "Profile image" },
    cover: { width: 1600, height: 600, label: "Cover image" }
};

export default function ImageCropModal({ file, type, onApply, onCancel }) {
    const settings = OUTPUTS[type] || OUTPUTS.profile;
    const canvasRef = useRef(null), imageRef = useRef(null);
    const [zoom, setZoom] = useState(1), [positionX, setPositionX] = useState(50), [positionY, setPositionY] = useState(50);
    const [busy, setBusy] = useState(false), [imageReady, setImageReady] = useState(false), [loadError, setLoadError] = useState("");
    const dialogRef = useDialogFocus({ onClose: onCancel, canClose: !busy });
    useEffect(() => {
        let active = true;
        const source = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            if (!active) return;
            imageRef.current = image;
            setImageReady(true);
            setLoadError("");
        };
        image.onerror = () => {
            if (!active) return;
            setLoadError("This image could not be previewed. Try a JPG, PNG, or WebP file.");
        };
        image.src = source;
        return () => {
            active = false;
            image.onload = null;
            image.onerror = null;
            URL.revokeObjectURL(source);
        };
    }, [file]);

    const draw = useCallback(() => {
        const image = imageRef.current, canvas = canvasRef.current;
        if (!image || !canvas || !image.complete || !image.naturalWidth) return false;
        const targetRatio = settings.width / settings.height, imageRatio = image.naturalWidth / image.naturalHeight;
        let baseWidth, baseHeight;
        if (imageRatio > targetRatio) { baseHeight = image.naturalHeight; baseWidth = baseHeight * targetRatio; }
        else { baseWidth = image.naturalWidth; baseHeight = baseWidth / targetRatio; }
        const sourceWidth = baseWidth / zoom, sourceHeight = baseHeight / zoom;
        const sourceX = (image.naturalWidth - sourceWidth) * (positionX / 100), sourceY = (image.naturalHeight - sourceHeight) * (positionY / 100);
        const context = canvas.getContext("2d", { alpha: false });
        context.fillStyle = "#111111"; context.fillRect(0, 0, settings.width, settings.height);
        context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, settings.width, settings.height);
        return true;
    }, [positionX, positionY, settings.height, settings.width, zoom]);
    useEffect(() => { if (imageReady) draw(); }, [draw, imageReady]);

    const apply = () => {
        if (busy || !draw()) return;
        setBusy(true);
        canvasRef.current.toBlob((blob) => {
            if (!blob) { setBusy(false); return; }
            setBusy(false);
            onApply(new File([blob], `${type}-${Date.now()}.jpg`, { type: "image/jpeg" }));
        }, "image/jpeg", 0.9);
    };

    return <div className="modal-backdrop crop-backdrop" role="presentation"><section ref={dialogRef} className="crop-modal" role="dialog" aria-modal="true" aria-labelledby="crop-title" aria-describedby="crop-help" tabIndex="-1"><div className="crop-heading"><div><p className="eyebrow">IMAGE EDITOR</p><h2 id="crop-title">Crop {settings.label}</h2></div><button type="button" className="modal-close crop-close" onClick={onCancel} disabled={busy} aria-label="Cancel image crop">×</button></div><div className={`crop-preview ${type}`}>{!imageReady && !loadError && <span className="crop-loading">Preparing preview…</span>}{loadError && <span className="crop-preview-error" role="alert">{loadError}</span>}<canvas ref={canvasRef} width={settings.width} height={settings.height}/></div><div className="crop-controls"><label>Zoom <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))}/></label><label>Horizontal position <input type="range" min="0" max="100" value={positionX} onChange={(event) => setPositionX(Number(event.target.value))}/></label><label>Vertical position <input type="range" min="0" max="100" value={positionY} onChange={(event) => setPositionY(Number(event.target.value))}/></label></div><p id="crop-help" className="crop-help">Adjust the crop so the important part stays inside the preview.</p><div className="button-group crop-actions"><button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button><button type="button" className="btn-primary" onClick={apply} disabled={busy || !imageReady}>{busy ? "Applying…" : "Apply Crop"}</button></div></section></div>;
}
