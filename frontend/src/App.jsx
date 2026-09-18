import {
    BrowserRouter,
    Routes,
    Route,
    Link
} from "react-router-dom";
import { useEffect, useRef, useState } from "react";

import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import PublicPortfolio from "./pages/PublicPortfolio.jsx";
import AuthCheck from "./components/AuthCheck.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import { LegalPage, NotFound } from "./pages/StaticPage.jsx";
import ThemeControl from "./components/ThemeControl.jsx";
import NotificationToast from "./components/NotificationToast.jsx";

const HOME_TOUR_KEY = "wcase_home_tour_v1";

const HOME_TOUR_STEPS = [
    {
        title: "See the WCase journey",
        description: "This quick tour shows how your project files become a focused portfolio that recruiters can understand.",
        target: "intro",
        placement: "bottom"
    },
    {
        title: "Start with work that proves your skills",
        description: "Choose the images and videos that best demonstrate what you can build and how you think.",
        target: "work",
        placement: "top"
    },
    {
        title: "Give every project a clear story",
        description: "Add context, organise your projects, and decide exactly what should be visible to visitors.",
        target: "story",
        placement: "top"
    },
    {
        title: "Turn interest into a conversation",
        description: "Publish one link that recruiters can explore without logging in, then let them contact you directly.",
        target: "share",
        placement: "top"
    },
    {
        title: "You are ready to build",
        description: "Create your account, add your strongest work, and publish your portfolio when it feels ready.",
        target: "action",
        placement: "bottom"
    }
];

function shouldOpenHomeTour() {
    if (typeof window === "undefined") return false;

    try {
        const replayRequested = new URLSearchParams(window.location.search).get("tour") === "1";
        return replayRequested || window.localStorage.getItem(HOME_TOUR_KEY) !== "completed";
    } catch {
        return true;
    }
}

function HomeStoryTour({ step, onStepChange, onClose }) {
    const dialogRef = useRef(null);
    const currentStep = HOME_TOUR_STEPS[step];
    const isLastStep = step === HOME_TOUR_STEPS.length - 1;

    useEffect(() => {
        dialogRef.current?.focus();
    }, [step]);

    useEffect(() => {
        const handleTourKeys = (event) => {
            if (event.key === "Escape") {
                onClose();
                return;
            }

            if (event.key !== "Tab" || !dialogRef.current) return;

            const controls = [...dialogRef.current.querySelectorAll("button")];
            if (controls.length === 0) return;

            const firstControl = controls[0];
            const lastControl = controls[controls.length - 1];

            if (event.shiftKey && (document.activeElement === firstControl || document.activeElement === dialogRef.current)) {
                event.preventDefault();
                lastControl.focus();
            } else if (!event.shiftKey && document.activeElement === lastControl) {
                event.preventDefault();
                firstControl.focus();
            }
        };

        window.addEventListener("keydown", handleTourKeys);
        return () => window.removeEventListener("keydown", handleTourKeys);
    }, [onClose]);

    return (
        <>
            <div className="home-tour-backdrop" aria-hidden="true" />
            <section
                className="home-tour-dialog"
                data-placement={currentStep.placement}
                role="dialog"
                aria-modal="true"
                aria-labelledby="home-tour-title"
                aria-describedby="home-tour-description"
                ref={dialogRef}
                tabIndex="-1"
            >
                <div className="home-tour-progress-row">
                    <span>WCASE TOUR</span>
                    <span>{step + 1} of {HOME_TOUR_STEPS.length}</span>
                </div>
                <div className="home-tour-progress" aria-hidden="true">
                    <span style={{ width: `${((step + 1) / HOME_TOUR_STEPS.length) * 100}%` }} />
                </div>
                <h2 id="home-tour-title">{currentStep.title}</h2>
                <p id="home-tour-description">{currentStep.description}</p>
                <div className="home-tour-actions">
                    <button type="button" className="home-tour-skip" onClick={onClose}>Skip tour</button>
                    <div>
                        {step > 0 && <button type="button" className="home-tour-back" onClick={() => onStepChange(step - 1)}>Back</button>}
                        <button type="button" className="home-tour-next" onClick={() => isLastStep ? onClose() : onStepChange(step + 1)}>
                            {isLastStep ? "Finish tour" : "Next"}
                        </button>
                    </div>
                </div>
            </section>
        </>
    );
}

