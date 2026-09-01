import { useState } from "react";
import { applyTheme, readExplicitThemePreference, saveExplicitThemePreference } from "../utils/theme";

// index.html applies the same validated preference before styles load; this keeps React in sync.
const initialTheme = readExplicitThemePreference();
applyTheme(initialTheme);

export default function ThemeControl() {
    const [theme, setTheme] = useState(initialTheme);

    const changeTheme = (nextTheme) => {
        if (nextTheme === theme) return;
        document.documentElement.classList.remove("theme-transitioning");
        const safeTheme = applyTheme(nextTheme);
        saveExplicitThemePreference(safeTheme);
        setTheme(safeTheme);
    };

    return <>
        <div className="space-environment" aria-hidden="true">
            <div className="space-nebula space-nebula-one" />
            <div className="space-nebula space-nebula-two" />
            <div className="space-stars space-stars-near" />
            <div className="space-stars space-stars-far" />
            <img className="space-earth" src="/space-earth-v1.png" alt="" />
        </div>
        <aside className="theme-control" aria-label="Application theme">
            <span className="theme-control-label">Theme</span>
            <div className="theme-options" role="group" aria-label="Choose application theme">
                <button type="button" className={theme === "default" ? "active" : ""} aria-pressed={theme === "default"} onClick={() => changeTheme("default")}>Default</button>
                <button type="button" className={theme === "space" ? "active" : ""} aria-pressed={theme === "space"} onClick={() => changeTheme("space")}>
                    Space
                    <svg aria-hidden="true" viewBox="0 0 16 16" width="13" height="13"><path d="M8 0c.35 4.75 3.25 7.65 8 8-4.75.35-7.65 3.25-8 8-.35-4.75-3.25-7.65-8-8C4.75 7.65 7.65 4.75 8 0Z" fill="currentColor"/></svg>
                </button>
            </div>
        </aside>
    </>;
}
