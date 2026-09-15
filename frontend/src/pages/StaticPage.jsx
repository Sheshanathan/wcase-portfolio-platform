import { Link } from "react-router-dom";

const EFFECTIVE_DATE = "15 September 2026";
const PROJECT_REPOSITORY_URL = "https://github.com/Sheshanathan/wcase-portfolio-platform";
const PROJECT_ISSUES_URL = "https://github.com/Sheshanathan/wcase-portfolio-platform/issues/new";

function LegalHeader({ title, summary }) {
    return <>
        <Link to="/" className="public-brand" aria-label="WCase home"><img src="/wcase-logo.png" alt="WCase" /></Link>
        <h1>{title}</h1>
        <p className="legal-meta">Effective and last updated: {EFFECTIVE_DATE}</p>
        <p className="legal-notice">{summary}</p>
    </>;
}

function LegalContact() {
    return <section>
        <h2>Contact and requests</h2>
        <p>Account holders can permanently delete their account and associated creator content from the WCase dashboard. Visitors can ask the relevant creator to delete an enquiry they submitted.</p>
        <p>For a platform privacy, legal, copyright, or safety request, <a href={PROJECT_ISSUES_URL} target="_blank" rel="noopener noreferrer">contact the project maintainer through GitHub</a>. Do not put passwords, financial information, identification numbers, private documents, or other sensitive personal data in a public GitHub issue. Ask for a private follow-up channel when needed.</p>
    </section>;
}

