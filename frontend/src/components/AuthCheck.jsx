import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../api";
import { clearSession, getToken, storeUser } from "../utils/authStorage";

function AuthCheck({ children }) {
    const [loading, setLoading] = useState(true);
    const [valid, setValid] = useState(false);

    useEffect(() => {
        const verifyToken = async () => {
            const token = getToken();

            if (!token) {
                setValid(false);
                setLoading(false);
                return;
            }

            try {
                const response = await api.get("/auth/profile");

                storeUser(response.data.user);

                setValid(true);
            } catch {
                clearSession();
                setValid(false);
            } finally {
                setLoading(false);
            }
        };

        verifyToken();
        const expire = () => { setValid(false); setLoading(false); };
        window.addEventListener("wcase:session-expired", expire);
        return () => window.removeEventListener("wcase:session-expired", expire);
    }, []);

    if (loading) {
        return <main className="loading-page" aria-busy="true"><div className="loading-spinner"/><span className="sr-only">Checking login</span></main>;
    }

    if (!valid) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

export default AuthCheck;
