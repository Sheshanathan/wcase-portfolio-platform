export default function CreatorWorkMedia({ work, mediaUrl, onOpen }) {
    const isVideo = work.mediaType === "video";

    return <button
        type="button"
        className={`creator-media-open ${isVideo ? "creator-video-open" : "creator-image-open"}`}
        onClick={onOpen}
        aria-label={`${isVideo ? "Play video" : "View image"}: ${work.title}`}
    >
        {isVideo
            ? <>
                <video
                    tabIndex={-1}
                    aria-hidden="true"
                    muted
                    playsInline
                    preload="metadata"
                    poster={work.thumbnailPath ? mediaUrl(work.thumbnailPath) : undefined}
                >
                    <source src={mediaUrl(work.filePath)} type={work.mimeType === "application/octet-stream" ? "video/mp4" : work.mimeType} />
                </video>
                <span className="creator-play-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5.6v12.8L18 12 8 5.6Z" fill="currentColor" /></svg></span>
                <span className="creator-media-label">Play video</span>
            </>
            : <>
                <img src={mediaUrl(work.filePath)} alt="" />
                <span className="creator-media-label">View image</span>
            </>}
    </button>;
}
