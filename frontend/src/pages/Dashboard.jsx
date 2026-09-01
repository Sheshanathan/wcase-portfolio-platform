import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api";
import ConfirmModal from "../components/ConfirmModal";
import CreatorEnquiries from "../components/CreatorEnquiries";
import ImageCropModal from "../components/ImageCropModal";
import ImageViewer from "../components/ImageViewer";
import CreatorWorkMedia from "../components/CreatorWorkMedia";
import WelcomeIntro from "../components/WelcomeIntro";
import DeleteAccountModal from "../components/DeleteAccountModal";
import useDialogFocus from "../hooks/useDialogFocus";
import { notify } from "../utils/notify";
import { apiFieldErrors, formatFileSize, validateCategory, validateImage, validateMedia, validateOptionalText, validateOptionalUrl, validatePortfolioTitle, validateTags, validateWorkTitle, validateYear } from "../utils/validation";
import { MEDIA_ORIGIN } from "../config";
import { clearSession, getStoredUser } from "../utils/authStorage";

const API_ORIGIN = MEDIA_ORIGIN;
const CATEGORIES = ["", "Weddings", "Events", "Commercial", "Travel", "Reels", "Photography", "Corporate", "Other"];
const CUSTOM_CATEGORY = "__custom__";
const emptyWork = { title: "", description: "", category: "", customCategory: "", projectName: "", year: "", tags: "", media: null, thumbnail: null };
const PROFILE_LINK_FIELDS = [
    { key: "instagram", label: "Instagram" },
    { key: "youtube", label: "YouTube" },
    { key: "facebook", label: "Facebook" },
    { key: "twitter", label: "X / Twitter" },
    { key: "linkedin", label: "LinkedIn" },
    { key: "website", label: "Personal Website", direct: true }
];
const emptyPortfolioForm = { title: "", bio: "", website: "", socialLinks: { instagram: "", youtube: "", facebook: "", twitter: "", linkedin: "" } };
const portfolioFormFrom = (portfolio = {}) => ({
    title: portfolio.title || "",
    bio: portfolio.bio || "",
    website: portfolio.website || "",
    socialLinks: Object.fromEntries(PROFILE_LINK_FIELDS.filter(({ direct }) => !direct).map(({ key }) => [key, portfolio.socialLinks?.[key] || ""]))
});
const categoryError = (form) => {
    if (form.category !== CUSTOM_CATEGORY) return validateCategory(form.category);
    const custom = form.customCategory.trim();
    const validation = validateCategory(custom);
    if (validation) return validation;
    if (CATEGORIES.some((item) => item && item.toLocaleLowerCase("en-US") === custom.toLocaleLowerCase("en-US"))) return "Choose the matching category from the list instead";
    return "";
};
const resolvedCategory = (form) => form.category === CUSTOM_CATEGORY ? form.customCategory.trim() : form.category;

