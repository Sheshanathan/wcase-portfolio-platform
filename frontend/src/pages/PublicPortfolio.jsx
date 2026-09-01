import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { notify } from "../utils/notify";
import api from "../api";
import PublicNavbar from "../components/PublicNavbar";
import WorkViewer from "../components/WorkViewer";
import ShareActions from "../components/ShareActions";
import ContactForm from "../components/ContactForm";
import { MEDIA_ORIGIN } from "../config";
import { getStoredUser } from "../utils/authStorage";

const mediaUrl = (value) => value ? `${MEDIA_ORIGIN}${value}` : "";
const VISITOR_PATTERN = /^[A-Za-z0-9_-]{16,80}$/;
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;
const WORK_VIEW_COOLDOWN_MS = 30 * 60 * 1000;
const WORK_VIEWS_KEY = "wcaseWorkViews";
const PORTFOLIO_VIEW_COOLDOWN_MS = 30 * 60 * 1000;
const PORTFOLIO_VIEWS_KEY = "wcasePortfolioViews";
const PROFILE_LINKS = [
    { key: "instagram", label: "Instagram" },
    { key: "youtube", label: "YouTube" },
    { key: "facebook", label: "Facebook" },
    { key: "twitter", label: "X / Twitter" },
    { key: "linkedin", label: "LinkedIn" },
    { key: "website", label: "Website", direct: true },
    { key: "vimeo", label: "Vimeo" }
];
const SocialIcon = ({ name }) => {
    const paths = {
        instagram: <><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></>,
        youtube: <><rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3Z" fill="currentColor" stroke="none"/></>,
        facebook: <path d="M14 8h3V4h-3c-3.3 0-5 2-5 5v2H6v4h3v7h4v-7h3.5l.5-4h-4V9c0-.7.3-1 1-1Z" fill="currentColor" stroke="none"/>,
        twitter: <path d="M5 4 19 20M19 4 5 20"/>,
        linkedin: <><rect x="2.5" y="2.5" width="19" height="19" rx="2.5"/><circle cx="7.25" cy="8" r="1.25" fill="currentColor" stroke="none"/><path d="M7.25 11.5V18M11.5 18v-6.5M11.5 14.25c.65-1.8 1.8-2.75 3.45-2.75 2.05 0 3.3 1.45 3.3 3.8V18"/></>,
        website: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></>,
        vimeo: <path d="M4 8c2-2 5-3 6 1l1 5c.3 1.4.8 1.5 1.6.3L16 9c.7-1.1.4-1.8-1-1.4l-1.5.7C14 5 18 3 20 5c2.8 3-5.7 15-10 15-2.6 0-3.2-3.5-4-7-.7-3-1-3.4-3-2Z" fill="currentColor" stroke="none"/>
    };
    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
};
const newVisitorId = () => typeof crypto.randomUUID === "function" ? crypto.randomUUID().replaceAll("-", "") : [...crypto.getRandomValues(new Uint8Array(16))].map((value) => value.toString(16).padStart(2, "0")).join("");
const getVisitorId = () => { let value = localStorage.getItem("wcaseVisitorId"); if (!VISITOR_PATTERN.test(value || "")) { value = newVisitorId(); localStorage.setItem("wcaseVisitorId", value); } return value; };
const getLikedWorks = () => { try { const value = JSON.parse(localStorage.getItem("wcaseLikedWorks") || "[]"); return new Set(Array.isArray(value) ? value.filter((id) => OBJECT_ID_PATTERN.test(id)).slice(0, 1000) : []); } catch { localStorage.removeItem("wcaseLikedWorks"); return new Set(); } };
const viewedRecently = (id) => { try { const views = JSON.parse(localStorage.getItem(WORK_VIEWS_KEY) || "{}"); return views && typeof views === "object" && Date.now() - Number(views[id] || 0) < WORK_VIEW_COOLDOWN_MS; } catch { localStorage.removeItem(WORK_VIEWS_KEY); return false; } };
const rememberWorkView = (id) => { try { const stored = JSON.parse(localStorage.getItem(WORK_VIEWS_KEY) || "{}"); const now = Date.now(); const recent = Object.entries(stored && typeof stored === "object" ? stored : {}).filter(([key, value]) => OBJECT_ID_PATTERN.test(key) && now - Number(value) < WORK_VIEW_COOLDOWN_MS).slice(-999); localStorage.setItem(WORK_VIEWS_KEY, JSON.stringify(Object.fromEntries([...recent, [id, now]]))); } catch { localStorage.removeItem(WORK_VIEWS_KEY); } };
const viewedPortfolioRecently = (slug) => { try { const views = JSON.parse(localStorage.getItem(PORTFOLIO_VIEWS_KEY) || "{}"); return views && typeof views === "object" && Date.now() - Number(views[slug] || 0) < PORTFOLIO_VIEW_COOLDOWN_MS; } catch { localStorage.removeItem(PORTFOLIO_VIEWS_KEY); return false; } };
const rememberPortfolioView = (slug) => { try { const stored = JSON.parse(localStorage.getItem(PORTFOLIO_VIEWS_KEY) || "{}"); const now = Date.now(); const recent = Object.entries(stored && typeof stored === "object" ? stored : {}).filter(([key, value]) => typeof key === "string" && key.length <= 60 && now - Number(value) < PORTFOLIO_VIEW_COOLDOWN_MS).slice(-199); localStorage.setItem(PORTFOLIO_VIEWS_KEY, JSON.stringify(Object.fromEntries([...recent, [slug, now]]))); } catch { localStorage.removeItem(PORTFOLIO_VIEWS_KEY); } };