function PrivacyPolicy() {
    return <main className="legal-page">
        <LegalHeader title="Privacy Policy" summary="This policy describes the information handled by the public WCase demonstration service. WCase does not sell personal information or use it for targeted advertising." />

        <section>
            <h2>About WCase</h2>
            <p>WCase is an independently operated, non-commercial portfolio demonstration. For this demonstration, the operator and data controller is the individual maintainer identified by the owner account of the <a href={PROJECT_REPOSITORY_URL} target="_blank" rel="noopener noreferrer">public WCase source repository</a>. WCase is not presented as a registered company. It lets creators build and publish a portfolio, upload work, receive enquiries, and view basic engagement counts. This policy applies to the WCase website, API, and public portfolio pages.</p>
        </section>

        <section>
            <h2>Information WCase handles</h2>
            <ul>
                <li><strong>Account information:</strong> creator name, email address, password hash, email-verification records, password-reset records, account role, session-security information, and the date and version of the Terms accepted and Privacy Policy acknowledged.</li>
                <li><strong>Portfolio information:</strong> portfolio title, biography, speciality, location, optional public contact details, website and social links, profile and cover images, publishing choices, and public URL slug.</li>
                <li><strong>Work content:</strong> titles, descriptions, categories, project details, tags, images, videos, thumbnails, publication settings, and engagement totals.</li>
                <li><strong>Enquiries:</strong> a visitor's name, email address, optional phone number, subject, message, date, and read status. Enquiries are available to the creator receiving them.</li>
                <li><strong>Reports and engagement:</strong> report reasons and details, portfolio and work view counts, likes, and a one-way hash of a randomly generated visitor identifier used to prevent duplicate likes.</li>
                <li><strong>Technical information:</strong> IP address and request metadata may be processed temporarily for security, rate limiting, delivery, troubleshooting, and hosting logs.</li>
            </ul>
        </section>

        <section>
            <h2>Browser storage</h2>
            <p>WCase uses browser local storage rather than advertising cookies. Essential storage keeps a signed-in creator's authentication token and basic account information, remembers the chosen theme, and records the visitor's privacy choice.</p>
            <p>On public portfolios, WCase asks before enabling optional anonymous statistics. If a visitor chooses “Allow anonymous statistics,” WCase stores a random visitor identifier, recently viewed items, and liked-work identifiers to count views and remember likes. “Use essential only” prevents automatic portfolio and work view tracking; a like requested by the visitor works for that browser visit without storing the identifier in the browser. The choice can be changed through “Privacy choices” in a public portfolio footer. Clearing site data removes these browser values and asks for a new choice.</p>
        </section>

        <section>
            <h2>How information is used</h2>
            <ul>
                <li>To create accounts, verify email addresses, authenticate users, and reset passwords.</li>
                <li>To save, publish, and deliver creator portfolios and media.</li>
                <li>To deliver enquiries to creators and receive content reports.</li>
                <li>To provide basic view and like statistics.</li>
                <li>To secure the service, enforce limits, diagnose failures, prevent abuse, and comply with legal obligations.</li>
            </ul>
            <p>Depending on the applicable law, these activities are based on providing the service requested by the user, legitimate interests in operating and protecting the service, consent for optional anonymous statistics where required, and compliance with legal obligations. A visitor can withdraw that choice at any time through “Privacy choices.”</p>
        </section>

        <section>
            <h2>Public content and creator choices</h2>
            <p>Published portfolios and published work are intentionally public and may be viewed, copied, linked to, or indexed by others. Creators control whether their portfolio, work, public email, phone number, location, images, and links are shown. Unpublished creator content is not returned on public portfolio routes. Do not upload confidential material or content you do not have permission to publish.</p>
        </section>

        <section>
            <h2>Service providers and transfers</h2>
            <p>WCase uses Vercel to deliver the frontend, Render to run the API, MongoDB Atlas to store application data, Cloudinary to store and deliver uploaded media, and Brevo to send transactional emails. These providers process information as service providers under their applicable terms and may process it in countries different from the user's country.</p>
            <p>Provider information is available in the official privacy notices for <a href="https://vercel.com/legal/privacy-notice" target="_blank" rel="noopener noreferrer">Vercel</a>, <a href="https://render.com/privacy" target="_blank" rel="noopener noreferrer">Render</a>, <a href="https://www.mongodb.com/legal/privacy" target="_blank" rel="noopener noreferrer">MongoDB</a>, <a href="https://cloudinary.com/privacy" target="_blank" rel="noopener noreferrer">Cloudinary</a>, and <a href="https://www.brevo.com/legal/privacypolicy/" target="_blank" rel="noopener noreferrer">Brevo</a>. Those providers' own terms apply to their independent processing.</p>
        </section>

        <section>
            <h2>Retention and deletion</h2>
            <ul>
                <li>Accounts, portfolios, and uploaded work are retained while the account remains active or until the creator deletes them.</li>
                <li>Deleting an account removes the account, portfolio, work, associated media, enquiries, likes, reports connected to that content, and verification records from the application's active storage.</li>
                <li>Email verification codes expire after 10 minutes; related records are scheduled for automatic removal after expiry. Password-reset links expire after 30 minutes.</li>
                <li>Enquiries remain until the receiving creator deletes them or the creator account is deleted.</li>
                <li>Report and security information is retained only as reasonably needed to review abuse, protect the service, resolve disputes, or meet legal requirements.</li>
                <li>Hosting-provider logs and backups may remain temporarily under each provider's retention procedures.</li>
            </ul>
        </section>

        <section>
            <h2>Security</h2>
            <p>WCase uses password hashing, limited-life authentication and reset tokens, email verification, input and media validation, access controls, rate limits, HTTPS in production, restricted media delivery, and server-side secrets. No online service can guarantee absolute security. Users should use a unique password and never upload sensitive or confidential information to this demonstration.</p>
        </section>

        <section>
            <h2>Your choices and rights</h2>
            <p>Creators can review and change portfolio information, control publication, delete individual content, remove enquiries, and permanently delete their account. Depending on local law, people may also request access, correction, deletion, restriction, portability, or objection, and may complain to their local data-protection authority. Identity verification may be required before a request is completed.</p>
        </section>

        <section>
            <h2>Children</h2>
            <p>WCase is intended for people aged 18 or older. It is not designed to knowingly collect personal information from children. A parent or guardian who believes a child has submitted information should contact the project maintainer.</p>
        </section>

        <section>
            <h2>Policy changes</h2>
            <p>This policy may be updated when the service, providers, or legal requirements change. The effective date at the top will be updated when material changes are published.</p>
        </section>

        <LegalContact />
    </main>;
}

