export default function DemoSafetyNotice({ children }) {
    return <aside className="demo-safety-notice" role="note" aria-label="Demo safety notice">
        <strong>Demo notice</strong>
        <p>{children}</p>
    </aside>;
}