export default function PublicPortfolio() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const requestedWorkId = searchParams.get("work");
    const [portfolio, setPortfolio] = useState(null), [works, setWorks] = useState([]), [categories, setCategories] = useState([]), [pagination, setPagination] = useState(null);
    const [page, setPage] = useState(1), [category, setCategory] = useState(""), [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(""), [viewer, setViewer] = useState(null), [viewerNavigation, setViewerNavigation] = useState({ previousId: null, nextId: null });
    const [likedWorks, setLikedWorks] = useState(getLikedWorks), [likeBusy, setLikeBusy] = useState(""), [navigationBusy, setNavigationBusy] = useState(false);
    const [portfolioShareBusy, setPortfolioShareBusy] = useState(false);
    const viewerCacheRef = useRef(new Map());
    const viewerRequestsRef = useRef(new Set());
    const copyGuardRef = useRef({ url: "", at: 0 });
    const shareLockRef = useRef(false);
    const likeLockRef = useRef(false);
    const viewedWorksRef = useRef(new Set());
    const viewedPortfoliosRef = useRef(new Set());
    const pageRequestRef = useRef(0);
    const viewerRequestRef = useRef(0);
    const mountedRef = useRef(true);
    const portfolioRef = useRef(null);
    useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; pageRequestRef.current += 1; viewerRequestRef.current += 1; }; }, []);

    const loadPage = useCallback(async ({ quiet = false } = {}) => {
        const requestId = ++pageRequestRef.current;
        if (!quiet) setLoading(true);
        try {
            const { data } = await api.get(`/portfolios/public/${encodeURIComponent(slug)}/page`, { params: { page, limit: 12, category: category || undefined } });
            if (!mountedRef.current || requestId !== pageRequestRef.current) return;
            const publicWorks = data.works || [];
            publicWorks.forEach((work) => viewerCacheRef.current.set(work._id, work));
            if (page > 1 && data.pagination.pages > 0 && page > data.pagination.pages) { setPage(data.pagination.pages); return; }
            portfolioRef.current = data.portfolio; setPortfolio(data.portfolio); setWorks(publicWorks); setCategories(Array.isArray(data.categories) ? data.categories : [...new Set(publicWorks.map((work) => work.category).filter(Boolean))]); setPagination(data.pagination); setMessage("");
        } catch (error) {
            if (!mountedRef.current || requestId !== pageRequestRef.current) return;
            if (quiet && portfolioRef.current) { notify("error", error.response?.data?.message || "Portfolio could not be refreshed"); return; }
            portfolioRef.current = null; setPortfolio(null); setWorks([]); setPagination(null);
            setMessage("This portfolio is private, unavailable, or could not be loaded.");
        } finally { if (mountedRef.current && requestId === pageRequestRef.current) setLoading(false); }
    }, [slug, page, category]);
    useEffect(() => { Promise.resolve().then(() => loadPage()); }, [loadPage]);
    useEffect(() => {
        const refresh = () => loadPage({ quiet: true });
        const onVisibility = () => { if (document.visibilityState === "visible") refresh(); };
        window.addEventListener("focus", refresh);
        window.addEventListener("storage", refresh);
        document.addEventListener("visibilitychange", onVisibility);
        const interval = window.setInterval(refresh, 30_000);
        return () => { window.removeEventListener("focus", refresh); window.removeEventListener("storage", refresh); document.removeEventListener("visibilitychange", onVisibility); window.clearInterval(interval); };
    }, [loadPage]);
    useEffect(() => { if (!portfolio) return; document.title = `${portfolio.title} | WCase`; const description = (portfolio.bio || `${portfolio.creator?.name || "Creator"} portfolio`).slice(0, 155); const setMeta = (selector, attr, value) => { let node = document.head.querySelector(selector); if (!node) { node = document.createElement("meta"); const [key, name] = attr.split("="); node.setAttribute(key, name); document.head.appendChild(node); } node.setAttribute("content", value); }; setMeta('meta[name="description"]', "name=description", description); setMeta('meta[property="og:title"]', "property=og:title", `${portfolio.title} | WCase`); setMeta('meta[property="og:description"]', "property=og:description", description); if (portfolio.coverImage || portfolio.profileImage) setMeta('meta[property="og:image"]', "property=og:image", mediaUrl(portfolio.coverImage || portfolio.profileImage)); }, [portfolio]);
    useEffect(() => {
        if (!portfolio || getStoredUser() || viewedPortfoliosRef.current.has(slug) || viewedPortfolioRecently(slug)) return;
        viewedPortfoliosRef.current.add(slug);
        api.post(`/portfolios/public/${encodeURIComponent(slug)}/view`, { visitorId: getVisitorId() })
            .then(() => rememberPortfolioView(slug))
            .catch(() => viewedPortfoliosRef.current.delete(slug));
    }, [portfolio, slug]);

    const workUrl = useCallback((work) => `${window.location.origin}/p/${encodeURIComponent(slug)}?work=${encodeURIComponent(work._id)}`, [slug]);
    const recordWorkView = useCallback(async (id) => {
        if (!OBJECT_ID_PATTERN.test(id || "") || getStoredUser() || viewedWorksRef.current.has(id) || viewedRecently(id)) return;
        viewedWorksRef.current.add(id);
        try {
            await api.post(`/works/public/${encodeURIComponent(slug)}/${encodeURIComponent(id)}/view`, { visitorId: getVisitorId() });
            rememberWorkView(id);
        } catch {
            viewedWorksRef.current.delete(id);
        }
    }, [slug]);
    const loadViewer = useCallback(async (id, updateUrl = true) => {
        if (!id || viewerRequestsRef.current.has(id)) return;
        const requestId = ++viewerRequestRef.current;
        viewerRequestsRef.current.add(id);
        const cached = viewerCacheRef.current.get(id);
        if (cached) {
            setViewer(cached);
            if (updateUrl) navigate(`/p/${encodeURIComponent(slug)}?work=${encodeURIComponent(id)}`, { replace: true });
        }
        setNavigationBusy(true);
        try {
            const { data } = await api.get(`/works/public/${encodeURIComponent(slug)}/${encodeURIComponent(id)}`);
            if (!mountedRef.current || requestId !== viewerRequestRef.current) return;
            viewerCacheRef.current.set(data.work._id, data.work);
            setViewer(data.work); setViewerNavigation(data.navigation);
            void recordWorkView(data.work._id);
            if (updateUrl) navigate(`/p/${encodeURIComponent(slug)}?work=${encodeURIComponent(data.work._id)}`, { replace: true });
        } catch (error) {
            if (!mountedRef.current || requestId !== viewerRequestRef.current) return;
            setViewer(null); setViewerNavigation({ previousId: null, nextId: null });
            navigate(`/p/${encodeURIComponent(slug)}`, { replace: true });
            notify("error", error.response?.data?.message || "This work is no longer available");
        } finally { viewerRequestsRef.current.delete(id); if (mountedRef.current && requestId === viewerRequestRef.current) setNavigationBusy(false); }
    }, [navigate, recordWorkView, slug]);
    useEffect(() => {
        if (portfolio && requestedWorkId && requestedWorkId !== viewer?._id) Promise.resolve().then(() => loadViewer(requestedWorkId, false));
        if (portfolio && !requestedWorkId && viewer) Promise.resolve().then(() => setViewer(null));
    }, [loadViewer, portfolio, requestedWorkId, viewer]);

    const closeViewer = useCallback(() => { setViewer(null); setViewerNavigation({ previousId: null, nextId: null }); navigate(`/p/${encodeURIComponent(slug)}`, { replace: true }); }, [navigate, slug]);
    const copyUrl = useCallback(async (url) => {
        const now = Date.now();
        if (copyGuardRef.current.url === url && now - copyGuardRef.current.at < 4000) return true;
        try {
            await navigator.clipboard.writeText(url);
            copyGuardRef.current = { url, at: now };
            return true;
        } catch {
            notify("error", "Could not copy link");
            return false;
        }
    }, []);
    const shareItem = useCallback(async ({ title, text, url }) => {
        if (shareLockRef.current) return "busy";
        shareLockRef.current = true;
        const payload = { title: title || "WCase portfolio", text: text || undefined, url };
        try {
            let canUseNativeShare = typeof navigator.share === "function";
            if (canUseNativeShare && typeof navigator.canShare === "function") {
                try { canUseNativeShare = navigator.canShare(payload); } catch { canUseNativeShare = false; }
            }
            if (canUseNativeShare) {
                try {
                    await navigator.share(payload);
                    return "shared";
                } catch (error) {
                    if (error?.name === "AbortError" || error?.name === "InvalidStateError") return "cancelled";
                }
            }
            return await copyUrl(url) ? "copied" : "failed";
        } finally {
            shareLockRef.current = false;
        }
    }, [copyUrl]);
    const sharePortfolio = useCallback(async () => {
        if (shareLockRef.current) return;
        const url = `${window.location.origin}/p/${encodeURIComponent(slug)}`;
        setPortfolioShareBusy(true);
        try {
            const result = await shareItem({ title: portfolio?.title, text: portfolio?.bio, url });
            if (result === "copied") notify("success", "Portfolio link copied");
        } finally {
            if (mountedRef.current) setPortfolioShareBusy(false);
        }
    }, [portfolio, shareItem, slug]);
    const shareWork = async (work) => {
        const result = await shareItem({ title: work.title, text: work.description || `View ${work.title} on WCase`, url: workUrl(work) });
        if (result === "copied") notify("success", "Work link copied");
    };
    const copyWork = (work) => copyUrl(workUrl(work));
    const toggleLike = async (work) => { if (likeLockRef.current) return; likeLockRef.current = true; setLikeBusy(work._id); try { const { data } = await api.post(`/works/public/${work._id}/like`, { visitorId: getVisitorId() }); const update = (item) => item._id === work._id ? { ...item, likeCount: data.likeCount } : item; setWorks((current) => current.map(update)); setViewer((current) => current ? update(current) : current); setLikedWorks((current) => { const next = new Set(current); data.liked ? next.add(work._id) : next.delete(work._id); localStorage.setItem("wcaseLikedWorks", JSON.stringify([...next])); return next; }); } catch (error) { notify("error", error.response?.data?.message || "Like could not be updated"); } finally { likeLockRef.current = false; setLikeBusy(""); } };

    const selectCategory = useCallback((nextCategory) => {
        setCategory(nextCategory);
        setPage(1);
    }, []);
    const selectCategoryByKeyboard = (event, nextCategory) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        selectCategory(nextCategory);
    };
    if (loading && !portfolio) return <div className="loading-page"><div className="loading-spinner"/><span className="sr-only">Loading portfolio</span></div>;
    if (message && !portfolio) return <main className="public-page"><div className="public-error"><img src="/wcase-logo.png" alt="WCase"/><h1>Portfolio unavailable</h1><p>{message}</p><Link className="btn-primary" to="/">Go home</Link></div></main>;
    const links = PROFILE_LINKS.map(({ key, label, direct }) => ({ key, label, url: direct ? portfolio[key] : portfolio.socialLinks?.[key] })).filter(({ url }) => url);
    const protectMedia = (event) => event.preventDefault();

    return <main className="public-page"><PublicNavbar onShare={sharePortfolio} sharing={portfolioShareBusy}/>
        <section id="home" className="public-hero">{portfolio.coverImage && <img className="public-cover-image" src={mediaUrl(portfolio.coverImage)} alt="" draggable="false" onDragStart={protectMedia} onContextMenu={protectMedia} onError={(event) => { event.currentTarget.hidden = true; }}/>}<div className="public-hero-overlay"/><div className="public-identity">{portfolio.profileImage && <img className="public-profile-image" src={mediaUrl(portfolio.profileImage)} alt={`${portfolio.creator?.name || "Creator"} profile`} draggable="false" onDragStart={protectMedia} onContextMenu={protectMedia} onError={(event) => { event.currentTarget.hidden = true; }}/>}<p className="work-kicker">{portfolio.speciality || "Creator portfolio"}</p><h1>{portfolio.title}</h1><h2>{portfolio.creator?.name}</h2>{portfolio.location && <p>{portfolio.location}</p>}<div className="button-group"><button className="btn-primary" onClick={sharePortfolio} disabled={portfolioShareBusy}>{portfolioShareBusy ? "Sharing…" : "Share portfolio"}</button><a className="btn-secondary" href="#contact">Enquire</a></div></div></section>
        <section id="work" className="public-work-section"><div className="section-header"><div><p className="work-kicker">Selected work</p><h2>Projects</h2></div><p>{pagination?.total || 0} projects</p></div><div className="category-filters" role="group" aria-label="Filter work by category"><button type="button" className={!category ? "active" : ""} aria-pressed={!category} data-state={!category ? "selected" : "idle"} onClick={() => selectCategory("")} onKeyDown={(event) => selectCategoryByKeyboard(event, "")}>All</button>{categories.map((item) => <button type="button" className={category === item ? "active" : ""} aria-pressed={category === item} data-state={category === item ? "selected" : "idle"} key={item} onClick={() => selectCategory(item)} onKeyDown={(event) => selectCategoryByKeyboard(event, item)}>{item}</button>)}</div><div aria-live="polite" aria-busy={loading}>{loading ? <div className="empty-state">Loading projects…</div> : works.length === 0 ? <div className="empty-state"><h3>{category ? `No ${category} work yet` : "No public work yet"}</h3><p>{category ? "This creator has not published work in this category." : "This creator has not published any work yet."}</p></div> : <div className="public-work-grid">{works.map((work) => <article className="public-work-card" key={work._id}><button type="button" className="work-card-open" onClick={() => loadViewer(work._id)} aria-label={`Open ${work.title}`}><div className="public-media">{work.thumbnailPath ? <img loading="lazy" src={mediaUrl(work.thumbnailPath)} alt="" draggable="false" onDragStart={protectMedia} onContextMenu={protectMedia}/> : work.mediaType === "image" ? <img loading="lazy" src={mediaUrl(work.filePath)} alt="" draggable="false" onDragStart={protectMedia} onContextMenu={protectMedia}/> : <div className="video-placeholder"><span>▶</span><p>Open video</p></div>}</div><div className="public-work-content"><p className="work-kicker">{work.category || "Project"}{work.featured ? " · Featured" : ""}</p><h3>{work.title}</h3>{work.description && <p>{work.description}</p>}</div></button><div className="work-card-actions"><button type="button" className={`like-button ${likedWorks.has(work._id) ? "liked" : ""}`} aria-pressed={likedWorks.has(work._id)} aria-label={`${likedWorks.has(work._id) ? "Unlike" : "Like"} ${work.title}`} disabled={likeBusy === work._id} onClick={() => toggleLike(work)}><span aria-hidden="true">{likedWorks.has(work._id) ? "♥" : "♡"}</span> {work.likeCount || 0}</button><ShareActions onShare={() => shareWork(work)} onCopy={() => copyWork(work)}/></div></article>)}</div>}</div>{pagination?.pages > 1 && <div className="pagination"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page} of {pagination.pages}</span><button type="button" disabled={page >= pagination.pages || loading} onClick={() => setPage((value) => value + 1)}>Next</button></div>}</section>
        <section id="about" className="public-about"><p className="work-kicker">About</p><h2>Meet {portfolio.creator?.name}</h2><p>{portfolio.bio || "This creator has chosen to let the work speak for itself."}</p>{links.length > 0 && <div className="profile-social-links" aria-label="Creator links">{links.map(({ key, label, url }) => <a key={key} href={url} target="_blank" rel="noopener noreferrer" aria-label={`${label} (opens in a new tab)`}><SocialIcon name={key}/><span>{label}</span></a>)}</div>}</section>
        <section id="contact" className="public-contact"><div><p className="work-kicker">Contact</p><h2>Start a conversation</h2><div className="public-contact-details">{portfolio.publicEmail && <div><span>Email</span><p>{portfolio.publicEmail}</p></div>}{portfolio.publicPhone && <div><span>Phone</span><p>{portfolio.publicPhone}</p></div>}</div>{(portfolio.publicEmail || portfolio.publicPhone) && <div className="public-contact-actions">{portfolio.publicEmail && <a className="btn-primary" href={`mailto:${portfolio.publicEmail}`}>Email</a>}{portfolio.publicPhone && <a className="btn-secondary" href={`tel:${portfolio.publicPhone}`}>Call</a>}</div>}</div><ContactForm slug={slug}/></section>
        <footer className="public-footer"><div className="public-footer-brand"><span>Created with</span><img src="/wcase-logo.png" alt="WCase"/></div><nav className="public-footer-links" aria-label="Legal"><Link to="/privacy">Privacy</Link><span className="public-footer-separator" aria-hidden="true">·</span><Link to="/terms">Terms</Link></nav></footer>
        {viewer && <WorkViewer work={viewer} mediaUrl={mediaUrl} onClose={closeViewer} onShare={shareWork} onCopy={copyWork} onLike={toggleLike} liked={likedWorks.has(viewer._id)} likeBusy={likeBusy === viewer._id} hasPrevious={Boolean(viewerNavigation.previousId)} hasNext={Boolean(viewerNavigation.nextId)} onPrevious={() => loadViewer(viewerNavigation.previousId)} onNext={() => loadViewer(viewerNavigation.nextId)} navigationBusy={navigationBusy}/>}</main>;
}
