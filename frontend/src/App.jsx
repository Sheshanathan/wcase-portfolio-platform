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
                        <span>Showcase your work.</span>
                        <span>Share one link.</span>
                    </h1>

                    <p className="home-description">
                        Create your portfolio, upload
                        your videos and images, and
                        share your work with anyone
                        through one public link.
                    </p>

                    <div className="home-actions">
                        <Link
                            to="/register"
                            className="btn-primary"
                        >
                            Create Portfolio
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
                    <h2>Upload your work</h2>

                    <p>
                        Add videos and images directly
                        from your device.
                    </p>
                </div>

                <div className="feature-card">
                    <h2>Build your portfolio</h2>

                    <p>
                        Manage your title, bio, work
                        visibility and portfolio status.
                    </p>
                </div>

                <div className="feature-card">
                    <h2>Share one link</h2>

                    <p>
                        Anyone can open your public
                        portfolio and view your published
                        work without logging in.
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
