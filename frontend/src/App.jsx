import {
    BrowserRouter,
    Routes,
    Route,
    Link
} from "react-router-dom";

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

function Home() {
    return (
        <main className="home-page">
            <section className="home-hero">
                <div className="home-glow home-glow-one" />
                <div className="home-glow home-glow-two" />

                <div className="home-content">
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

                    <div className="home-actions">
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
                <div className="feature-card">
                    <h2>Start with your best work</h2>

                    <p>
                        Choose the images and videos that
                        show your strongest skills.
                    </p>
                </div>

                <div className="feature-card">
                    <h2>Shape your story</h2>

                    <p>
                        Add context, organise each project,
                        and publish only what people should see.
                    </p>
                </div>

                <div className="feature-card">
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