function TermsOfService() {
    return <main className="legal-page">
        <LegalHeader title="Terms of Service" summary="WCase is a free, non-commercial demonstration project. It is provided for portfolio creation and evaluation without any paid-service commitment or guaranteed availability." />

        <section>
            <h2>Acceptance and eligibility</h2>
            <p>By creating an account or using WCase, you agree to these Terms and acknowledge the Privacy Policy. You must be at least 18 years old and legally able to agree to these Terms. If you do not agree, do not create an account or use the service.</p>
        </section>

        <section>
            <h2>Accounts</h2>
            <p>You must provide accurate information, protect your password and verification codes, and promptly report suspected unauthorized access. You are responsible for activity performed through your account. Accounts may not be sold, transferred, used to impersonate another person, or used to evade service restrictions.</p>
        </section>

        <section>
            <h2>Your content</h2>
            <p>You keep ownership of content you upload. You give WCase a non-exclusive, worldwide, royalty-free licence to host, store, process, reproduce, resize, deliver, and publicly display that content only as needed to operate WCase and follow your publication settings. This licence ends when the content is deleted, subject to temporary technical backups and legal retention duties.</p>
            <p>You confirm that you created the content or have all permissions needed to upload and publish it, including permissions concerning copyright, trademarks, privacy, publicity, music, and people shown in the content.</p>
        </section>

        <section>
            <h2>Public portfolios and confidential information</h2>
            <p>Anything you publish may be viewed, shared, linked to, downloaded, captured, or indexed by third parties. Hiding or deleting content stops normal future delivery through WCase but cannot recall copies already made by others. Never upload passwords, access keys, financial details, identification documents, private client work, health information, confidential employer information, or material covered by a non-disclosure agreement.</p>
        </section>

        <section>
            <h2>Acceptable use</h2>
            <p>You must not use WCase to:</p>
            <ul>
                <li>Upload unlawful, infringing, deceptive, abusive, hateful, exploitative, or privacy-invasive material.</li>
                <li>Upload malware or attempt unauthorized access, scraping, probing, interference, denial of service, or security bypasses.</li>
                <li>Spam, harass, impersonate, mislead, or collect information about others without permission.</li>
                <li>Use automated traffic or manipulate views, likes, reports, enquiries, or rate limits.</li>
                <li>Use WCase for regulated, high-risk, or illegal transactions.</li>
            </ul>
        </section>

        <section>
            <h2>Enquiries, reports, and moderation</h2>
            <p>Visitors are responsible for the information they submit through enquiry and report forms. Creators are responsible for their communications with visitors. WCase may review reports and may hide, remove, restrict, or preserve content or accounts when reasonably necessary to protect users, the service, third-party rights, or comply with law. Reports do not guarantee removal or a particular outcome.</p>
        </section>

        <section>
            <h2>Third-party services and links</h2>
            <p>WCase depends on third-party hosting, database, media, and email providers and may display creator-supplied links. WCase does not control external websites or guarantee their content, security, availability, or privacy practices. Use third-party services at your own discretion.</p>
        </section>

        <section>
            <h2>Availability and changes</h2>
            <p>The service is offered free of charge as a demonstration. Free hosting may sleep, start slowly, impose quotas, or become unavailable. Features, limits, providers, URLs, and availability may change or end without a service-level commitment. Keep your own copies of important content; WCase is not a permanent archive or backup service.</p>
        </section>

        <section>
            <h2>No warranties</h2>
            <p>To the fullest extent permitted by law, WCase is provided “as is” and “as available,” without warranties that it will be uninterrupted, error-free, secure, or suitable for a particular purpose. Nothing in these Terms excludes rights or warranties that applicable law does not allow to be excluded.</p>
        </section>

        <section>
            <h2>Liability</h2>
            <p>To the fullest extent permitted by law, the WCase operator is not responsible for indirect, incidental, special, consequential, or lost-profit damages arising from use of the demonstration, user content, third-party services, data loss, or service interruption. Liability that cannot legally be limited remains unaffected.</p>
        </section>

        <section>
            <h2>Suspension, termination, and deletion</h2>
            <p>You may stop using WCase at any time and may permanently delete your account from the dashboard. WCase may restrict or terminate access for violations, abuse, security risk, legal requirements, or discontinuation of the demonstration. Sections that naturally continue after termination, including ownership, disclaimers, and liability limits, remain effective.</p>
        </section>

        <section>
            <h2>Applicable law and changes</h2>
            <p>Applicable law governs these Terms without removing mandatory rights available in a user's location. If one provision cannot be enforced, the remaining provisions continue. These Terms may be updated as WCase changes; continued use after the updated date means acceptance of the revised Terms where permitted by law.</p>
        </section>

        <LegalContact />
    </main>;
}

export function NotFound() {
    return <main className="auth-page"><div className="auth-card"><p className="public-brand"><img src="/wcase-logo.png" alt="WCase" /></p><h1>Page not found</h1><p>The page you requested does not exist.</p><Link className="btn-primary" to="/">Go Home</Link></div></main>;
}

export function LegalPage({ type }) {
    return type === "privacy" ? <PrivacyPolicy /> : <TermsOfService />;
}
