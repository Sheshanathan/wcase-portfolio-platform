export default function PublicNavbar({ onShare, sharing = false }) {
    return <header className="public-header-shell">
        <a className="public-header-logo" href="#home" aria-label="WCase portfolio home"><img src="/wcase-logo.png" alt="WCase"/></a>
        <nav className="public-nav" aria-label="Portfolio sections">
            <a href="#work">Work</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
            <button type="button" onClick={onShare} disabled={sharing} aria-label={sharing ? "Sharing portfolio" : "Share portfolio"}>{sharing ? "Sharing…" : "Share"}</button>
        </nav>
    </header>;
}
