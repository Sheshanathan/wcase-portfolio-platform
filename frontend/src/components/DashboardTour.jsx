import { useEffect, useLayoutEffect, useRef, useState } from "react";
import tourDocument from "../content/dashboard-tour.json";
import { calculateTourPosition, TOUR_VIEWPORT_MARGIN } from "../utils/tourPosition";

const TARGET_PADDING = 7;

function DashboardTour({ stepIndex, onStepChange, onComplete, completing = false }) {
    const dialogRef = useRef(null);
    const [layout, setLayout] = useState(null);
    const steps = tourDocument.steps;
    const step = steps[stepIndex];
    const isLastStep = stepIndex === steps.length - 1;

    useLayoutEffect(() => {
        let target = null;
        try { target = document.querySelector(step.target); } catch { /* Invalid edited selectors fall back to a centred card. */ }
        if (!target) {
            const missingTargetFrame = window.requestAnimationFrame(() => {
                if (!dialogRef.current) return;
                const card = dialogRef.current.getBoundingClientRect();
                setLayout({
                    card: {
                        placement: "center",
                        top: Math.max(TOUR_VIEWPORT_MARGIN, (window.innerHeight - card.height) / 2),
                        left: Math.max(TOUR_VIEWPORT_MARGIN, (window.innerWidth - card.width) / 2)
                    },
                    spotlight: null
                });
            });
            return () => window.cancelAnimationFrame(missingTargetFrame);
        }

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const visibleRect = target.getBoundingClientRect();
        if (visibleRect.top < TOUR_VIEWPORT_MARGIN || visibleRect.bottom > window.innerHeight - TOUR_VIEWPORT_MARGIN) {
            target.scrollIntoView({ block: "center", inline: "nearest", behavior: reducedMotion ? "auto" : "smooth" });
        }

        let animationFrame;
        let settleTimer;
        const update = () => {
            window.cancelAnimationFrame(animationFrame);
            animationFrame = window.requestAnimationFrame(() => {
                if (!dialogRef.current || !document.body.contains(target)) return;
                const targetRect = target.getBoundingClientRect();
                const cardRect = dialogRef.current.getBoundingClientRect();
                const position = calculateTourPosition(targetRect, cardRect, step.placement, { width: window.innerWidth, height: window.innerHeight });
                setLayout({
                    card: position,
                    spotlight: {
                        top: Math.max(0, targetRect.top - TARGET_PADDING),
                        left: Math.max(0, targetRect.left - TARGET_PADDING),
                        width: Math.min(window.innerWidth, targetRect.width + TARGET_PADDING * 2),
                        height: Math.min(window.innerHeight, targetRect.height + TARGET_PADDING * 2)
                    }
                });
            });
        };

        update();
        settleTimer = window.setTimeout(update, reducedMotion ? 0 : 320);
        window.addEventListener("resize", update);
        window.addEventListener("scroll", update, true);
        return () => {
            window.cancelAnimationFrame(animationFrame);
            window.clearTimeout(settleTimer);
            window.removeEventListener("resize", update);
            window.removeEventListener("scroll", update, true);
        };
    }, [step]);

    useEffect(() => {
        dialogRef.current?.focus();
    }, [stepIndex]);

    useEffect(() => {
        const handleKeys = (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                void onComplete();
                return;
            }
            if (event.key !== "Tab" || !dialogRef.current) return;
            const controls = [...dialogRef.current.querySelectorAll("button:not(:disabled)")];
            if (!controls.length) return;
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        window.addEventListener("keydown", handleKeys);
        return () => window.removeEventListener("keydown", handleKeys);
    }, [onComplete]);

    return (
        <div className="dashboard-tour-layer">
            <div className="dashboard-tour-blocker" aria-hidden="true" />
            {layout?.spotlight && <div className="dashboard-tour-spotlight" aria-hidden="true" style={layout.spotlight} />}
            <section
                ref={dialogRef}
                className="dashboard-tour-card"
                data-placement={layout?.card.placement || step.placement}
                style={layout ? { top: layout.card.top, left: layout.card.left, visibility: "visible" } : undefined}
                role="dialog"
                aria-modal="true"
                aria-labelledby="dashboard-tour-title"
                aria-describedby="dashboard-tour-description"
                tabIndex={-1}
            >
                <div className="dashboard-tour-progress-row"><span>{tourDocument.label}</span><span>{stepIndex + 1} of {steps.length}</span></div>
                <div className="dashboard-tour-progress" aria-hidden="true"><span style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} /></div>
                <h2 id="dashboard-tour-title">{step.title}</h2>
                <p id="dashboard-tour-description">{step.description}</p>
                <div className="dashboard-tour-actions">
                    <button type="button" className="dashboard-tour-skip" onClick={onComplete} disabled={completing}>{completing ? "Saving…" : "Skip tour"}</button>
                    <div>
                        {stepIndex > 0 && <button type="button" className="dashboard-tour-back" onClick={() => onStepChange(stepIndex - 1)} disabled={completing}>Back</button>}
                        <button type="button" className="dashboard-tour-next" onClick={() => isLastStep ? onComplete() : onStepChange(stepIndex + 1)} disabled={completing}>{isLastStep ? (completing ? "Saving…" : "Finish tour") : "Next"}</button>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default DashboardTour;