function Home() {
    const [tourOpen, setTourOpen] = useState(shouldOpenHomeTour);
    const [tourStep, setTourStep] = useState(0);
    const activeTourTarget = tourOpen ? HOME_TOUR_STEPS[tourStep].target : null;

    const closeTour = () => {
        try {
            window.localStorage.setItem(HOME_TOUR_KEY, "completed");
        } catch {
            // The tour can still close when storage is unavailable.
        }

        setTourOpen(false);
    };

    return (
        <main className="home-page" data-tour-open={tourOpen || undefined}>
            <section className="home-hero">
                <div className="home-glow home-glow-one" />
                <div className="home-glow home-glow-two" />

                <div className="home-content" data-tour-active={activeTourTarget === "intro" || undefined}>
                    <p className="home-brand">
                        <img src="/wcase-logo.png" alt="" />
                    </p>

                    <h1>
                        <span>Turn your work into a story.</span>
                        <span>Share it in one link.</span>
                    </h1>

                    <p className="home-description">
                        Your projects already show what you can do. Bring your
                        best work together, explain the value behind it, and
                        give recruiters one clear place to understand you.
                    </p>

                    <div className="home-actions" data-tour-active={activeTourTarget === "action" || undefined}>
                        <Link
                            to="/register"
                            className="btn-primary"
                        >
                            Build My Portfolio
                        </Link>

                        <Link
                            to="/login"
                            className="btn-secondary"
                        >
                            Login
                        </Link>
                    </div>
                </div>
            </section>

            <section className="home-features">
                <div className="feature-card" data-tour-active={activeTourTarget === "work" || undefined}>
                    <h2>Start with your best work</h2>

                    <p>
                        Choose the images and videos that
                        show your strongest skills.
                    </p>
                </div>

                <div className="feature-card" data-tour-active={activeTourTarget === "story" || undefined}>
                    <h2>Shape your story</h2>

                    <p>
                        Add context, organise each project,
                        and publish only what people should see.
                    </p>
                </div>

                <div className="feature-card" data-tour-active={activeTourTarget === "share" || undefined}>
                    <h2>Open the next conversation</h2>

                    <p>
                        Send one link so recruiters can explore
                        your work and contact you without logging in.
                    </p>
                </div>
            </section>

            <footer className="home-footer">
                <Link to="/" className="home-footer-brand" aria-label="WCase home"><img src="/wcase-logo.png" alt="WCase" /></Link>
                <nav className="home-footer-links" aria-label="Legal"><Link to="/privacy">Privacy</Link><span className="footer-separator" aria-hidden="true">·</span><Link to="/terms">Terms</Link></nav>
            </footer>
            {tourOpen && <HomeStoryTour step={tourStep} onStepChange={setTourStep} onClose={closeTour} />}
        </main>
    );
}

function App() {
    return (
        <BrowserRouter>
            <ThemeControl />
            <NotificationToast />
            <Routes>
                <Route
                    path="/"
                    element={<Home />}
                />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />
                <Route path="/privacy" element={<LegalPage type="privacy" />} />
                <Route path="/terms" element={<LegalPage type="terms" />} />

                <Route
                    path="/login"
                    element={<Login />}
                />
                <Route path="*" element={<NotFound />} />

                <Route
                    path="/register"
                    element={<Register />}
                />

                <Route
                    path="/dashboard"
                    element={
                        <AuthCheck>
                            <Dashboard />
                        </AuthCheck>
                    }
                />

                <Route
                    path="/p/:slug"
                    element={<PublicPortfolio />}
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