function Dashboard() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = getStoredUser();
    const [showWelcome, setShowWelcome] = useState(() => location.state?.showWelcome === true);
    const welcomeName = location.state?.creatorName || user?.name;
    const dismissWelcome = useCallback(() => setShowWelcome(false), []);
    const [portfolio, setPortfolio] = useState(null);
    const [works, setWorks] = useState([]);
    const [workStats, setWorkStats] = useState({ totalViews: 0, totalLikes: 0 });
    const [totalEnquiries, setTotalEnquiries] = useState(null);
    const [portfolioForm, setPortfolioForm] = useState(emptyPortfolioForm);
    const [workForm, setWorkForm] = useState(emptyWork);
    const [editWorkForm, setEditWorkForm] = useState({ ...emptyWork, removeThumbnail: false });
    const [editingPortfolio, setEditingPortfolio] = useState(false);
    const [editingWorkId, setEditingWorkId] = useState(null);
    const [managingImages, setManagingImages] = useState(false);
    const [addingWork, setAddingWork] = useState(false);
    const [profileImage, setProfileImage] = useState(null);
    const [coverImage, setCoverImage] = useState(null);
    const [profilePreview, setProfilePreview] = useState("");
    const [coverPreview, setCoverPreview] = useState("");
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState("");
    const [touched, setTouched] = useState({});
    const [portfolioApiErrors, setPortfolioApiErrors] = useState({});
    const [workApiErrors, setWorkApiErrors] = useState({});
    const [editApiErrors, setEditApiErrors] = useState({});
    const [imageErrors, setImageErrors] = useState({ profile: "", cover: "" });
    const [confirm, setConfirm] = useState({ open: false });
    const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [cropRequest, setCropRequest] = useState(null);
    const [viewingImage, setViewingImage] = useState(null);
    const mediaInputRef = useRef(null);
    const addWorkCloseRef = useRef(null);
    const portfolioCloseRef = useRef(null);
    const imagesCloseRef = useRef(null);
    const copyTimerRef = useRef(null);
    const requestLockRef = useRef(false);
    const initialLoadStartedRef = useRef(false);
    const workDraftDirty = Boolean(workForm.media || workForm.thumbnail || ["title", "description", "category", "customCategory", "projectName", "year", "tags"].some((field) => workForm[field].trim()));
    const clearAddWorkDraft = () => {
        setWorkForm(emptyWork);
        setTouched((current) => ({ ...current, work: false, media: false }));
        setWorkApiErrors({});
        if (mediaInputRef.current) mediaInputRef.current.value = "";
    };
    const requestCloseAddWork = () => {
        if (busy === "work") return;
        if (!workDraftDirty) {
            clearAddWorkDraft();
            setAddingWork(false);
            return;
        }
        setConfirm({
            open: true,
            title: "Discard this work?",
            message: "Your entered details and selected files will be removed.",
            confirmText: "Discard Work",
            cancelText: "Keep Editing",
            danger: true,
            action: async () => { clearAddWorkDraft(); setAddingWork(false); }
        });
    };
    const addWorkDialogRef = useDialogFocus({ open: addingWork && !confirm.open, onClose: requestCloseAddWork, canClose: busy !== "work", initialFocusRef: addWorkCloseRef });
    const closePortfolioEditor = () => {
        if (busy === "portfolio") return;
        setPortfolioForm(portfolioFormFrom(portfolio));
        setPortfolioApiErrors({});
        setEditingPortfolio(false);
    };
    const imageManagerBusy = ["images", "edit-profile", "edit-cover"].includes(busy);
    const clearImageDraft = () => {
        setProfileImage(null);
        setCoverImage(null);
        setProfilePreview("");
        setCoverPreview("");
        setImageErrors({ profile: "", cover: "" });
    };
    const closeImageManager = () => {
        if (imageManagerBusy) return;
        if (!profileImage && !coverImage) {
            clearImageDraft();
            setManagingImages(false);
            return;
        }
        setConfirm({
            open: true,
            title: "Discard image changes?",
            message: "Your selected profile and cover image changes have not been saved.",
            confirmText: "Discard Changes",
            cancelText: "Keep Editing",
            danger: true,
            action: async () => { clearImageDraft(); setManagingImages(false); }
        });
    };
    const portfolioDialogRef = useDialogFocus({ open: editingPortfolio && !confirm.open, onClose: closePortfolioEditor, canClose: busy !== "portfolio", initialFocusRef: portfolioCloseRef });
    const imagesDialogRef = useDialogFocus({ open: managingImages && !cropRequest && !confirm.open, onClose: closeImageManager, canClose: !imageManagerBusy, initialFocusRef: imagesCloseRef });

    useEffect(() => {
        if (location.state?.showWelcome) navigate(location.pathname, { replace: true, state: null });
    }, [location.pathname, location.state, navigate]);

    const setMessage = useCallback((text) => {
        if (!text) return;
        const isError = /failed|cannot|could not|please|invalid|unsupported|required|choose|exceed|too large|request failed/i.test(text);
        notify(isError ? "error" : "success", text);
    }, []);

    const portfolioTitleError = validatePortfolioTitle(portfolioForm.title);
    const portfolioBioError = validateOptionalText(portfolioForm.bio, { label: "Bio", max: 500 });
    const portfolioLinkErrors = Object.fromEntries(PROFILE_LINK_FIELDS.map(({ key, label, direct }) => [key, validateOptionalUrl(direct ? portfolioForm[key] : portfolioForm.socialLinks[key], label)]));
    const portfolioLinksValid = Object.values(portfolioLinkErrors).every((error) => !error);
    const workTitleError = validateWorkTitle(workForm.title);
    const workDescriptionError = validateOptionalText(workForm.description, { label: "Description", max: 1000 });
    const workProjectError = validateOptionalText(workForm.projectName, { label: "Project or client", max: 120 });
    const workYearError = validateYear(workForm.year);
    const workTagsError = validateTags(workForm.tags);
    const workCategoryError = categoryError(workForm);
    const mediaError = workForm.media ? validateMedia(workForm.media) : "Please choose an image or video";
    const thumbnailError = workForm.thumbnail ? validateImage(workForm.thumbnail) : "";
    const workValid = !workTitleError && !workDescriptionError && !workProjectError && !workYearError && !workTagsError && !workCategoryError && !mediaError && !thumbnailError;

    const load = useCallback(async () => {
        try {
            const [portfolioResult, worksResult] = await Promise.allSettled([api.get("/portfolios/me"), api.get("/works/me")]);
            if (portfolioResult.status === "fulfilled") {
                const p = portfolioResult.value.data.portfolio;
                setPortfolio(p);
                setPortfolioForm(portfolioFormFrom(p));
            } else if (portfolioResult.reason.response?.status !== 404) setMessage(portfolioResult.reason.response?.data?.message || "Failed to load portfolio");
            if (worksResult.status === "fulfilled") {
                setWorks(worksResult.value.data.works || []);
                setWorkStats({ totalViews: Math.max(0, Number(worksResult.value.data.summary?.totalViews) || 0), totalLikes: Math.max(0, Number(worksResult.value.data.summary?.totalLikes) || 0) });
            }
        } finally { setLoading(false); }
    }, [setMessage]);

    useEffect(() => {
        if (initialLoadStartedRef.current) return;
        initialLoadStartedRef.current = true;
        load();
    }, [load]);
    const refreshWorkCounts = useCallback(async () => {
        const [worksResult, portfolioResult] = await Promise.allSettled([api.get("/works/me"), api.get("/portfolios/me")]);
        if (worksResult.status === "fulfilled") {
            const { data } = worksResult.value;
            const latestById = new Map((data.works || []).map((work) => [work._id, work]));
            setWorks((current) => current.map((work) => {
                const latest = latestById.get(work._id);
                return latest ? { ...work, ...latest, viewCount: Math.max(0, Number(latest.viewCount) || 0), likeCount: Math.max(0, Number(latest.likeCount) || 0) } : work;
            }));
            setWorkStats({ totalViews: Math.max(0, Number(data.summary?.totalViews) || 0), totalLikes: Math.max(0, Number(data.summary?.totalLikes) || 0) });
        }
        if (portfolioResult.status === "fulfilled") {
            const latest = portfolioResult.value.data.portfolio;
            const latestViews = Math.max(0, Number(latest?.viewCount) || 0);
            setPortfolio((current) => current ? { ...current, profileImage: latest?.profileImage || "", coverImage: latest?.coverImage || "", viewCount: latestViews } : current);
        }
    }, []);
    useEffect(() => {
        const refresh = () => { if (document.visibilityState === "visible") void refreshWorkCounts(); };
        window.addEventListener("focus", refresh);
        document.addEventListener("visibilitychange", refresh);
        const interval = window.setInterval(refresh, 30_000);
        return () => { window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); window.clearInterval(interval); };
    }, [refreshWorkCounts]);
    useEffect(() => () => {
        if (profilePreview.startsWith("blob:")) URL.revokeObjectURL(profilePreview);
        if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
        if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    }, [profilePreview, coverPreview]);

    const ask = (options) => setConfirm({ open: true, ...options });
    const closeConfirm = () => setConfirm({ open: false });
    const runConfirmed = async () => {
        if (!confirm.action || requestLockRef.current) return;
        requestLockRef.current = true;
        setBusy("confirm");
        try {
            await confirm.action();
            closeConfirm();
        } catch (error) {
            setMessage(error.response?.data?.message || "Request failed. Please try again.");
        } finally { requestLockRef.current = false; setBusy(""); }
    };

    const savePortfolio = async (event) => {
        event.preventDefault();
        setTouched((v) => ({ ...v, portfolio: true }));
        setPortfolioApiErrors({});
        if (portfolioTitleError || portfolioBioError || !portfolioLinksValid || busy || requestLockRef.current) return;
        requestLockRef.current = true;
        setBusy("portfolio"); setMessage("");
        try {
            const baseFields = { title: portfolioForm.title.trim(), bio: portfolioForm.bio.trim() };
            const response = portfolio
                ? await api.put("/portfolios/me", { ...baseFields, website: portfolioForm.website.trim(), socialLinks: Object.fromEntries(Object.entries(portfolioForm.socialLinks).map(([key, value]) => [key, value.trim()])) })
                : await api.post("/portfolios", baseFields);
            setPortfolio(response.data.portfolio); setPortfolioForm(portfolioFormFrom(response.data.portfolio)); setEditingPortfolio(false);
            setMessage(portfolio ? "Portfolio updated successfully" : "Portfolio created successfully");
        } catch (error) { setPortfolioApiErrors(apiFieldErrors(error)); setMessage(error.response?.data?.message || "Failed to save portfolio"); }
        finally { requestLockRef.current = false; setBusy(""); }
    };

    const togglePortfolio = () => ask({
        title: portfolio.isPublished ? "Unpublish portfolio?" : "Publish portfolio?",
        message: portfolio.isPublished ? "Your public link will stop showing your portfolio until you publish it again." : "Your portfolio and published works will become available through your public link.",
        confirmText: portfolio.isPublished ? "Unpublish" : "Publish",
        action: async () => {
            const response = await api.put("/portfolios/me", { isPublished: !portfolio.isPublished });
            setPortfolio(response.data.portfolio);
            localStorage.setItem("wcasePortfolioChanged", String(Date.now()));
            setMessage(response.data.portfolio.isPublished ? "Portfolio published" : "Portfolio unpublished");
        }
    });

    const selectImage = (type, file) => {
        if (!file) return;
        const error = validateImage(file);
        if (error) { setImageErrors((current) => ({ ...current, [type]: error })); setMessage(error); return; }
        setImageErrors((current) => ({ ...current, [type]: "" }));
        setCropRequest({ type, file });
    };

    const editSavedImage = async (type, saved) => {
        if (!saved || busy) return;
        setBusy(`edit-${type}`);
        try {
            const response = await fetch(`${API_ORIGIN}${saved}`);
            if (!response.ok) throw new Error("IMAGE_FETCH_FAILED");
            const blob = await response.blob();
            const mime = blob.type || "image/jpeg";
            const extension = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
            setCropRequest({ type, file: new File([blob], `${type}.${extension}`, { type: mime }) });
        } catch { setMessage("The saved image could not be opened for editing. Please choose another image."); }
        finally { setBusy(""); }
    };

    const applyCrop = (file) => {
        const preview = URL.createObjectURL(file);
        if (cropRequest.type === "profile") { if (profilePreview.startsWith("blob:")) URL.revokeObjectURL(profilePreview); setProfileImage(file); setProfilePreview(preview); }
        else { if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview); setCoverImage(file); setCoverPreview(preview); }
        setCropRequest(null); setMessage("");
    };

    const saveImages = async () => {
        if (requestLockRef.current) return;
        const selections = [["profile", profileImage], ["cover", coverImage]].filter(([, file]) => file);
        if (!selections.length) return;
        const validationErrors = Object.fromEntries(selections.map(([type, file]) => [type, validateImage(file)]));
        setImageErrors((current) => ({ ...current, ...validationErrors }));
        const firstError = Object.values(validationErrors).find(Boolean);
        if (firstError) { setMessage(firstError); return; }
        requestLockRef.current = true;
        setBusy("images"); setMessage("");
        const saved = [], failed = [];
        try {
            for (const [type, file] of selections) {
                try {
                    const data = new FormData(); data.append("image", file);
                    const response = await api.put(`/portfolios/me/${type}-image`, data);
                    setPortfolio(response.data.portfolio);
                    setImageErrors((current) => ({ ...current, [type]: "" }));
                    if (type === "profile") { setProfileImage(null); setProfilePreview(""); }
                    else { setCoverImage(null); setCoverPreview(""); }
                    saved.push(type);
                } catch (error) {
                    const message = error.response?.data?.message || `${type === "profile" ? "Profile" : "Cover"} image upload failed`;
                    setImageErrors((current) => ({ ...current, [type]: message }));
                    failed.push({ type, message });
                }
            }
            if (failed.length) setMessage(saved.length ? `${saved.map((type) => type === "profile" ? "Profile" : "Cover").join(" and ")} saved. ${failed.map(({ type }) => type === "profile" ? "Profile" : "Cover").join(" and ")} image upload failed.` : failed[0].message);
            else setMessage(saved.length === 2 ? "Profile and cover images uploaded successfully" : `${saved[0] === "profile" ? "Profile" : "Cover"} image uploaded successfully`);
        } finally { requestLockRef.current = false; setBusy(""); }
    };

    const removeImage = (type) => ask({
        title: `Remove ${type} image?`, message: "This will remove the image from your public portfolio.", confirmText: "Remove Image", danger: true,
        action: async () => {
            const response = await api.delete(`/portfolios/me/${type}-image`);
            setPortfolio(response.data.portfolio);
            if (type === "profile") { setProfileImage(null); setProfilePreview(""); } else { setCoverImage(null); setCoverPreview(""); }
            setMessage(`${type === "profile" ? "Profile" : "Cover"} image removed`);
        }
    });

    const selectMedia = (file) => {
        if (!file) { setWorkForm((v) => ({ ...v, media: null })); return; }
        const error = validateMedia(file);
        if (error) { setWorkApiErrors((current) => ({ ...current, media: error })); setMessage(error); setWorkForm((v) => ({ ...v, media: null })); return; }
        setWorkApiErrors((current) => ({ ...current, media: "" })); setWorkForm((v) => ({ ...v, media: file })); setTouched((v) => ({ ...v, media: true })); setMessage("");
    };

    const addWork = async (event) => {
        event.preventDefault(); setTouched((v) => ({ ...v, work: true, media: true }));
        setWorkApiErrors({});
        if (!workValid || busy || requestLockRef.current) return;
        requestLockRef.current = true;
        setBusy("work"); setMessage("");
        try {
            const data = new FormData(); data.append("title", workForm.title.trim()); data.append("description", workForm.description.trim()); data.append("category", resolvedCategory(workForm)); data.append("projectName", workForm.projectName.trim()); data.append("year", workForm.year); data.append("tags", JSON.stringify(workForm.tags.split(",").map((v) => v.trim()).filter(Boolean))); data.append("media", workForm.media); if (workForm.thumbnail) data.append("thumbnail", workForm.thumbnail);
            const response = await api.post("/works", data);
            setWorks((v) => [...v, response.data.work]); setWorkForm(emptyWork); setTouched((v) => ({ ...v, work: false, media: false })); setAddingWork(false);
            if (mediaInputRef.current) mediaInputRef.current.value = "";
            setMessage("Work added successfully. It is hidden until you publish it.");
            const newWork = response.data.work;
            ask({
                title: "Publish this work?",
                message: "Your work was added successfully. Would you like to make it visible on your public portfolio?",
                confirmText: "Publish Work",
                action: async () => {
                    const publishResponse = await api.put(`/works/${newWork._id}`, { isPublished: true });
                    setWorks((v) => v.map((w) => w._id === newWork._id ? publishResponse.data.work : w));
                    localStorage.setItem("wcasePortfolioChanged", String(Date.now()));
                    setMessage("Work published successfully");
                }
            });
        } catch (e) { setWorkApiErrors(apiFieldErrors(e)); setMessage(e.response?.data?.message || "Failed to add work"); }
        finally { requestLockRef.current = false; setBusy(""); }
    };

    const startEdit = (work) => { const existingCategory = work.category || ""; const isCustom = existingCategory && !CATEGORIES.includes(existingCategory); setEditApiErrors({}); setEditingWorkId(work._id); setEditWorkForm({ title: work.title || "", description: work.description || "", category: isCustom ? CUSTOM_CATEGORY : existingCategory, customCategory: isCustom ? existingCategory : "", projectName: work.projectName || "", year: work.year || "", tags: (work.tags || []).join(", "), media: null, thumbnail: null, removeThumbnail: false }); };
    const saveWork = async (id) => {
        if (requestLockRef.current) return;
        const titleError = validateWorkTitle(editWorkForm.title);
        if (titleError) { setMessage(titleError); return; }
        const descriptionError = validateOptionalText(editWorkForm.description, { label: "Description", max: 1000 });
        const projectError = validateOptionalText(editWorkForm.projectName, { label: "Project or client", max: 120 });
        const editThumbnailError = editWorkForm.thumbnail ? validateImage(editWorkForm.thumbnail) : "";
        if (descriptionError || projectError || editThumbnailError) { setMessage(descriptionError || projectError || editThumbnailError); return; }
        const yearError = validateYear(editWorkForm.year), tagsError = validateTags(editWorkForm.tags);
        const editCategoryError = categoryError(editWorkForm);
        if (yearError || tagsError || editCategoryError) { setMessage(yearError || tagsError || editCategoryError); return; }
        requestLockRef.current = true;
        setBusy(`edit-${id}`);
        setEditApiErrors({});
        try {
            const details = { title: editWorkForm.title.trim(), description: editWorkForm.description.trim(), category: resolvedCategory(editWorkForm), projectName: editWorkForm.projectName.trim(), year: editWorkForm.year, tags: editWorkForm.tags.split(",").map((v) => v.trim()).filter(Boolean) };
            let response = await api.put(`/works/${id}`, details);
            if (editWorkForm.thumbnail) { const data = new FormData(); data.append("thumbnail", editWorkForm.thumbnail); response = await api.put(`/works/${id}/thumbnail`, data); }
            else if (editWorkForm.removeThumbnail) response = await api.delete(`/works/${id}/thumbnail`);
            setWorks((v) => v.map((w) => w._id === id ? response.data.work : w)); setEditingWorkId(null); setMessage("Work updated successfully");
        } catch (e) { setEditApiErrors(apiFieldErrors(e)); setMessage(e.response?.data?.message || "Failed to update work"); } finally { requestLockRef.current = false; setBusy(""); }
    };

    const toggleWork = (work) => ask({
        title: work.isPublished ? "Hide this work?" : "Publish this work?",
        message: work.isPublished ? "This work will no longer appear on your public portfolio." : "This work will appear publicly when your portfolio is published.",
        confirmText: work.isPublished ? "Hide Work" : "Publish Work",
        action: async () => { const response = await api.put(`/works/${work._id}`, { isPublished: !work.isPublished }); setWorks((v) => v.map((w) => w._id === work._id ? response.data.work : w)); localStorage.setItem("wcasePortfolioChanged", String(Date.now())); setMessage(response.data.work.isPublished ? "Work published" : "Work hidden"); }
    });

    const deleteWork = (work) => ask({ title: "Delete work?", message: `“${work.title}” and its uploaded media will be permanently deleted. This cannot be undone.`, confirmText: "Delete Work", danger: true,
        action: async () => { await api.delete(`/works/${work._id}`); setWorks((v) => v.filter((w) => w._id !== work._id)); setWorkStats((current) => ({ totalViews: Math.max(0, current.totalViews - (Number(work.viewCount) || 0)), totalLikes: Math.max(0, current.totalLikes - (Number(work.likeCount) || 0)) })); localStorage.setItem("wcasePortfolioChanged", String(Date.now())); setMessage("Work deleted successfully"); }
    });

    const copyLink = async () => {
        if (copied) return;
        try {
            await navigator.clipboard.writeText(`${window.location.origin}/p/${portfolio.publicSlug}`);
            setCopied(true);
            if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
            copyTimerRef.current = window.setTimeout(() => setCopied(false), 2000);
        } catch { setMessage("Could not copy public link"); }
    };
    const openPublicPortfolio = () => window.open(`/p/${portfolio.publicSlug}`, "_blank", "noopener,noreferrer");
    const openWorkImage = (event) => {
        const image = event.target.closest?.(".work-card .work-media img");
        if (!image || image.closest("button")) return;
        setViewingImage({ src: image.currentSrc || image.src, alt: image.alt || "Work image" });
    };
    const preventMediaDoubleClick = (event) => {
        if (event.target.closest?.(".work-card .work-media video")) event.preventDefault();
    };
    const logout = () => ask({ title: "Log out?", message: "You will need to sign in again to manage your portfolio.", confirmText: "Logout", action: async () => { clearSession(); navigate("/login", { replace: true }); } });
    const accountDeleted = (message) => { clearSession(); notify("success", message); navigate("/login", { replace: true }); };

    const publishedCount = useMemo(() => works.filter((w) => w.isPublished).length, [works]);
    const publicCount = portfolio?.isPublished ? publishedCount : 0;

    const getWorkStatus = (work) => {
        if (!work.isPublished) return { label: "Hidden", className: "status-private" };
        if (!portfolio?.isPublished) return { label: "Ready · Portfolio Private", className: "status-ready" };
        return { label: "Published", className: "status-published" };
    };
    if (loading) return <main className="dashboard dashboard-loading">
        {showWelcome && <WelcomeIntro creatorName={welcomeName} onComplete={dismissWelcome} />}
        <div className="loading-page"><div className="loading-spinner" /><span className="sr-only">Loading creator dashboard</span></div>
    </main>;

    return <main className="dashboard" onClick={openWorkImage} onDoubleClickCapture={preventMediaDoubleClick}>
        {showWelcome && <WelcomeIntro creatorName={welcomeName} onComplete={dismissWelcome} />}
        <div className="dashboard-topbar"><a className="dashboard-brand" href="/" aria-label="WCase home"><img src="/wcase-logo.png" alt="WCase" /></a><header className="dashboard-header"><div className="dashboard-controls"><h1>{user?.name || "Creator"}</h1><button type="button" className="btn-secondary" onClick={logout}>Logout</button></div></header></div>

        {!portfolio ? <section className="panel compact-panel"><div className="section-copy"><h2>Create Your Portfolio</h2><p className="muted-text">Create your public space before adding work.</p></div><form className="form compact-form" onSubmit={savePortfolio} noValidate>
            <div><label htmlFor="create-portfolio-title">Portfolio Title *</label><input id="create-portfolio-title" className={`form-input ${touched.portfolio && (portfolioTitleError || portfolioApiErrors.title) ? "input-error" : ""}`} value={portfolioForm.title} maxLength={100} onChange={(e) => { setPortfolioForm((v) => ({ ...v, title: e.target.value })); setPortfolioApiErrors((current) => ({ ...current, title: "" })); }} aria-invalid={Boolean(touched.portfolio && (portfolioTitleError || portfolioApiErrors.title))} aria-describedby="create-portfolio-title-error"/><div className="field-meta"><span id="create-portfolio-title-error" className="field-error">{touched.portfolio ? portfolioTitleError || portfolioApiErrors.title : ""}</span><span>{portfolioForm.title.length}/100</span></div></div>
            <div><label htmlFor="create-portfolio-bio">Bio</label><textarea id="create-portfolio-bio" className={`form-input textarea ${portfolioBioError || portfolioApiErrors.bio ? "input-error" : ""}`} value={portfolioForm.bio} maxLength={500} onChange={(e) => { setPortfolioForm((v) => ({ ...v, bio: e.target.value })); setPortfolioApiErrors((current) => ({ ...current, bio: "" })); }} aria-invalid={Boolean(portfolioBioError || portfolioApiErrors.bio)} aria-describedby="create-portfolio-bio-error"/><div className="field-meta"><span id="create-portfolio-bio-error" className="field-error">{portfolioBioError || portfolioApiErrors.bio}</span><span>{portfolioForm.bio.length}/500</span></div></div>
            <button className="btn-primary" disabled={!!portfolioTitleError || !!portfolioBioError || busy === "portfolio"}>{busy === "portfolio" ? "Creating..." : "Create Portfolio"}</button>
        </form></section> : <>
            <div className="dashboard-primary-grid"><section className="panel compact-panel portfolio-panel">
                <div className="portfolio-header"><div><span className={portfolio.isPublished ? "status-published" : "status-private"}>{portfolio.isPublished ? "Published" : "Private"}</span><h2>{portfolio.title}</h2><p className="muted-text">{portfolio.bio || "No bio added"}</p><p className="portfolio-stat">{works.length} works · {publicCount} public</p><p className="portfolio-stat creator-portfolio-stats"><span>Total Views {workStats.totalViews}</span><span>Total Likes {workStats.totalLikes}</span></p></div><div className="button-group"><button className="btn-secondary" aria-haspopup="dialog" aria-expanded={editingPortfolio} aria-controls="portfolio-edit-dialog" onClick={() => setEditingPortfolio(true)}>Edit</button><button className="btn-primary" onClick={togglePortfolio}>{portfolio.isPublished ? "Unpublish" : "Publish"}</button></div></div>
                <div className="expandable-section-control portfolio-image-toggle"><div><strong>Profile &amp; Cover Images</strong><p className="muted-text">Manage the images shown on your public portfolio.</p></div><button type="button" className="btn-secondary section-toggle-button" aria-haspopup="dialog" aria-expanded={managingImages} aria-controls="portfolio-image-dialog" onClick={() => setManagingImages(true)}>{portfolio.profileImage || portfolio.coverImage ? "Manage Images" : "Add Images"}</button></div>
                <div className="public-link-box"><div className="public-link-heading"><div><p>Public Portfolio Link</p><strong>{portfolio.isPublished ? "Published" : "Private"}</strong></div><span className={portfolio.isPublished ? "status-published" : "status-private"}>{portfolio.isPublished ? "Live" : "Offline"}</span></div><a className="public-link-url" href={`${window.location.origin}/p/${portfolio.publicSlug}`} target="_blank" rel="noreferrer">{`${window.location.origin}/p/${portfolio.publicSlug}`}</a><div className="public-link-actions"><button type="button" className="btn-secondary public-copy-button" onClick={copyLink} disabled={copied}>{copied ? "Link copied ✓" : "Copy Link"}</button><button type="button" className="btn-primary" onClick={openPublicPortfolio}>View Portfolio</button></div></div>
            </section>

            <div className="creator-dashboard-side">
                <section className="panel compact-panel add-work-panel collapsed"><div className="section-copy expandable-section-header"><div><h2>Add Work</h2><p className="muted-text">Upload an image or video directly to your portfolio.</p></div><button type="button" className="btn-primary section-toggle-button" aria-haspopup="dialog" aria-expanded={addingWork} aria-controls="add-work-dialog" onClick={() => setAddingWork(true)}>Add Work</button></div></section>
                <section className="panel compact-panel creator-analytics" aria-labelledby="creator-analytics-heading"><div className="section-header"><div><p className="eyebrow">INSIGHTS</p><h2 id="creator-analytics-heading">Analytics</h2></div></div><div className="creator-analytics-grid"><article className="creator-stat-card"><span>Total Works</span><strong>{works.length}</strong></article><article className="creator-stat-card"><span>Published Works</span><strong>{publishedCount}</strong></article><article className="creator-stat-card"><span>Total Likes</span><strong>{workStats.totalLikes}</strong></article><article className="creator-stat-card"><span>Portfolio Views</span><strong>{Math.max(0, Number(portfolio.viewCount) || 0)}</strong></article><article className="creator-stat-card"><span>Enquiries</span><strong>{totalEnquiries ?? "—"}</strong></article></div></section>
            </div></div>

            {editingPortfolio && <div className="modal-backdrop dashboard-editor-modal-backdrop" role="presentation"><section ref={portfolioDialogRef} id="portfolio-edit-dialog" tabIndex={-1} className="panel compact-panel dashboard-editor-modal portfolio-edit-modal" role="dialog" aria-modal="true" aria-labelledby="portfolio-edit-dialog-title"><div className="dashboard-editor-modal-header"><div><h2 id="portfolio-edit-dialog-title">Edit Portfolio</h2><p className="muted-text">Update your public portfolio information and social links.</p></div><button ref={portfolioCloseRef} type="button" className="modal-close dashboard-editor-modal-close" onClick={closePortfolioEditor} disabled={busy === "portfolio"} aria-label="Close portfolio editor" title="Close">×</button></div><form className="form compact-form portfolio-edit-form" onSubmit={savePortfolio} noValidate>
                <div><label htmlFor="edit-portfolio-title">Portfolio Title *</label><input id="edit-portfolio-title" className={`form-input ${portfolioTitleError || portfolioApiErrors.title ? "input-error" : ""}`} value={portfolioForm.title} maxLength={100} onChange={(e) => { setPortfolioForm((v) => ({ ...v, title: e.target.value })); setPortfolioApiErrors((current) => ({ ...current, title: "" })); }} aria-invalid={Boolean(portfolioTitleError || portfolioApiErrors.title)}/><div className="field-meta"><span className="field-error">{portfolioTitleError || portfolioApiErrors.title}</span><span>{portfolioForm.title.length}/100</span></div></div>
                <div><label htmlFor="edit-portfolio-bio">Bio</label><textarea id="edit-portfolio-bio" className={`form-input textarea ${portfolioBioError || portfolioApiErrors.bio ? "input-error" : ""}`} value={portfolioForm.bio} maxLength={500} onChange={(e) => { setPortfolioForm((v) => ({ ...v, bio: e.target.value })); setPortfolioApiErrors((current) => ({ ...current, bio: "" })); }} aria-invalid={Boolean(portfolioBioError || portfolioApiErrors.bio)}/><div className="field-meta"><span className="field-error">{portfolioBioError || portfolioApiErrors.bio}</span><span>{portfolioForm.bio.length}/500</span></div></div>
                <div className="portfolio-social-fields"><h3>Social links</h3>{PROFILE_LINK_FIELDS.map(({ key, label, direct }) => {
                    const fieldName = direct ? key : `socialLinks.${key}`;
                    const value = direct ? portfolioForm[key] : portfolioForm.socialLinks[key];
                    const error = portfolioLinkErrors[key] || portfolioApiErrors[fieldName];
                    return <div key={key}><label htmlFor={`edit-portfolio-${key}`}>{label}</label><input id={`edit-portfolio-${key}`} className={`form-input ${error ? "input-error" : ""}`} type="url" inputMode="url" maxLength={300} placeholder="https://" value={value} onChange={(event) => { const nextValue = event.target.value; setPortfolioForm((current) => direct ? { ...current, [key]: nextValue } : { ...current, socialLinks: { ...current.socialLinks, [key]: nextValue } }); setPortfolioApiErrors((current) => ({ ...current, [fieldName]: "" })); }} aria-invalid={Boolean(error)} aria-describedby={`edit-portfolio-${key}-error`}/><p id={`edit-portfolio-${key}-error`} className="field-error">{error}</p></div>;
                })}</div>
                <div className="button-group"><button className="btn-primary" disabled={!!portfolioTitleError || !!portfolioBioError || !portfolioLinksValid || busy === "portfolio"}>Save Changes</button><button type="button" className="btn-secondary" onClick={closePortfolioEditor} disabled={busy === "portfolio"}>Cancel</button></div>
            </form></section></div>}

            {managingImages && <div className="modal-backdrop dashboard-editor-modal-backdrop" role="presentation"><section ref={imagesDialogRef} id="portfolio-image-dialog" tabIndex={-1} className="panel compact-panel dashboard-editor-modal image-manager-modal" role="dialog" aria-modal="true" aria-labelledby="portfolio-image-dialog-title"><div className="dashboard-editor-modal-header"><div><h2 id="portfolio-image-dialog-title">Profile &amp; Cover Images</h2><p className="muted-text">Manage the images shown on your public portfolio.</p></div><button ref={imagesCloseRef} type="button" className="modal-close dashboard-editor-modal-close" onClick={closeImageManager} disabled={imageManagerBusy} aria-label="Close image manager" title="Close">×</button></div><div className="portfolio-images">{[["profile", profileImage, profilePreview, portfolio.profileImage], ["cover", coverImage, coverPreview, portfolio.coverImage]].map(([type, selected, preview, saved]) => <div className="image-upload-card" key={type}><div className="image-card-header"><h3>{type === "profile" ? "Profile Image" : "Cover Image"}</h3><p>{type === "profile" ? "Shown beside your portfolio identity." : "Banner displayed at the top of your portfolio."}</p></div><div className="image-preview-area image-preview-with-action">{preview || saved ? <><img className={type === "profile" ? "profile-image" : "cover-image"} src={preview || `${API_ORIGIN}${saved}`} alt={`${type} preview`} />{saved && !selected && <button type="button" className="remove-image-icon" aria-label={`Remove ${type} image`} title={`Remove ${type} image`} onClick={() => removeImage(type)}>×</button>}</> : <label className="empty-image-picker" htmlFor={`${type}ImageInput`}><span className="upload-circle" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8.5 5 10 3h4l1.5 2H19a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3h3.5ZM12 8a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Zm0 2a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z" fill="currentColor"/></svg></span><strong>Add {type === "profile" ? "Profile" : "Cover"} Image</strong><span>JPG, PNG or WebP · Max 5 MB</span></label>}</div>
                {selected ? <div className="selected-image-status"><span>✓</span><p>{selected.name} · {formatFileSize(selected.size)}</p></div> : saved && <div className="upload-success"><span className="upload-success-icon">✓</span><span>{type === "profile" ? "Profile" : "Cover"} image uploaded</span><button type="button" className="view-full-image" onClick={() => editSavedImage(type, saved)} disabled={busy === `edit-${type}`}>{busy === `edit-${type}` ? "Opening…" : "Edit Image"}</button></div>}
                <input id={`${type}ImageInput`} className="hidden-file-input" type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => selectImage(type, e.target.files?.[0])} />
                {imageErrors[type] && <p className="field-error" role="alert">{imageErrors[type]}</p>}<div className="image-action-group"><label className="change-image-button" htmlFor={`${type}ImageInput`}>{selected || saved ? "Choose Another" : "Choose Image"}</label></div>
            </div>)}</div><div className="image-manager-save"><button type="button" className="btn-primary" onClick={saveImages} disabled={(!profileImage && !coverImage) || busy === "images"}>{busy === "images" ? "Saving Images..." : "Save Images"}</button></div></section></div>}

            {addingWork && <div className="modal-backdrop add-work-modal-backdrop" role="presentation"><section ref={addWorkDialogRef} id="add-work-dialog" tabIndex={-1} className="panel compact-panel add-work-modal" role="dialog" aria-modal="true" aria-labelledby="add-work-dialog-title"><div className="add-work-modal-header"><div><h2 id="add-work-dialog-title">Add Work</h2><p className="muted-text">Upload an image or video directly to your portfolio.</p></div><button ref={addWorkCloseRef} type="button" className="modal-close add-work-modal-close" onClick={requestCloseAddWork} disabled={busy === "work"} aria-label="Close Add Work" title="Close">×</button></div><form id="add-work-form" className="form work-form" onSubmit={addWork} noValidate>
                <div className="work-title-field"><label htmlFor="new-work-title">Work Title *</label><input id="new-work-title" className={`form-input ${touched.work && (workTitleError || workApiErrors.title) ? "input-error" : ""}`} value={workForm.title} maxLength={120} onChange={(e) => { setWorkForm((v) => ({ ...v, title: e.target.value })); setTouched((v) => ({ ...v, work: true })); setWorkApiErrors((current) => ({ ...current, title: "" })); }} placeholder="e.g. Wedding Cinematic Highlight" aria-invalid={Boolean(touched.work && (workTitleError || workApiErrors.title))}/><div className="field-meta">{touched.work && (workTitleError || workApiErrors.title) ? <span className="field-error">{workTitleError || workApiErrors.title}</span> : <span /> }<span>{workForm.title.length}/120</span></div></div>
                <div className="media-field"><label>Media *</label>{workForm.media ? <div className="selected-media-box"><div className="selected-media-info"><span className="selected-media-icon">{workForm.media.type?.startsWith("video") ? "▶" : "▧"}</span><div><strong>{workForm.media.name}</strong><span>{`${workForm.media.type?.startsWith("video") ? "Video" : "Image"} · ${formatFileSize(workForm.media.size)}`}</span></div></div><button type="button" className="remove-media-button" aria-label="Remove selected media" title="Remove selected media" onClick={() => { setWorkForm((v) => ({ ...v, media: null })); if (mediaInputRef.current) mediaInputRef.current.value = ""; }}>×</button></div> : <label className={`media-picker ${touched.media && (mediaError || workApiErrors.media) ? "input-error" : ""}`} htmlFor="mediaInput"><span className="media-picker-icon">+</span><span className="media-picker-copy"><strong>Choose Media</strong><small>Image or video · JPG, PNG, WebP, MP4, WebM, MOV, M4V · Max 200 MB</small></span></label>}<input ref={mediaInputRef} id="mediaInput" className="hidden-file-input" type="file" accept=".mp4,.webm,.mov,.m4v,.jpg,.jpeg,.png,.webp" onChange={(e) => selectMedia(e.target.files?.[0])} /><div className="field-meta"><span className="field-error">{touched.media ? mediaError || workApiErrors.media : ""}</span><span>Max 200 MB</span></div></div>
                <div className="work-description"><label htmlFor="new-work-description">Description</label><textarea id="new-work-description" className={`form-input textarea ${workDescriptionError || workApiErrors.description ? "input-error" : ""}`} value={workForm.description} maxLength={1000} onChange={(e) => { setWorkForm((v) => ({ ...v, description: e.target.value })); setWorkApiErrors((current) => ({ ...current, description: "" })); }} placeholder="Tell viewers about this work" /><div className="field-meta"><span className="field-error">{workDescriptionError || workApiErrors.description}</span><span>{workForm.description.length}/1000</span></div></div>
                <div className="category-field"><label htmlFor="work-category">Category</label><select id="work-category" className={`form-input ${workCategoryError || workApiErrors.category ? "input-error" : ""}`} value={workForm.category} onChange={(e) => { setWorkForm((v) => ({ ...v, category: e.target.value, customCategory: e.target.value === CUSTOM_CATEGORY ? v.customCategory : "" })); setWorkApiErrors((current) => ({ ...current, category: "" })); }}>{CATEGORIES.map((value) => <option key={value} value={value}>{value || "Uncategorised"}</option>)}<option value={CUSTOM_CATEGORY}>Custom Category</option></select>{workForm.category === CUSTOM_CATEGORY && <><label className="sr-only" htmlFor="work-custom-category">Custom category</label><input id="work-custom-category" className={`form-input custom-category-input ${workCategoryError || workApiErrors.category ? "input-error" : ""}`} value={workForm.customCategory} maxLength={60} placeholder="Enter custom category" onChange={(e) => { setWorkForm((v) => ({ ...v, customCategory: e.target.value })); setWorkApiErrors((current) => ({ ...current, category: "" })); }}/></>}{(workCategoryError || workApiErrors.category) && <p className="field-error">{workCategoryError || workApiErrors.category}</p>}</div>
                <div><label htmlFor="new-work-project">Project / Client</label><input id="new-work-project" className={`form-input ${workProjectError || workApiErrors.projectName ? "input-error" : ""}`} maxLength={120} value={workForm.projectName} onChange={(e) => { setWorkForm((v) => ({ ...v, projectName: e.target.value })); setWorkApiErrors((current) => ({ ...current, projectName: "" })); }} aria-invalid={Boolean(workProjectError || workApiErrors.projectName)}/>{(workProjectError || workApiErrors.projectName) && <p className="field-error">{workProjectError || workApiErrors.projectName}</p>}</div>
                <div><label htmlFor="new-work-year">Year</label><input id="new-work-year" className={`form-input ${workYearError || workApiErrors.year ? "input-error" : ""}`} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={4} value={workForm.year} onChange={(e) => { setWorkForm((v) => ({ ...v, year: e.target.value.replace(/\D/g, "").slice(0, 4) })); setWorkApiErrors((current) => ({ ...current, year: "" })); }}/>{(workYearError || workApiErrors.year) && <p className="field-error">{workYearError || workApiErrors.year}</p>}</div>
                <div><label htmlFor="new-work-tags">Tags (comma separated)</label><input id="new-work-tags" className={`form-input ${workTagsError || workApiErrors.tags ? "input-error" : ""}`} maxLength={320} value={workForm.tags} onChange={(e) => { setWorkForm((v) => ({ ...v, tags: e.target.value })); setWorkApiErrors((current) => ({ ...current, tags: "" })); }}/>{(workTagsError || workApiErrors.tags) && <p className="field-error">{workTagsError || workApiErrors.tags}</p>}</div>
                <div className="thumbnail-field"><label htmlFor="new-work-thumbnail">Optional video thumbnail</label>{workForm.thumbnail ? <div className="selected-media-box"><div className="selected-media-info"><span className="selected-media-icon">▧</span><div><strong>{workForm.thumbnail.name}</strong><span>{formatFileSize(workForm.thumbnail.size)}</span></div></div><button type="button" className="remove-media-button" aria-label="Remove thumbnail" onClick={() => setWorkForm((v) => ({ ...v, thumbnail: null }))}>×</button></div> : <input id="new-work-thumbnail" className={`form-input ${thumbnailError || workApiErrors.thumbnail ? "input-error" : ""}`} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => { const file = e.target.files?.[0] || null; const error = file ? validateImage(file) : ""; if (error) { setWorkApiErrors((current) => ({ ...current, thumbnail: error })); setMessage(error); e.target.value = ""; return; } setWorkApiErrors((current) => ({ ...current, thumbnail: "" })); setWorkForm((v) => ({ ...v, thumbnail: file })); }}/>} {(thumbnailError || workApiErrors.thumbnail) && <p className="field-error">{thumbnailError || workApiErrors.thumbnail}</p>}</div>
                <div className="work-submit"><button className="btn-primary" disabled={!workValid || busy === "work"}>{busy === "work" ? "Adding Work..." : "Add Work"}</button></div>
            </form></section></div>}{editingWorkId && Object.keys(editApiErrors).length > 0 && <p className="field-error edit-work-api-error" role="alert">{Object.values(editApiErrors)[0]}</p>}

            <section className="creator-works-section"><div className="section-header"><div><p className="eyebrow">PORTFOLIO</p><h2>Your Works</h2></div><p className="muted-text">{works.length} {works.length === 1 ? "work" : "works"}</p></div>{works.length === 0 ? <div className="empty-state">No work added yet.</div> : <div className="work-grid">{works.map((work) => <article className={`work-card ${editingWorkId === work._id ? "work-card-editing" : ""}`} key={work._id}><div className="work-media"><CreatorWorkMedia work={work} mediaUrl={(path) => `${API_ORIGIN}${path}`} onOpen={() => setViewingImage({ src: `${API_ORIGIN}${work.filePath}`, alt: work.title, mediaType: work.mediaType, mimeType: work.mimeType, poster: work.thumbnailPath ? `${API_ORIGIN}${work.thumbnailPath}` : undefined })} /></div><div className="work-content">{editingWorkId === work._id ? <div className="work-edit-form"><div><label>Work title</label><input className={`form-input ${validateWorkTitle(editWorkForm.title) ? "input-error" : ""}`} value={editWorkForm.title} maxLength={120} onChange={(e) => setEditWorkForm((v) => ({ ...v, title: e.target.value }))} />{validateWorkTitle(editWorkForm.title) && <p className="field-error">{validateWorkTitle(editWorkForm.title)}</p>}</div><div><label>Description</label><textarea className={`form-input textarea ${editWorkForm.description.length > 1000 ? "input-error" : ""}`} value={editWorkForm.description} maxLength={1000} onChange={(e) => setEditWorkForm((v) => ({ ...v, description: e.target.value }))} /></div><div className="category-field"><label>Category</label><select className={`form-input ${categoryError(editWorkForm) ? "input-error" : ""}`} value={editWorkForm.category} onChange={(e) => setEditWorkForm((v) => ({ ...v, category: e.target.value, customCategory: e.target.value === CUSTOM_CATEGORY ? v.customCategory : "" }))}>{CATEGORIES.map((value) => <option key={value} value={value}>{value || "Uncategorised"}</option>)}<option value={CUSTOM_CATEGORY}>Custom Category</option></select>{editWorkForm.category === CUSTOM_CATEGORY && <><input aria-label="Custom category" className={`form-input custom-category-input ${categoryError(editWorkForm) ? "input-error" : ""}`} value={editWorkForm.customCategory} maxLength={60} placeholder="Enter custom category" onChange={(e) => setEditWorkForm((v) => ({ ...v, customCategory: e.target.value }))}/>{categoryError(editWorkForm) && <p className="field-error">{categoryError(editWorkForm)}</p>}</>}</div><div><label>Project / Client</label><input className="form-input" maxLength={120} value={editWorkForm.projectName} onChange={(e) => setEditWorkForm((v) => ({ ...v, projectName: e.target.value }))}/></div><div><label>Year</label><input className={`form-input ${validateYear(editWorkForm.year) ? "input-error" : ""}`} type="text" inputMode="numeric" maxLength={4} value={editWorkForm.year} onChange={(e) => setEditWorkForm((v) => ({ ...v, year: e.target.value.replace(/\D/g, "").slice(0, 4) }))}/>{validateYear(editWorkForm.year) && <p className="field-error">{validateYear(editWorkForm.year)}</p>}</div><div><label>Tags</label><input className={`form-input ${validateTags(editWorkForm.tags) ? "input-error" : ""}`} maxLength={320} value={editWorkForm.tags} onChange={(e) => setEditWorkForm((v) => ({ ...v, tags: e.target.value }))}/>{validateTags(editWorkForm.tags) && <p className="field-error">{validateTags(editWorkForm.tags)}</p>}</div><div><label>Video thumbnail</label>{editWorkForm.thumbnail ? <div className="selected-media-box"><strong>{editWorkForm.thumbnail.name}</strong><button type="button" className="remove-media-button" onClick={() => setEditWorkForm((v) => ({ ...v, thumbnail: null }))}>×</button></div> : work.thumbnailPath && !editWorkForm.removeThumbnail ? <div className="selected-media-box"><strong>Current thumbnail</strong><button type="button" className="remove-media-button" onClick={() => setEditWorkForm((v) => ({ ...v, removeThumbnail: true }))}>×</button></div> : <input className="form-input" type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => setEditWorkForm((v) => ({ ...v, thumbnail: e.target.files?.[0] || null, removeThumbnail: false }))}/>}</div><div className="button-group"><button type="button" className="btn-primary" onClick={() => saveWork(work._id)} disabled={busy === `edit-${work._id}` || !!validateWorkTitle(editWorkForm.title) || !!validateYear(editWorkForm.year) || !!validateTags(editWorkForm.tags) || !!categoryError(editWorkForm)}>Save</button><button type="button" className="btn-secondary" onClick={() => setEditingWorkId(null)}>Cancel</button></div></div> : <><div className="work-title-row"><h3>{work.title}</h3><span className={getWorkStatus(work).className}>{getWorkStatus(work).label}</span></div>{work.category && <p className="creator-work-category">{work.category}</p>}{work.description && <p className="muted-text">{work.description}</p>}<p className="creator-work-stats"><span>{Math.max(0, Number(work.viewCount) || 0)} Views</span><span>{Math.max(0, Number(work.likeCount) || 0)} Likes</span></p><div className="button-group"><button className="btn-secondary" onClick={() => startEdit(work)}>Edit</button><button className="btn-secondary" onClick={() => toggleWork(work)}>{work.isPublished ? "Hide" : "Publish"}</button><button className="btn-danger" onClick={() => deleteWork(work)}>Delete</button></div></>}</div></article>)}</div>}</section>
        </>}
        {portfolio && <CreatorEnquiries onTotalChange={setTotalEnquiries} />}
        <section className="panel account-settings" aria-labelledby="account-settings-heading"><div className="section-copy"><p className="eyebrow">ACCOUNT</p><h2 id="account-settings-heading">Account Settings</h2><p className="muted-text">Manage permanent changes to your WCase account separately from your creator profile.</p></div><div className="danger-zone"><div><h3>Danger Zone</h3><p>Deleting your account permanently removes your portfolio, works, uploaded media and enquiries. This cannot be undone.</p></div><button type="button" className="btn-danger" onClick={() => setDeleteAccountOpen(true)} disabled={busy === "delete-account"}>Delete Account</button></div></section>
        {cropRequest && <ImageCropModal file={cropRequest.file} type={cropRequest.type} onApply={applyCrop} onCancel={() => setCropRequest(null)}/>} 
        {viewingImage && <ImageViewer {...viewingImage} onClose={() => setViewingImage(null)} />}
        <ConfirmModal {...confirm} busy={busy === "confirm"} onConfirm={runConfirmed} onCancel={closeConfirm} />
        {deleteAccountOpen && <DeleteAccountModal open onDeleted={accountDeleted} onCancel={() => setDeleteAccountOpen(false)} />}
    </main>;
}
export default Dashboard;
