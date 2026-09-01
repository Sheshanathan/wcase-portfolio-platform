const nodemailer = require("nodemailer");
const BRAND_YELLOW = "#F7C644";
const CARD_BACKGROUND = BRAND_YELLOW;
let mailTransporter;

const requireMailConfig = () => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) throw new Error("MAIL_NOT_CONFIGURED");
};

const transport = () => {
    requireMailConfig();
    if (mailTransporter) return mailTransporter;
    mailTransporter = nodemailer.createTransport({
        service: "gmail",
        pool: true,
        maxConnections: 2,
        maxMessages: 50,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
    return mailTransporter;
};

const sender = () => ({
    name: process.env.EMAIL_FROM_NAME || "WCase",
    address: process.env.EMAIL_USER
});

const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);

const publicHttpsUrl = (value) => {
    try {
        const url = new URL(value);
        const hostname = url.hostname.toLowerCase();
        const privateHost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
            || hostname.startsWith("10.") || hostname.startsWith("192.168.")
            || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
        return url.protocol === "https:" && !privateHost ? url.toString() : "";
    } catch {
        return "";
    }
};

const emailAssets = () => {
    const configuredLogo = publicHttpsUrl(process.env.APP_LOGO_URL || "");
    const appUrl = publicHttpsUrl((process.env.FRONTEND_URL || "").replace(/\/$/, ""));
    return { logoUrl: configuredLogo || (appUrl ? `${appUrl.replace(/\/$/, "")}/wcase-logo.png` : ""), attachments: [] };
};

const emailShell = ({ preview, heading, body, action, logoUrl, footer = "WCase · Showcase your work. Share one link." }) => {
    const logo = logoUrl
        ? `<img src="${escapeHtml(logoUrl)}" width="76" height="76" alt="WCase" style="display:block;width:76px;height:76px;margin:0 auto 20px;border:2px solid #000000;border-radius:50%;background:${BRAND_YELLOW};box-shadow:3px 3px 0 #000000;object-fit:cover;">`
        : `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 20px;"><tr><td width="76" height="76" align="center" valign="middle" style="width:76px;height:76px;border:2px solid #000000;border-radius:50%;background:${BRAND_YELLOW};color:#000000;font:900 20px Arial,sans-serif;letter-spacing:-1px;box-shadow:3px 3px 0 #000000;">WCase</td></tr></table>`;
    const actionHtml = action ? `<div style="margin:28px 0;"><a href="${escapeHtml(action.url)}" style="display:inline-block;padding:14px 22px;border:2px solid #000000;border-radius:8px;background:${BRAND_YELLOW};color:#000000;font:700 16px Arial,sans-serif;text-decoration:none;">${escapeHtml(action.label)}</a></div>` : "";
    return `<!doctype html><html><body bgcolor="#f4f4f5" style="margin:0;padding:0;background-color:#f4f4f5;color:#000000;"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preview)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#f4f4f5" style="background-color:#f4f4f5;"><tr><td align="center" bgcolor="#f4f4f5" style="padding:32px 16px;background-color:#f4f4f5;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="${CARD_BACKGROUND}" style="max-width:600px;border:2px solid #000000;border-radius:14px;background-color:${CARD_BACKGROUND};overflow:hidden;"><tr><td bgcolor="${BRAND_YELLOW}" style="height:10px;background-color:${BRAND_YELLOW};font-size:0;line-height:0;">&nbsp;</td></tr><tr><td align="center" bgcolor="${CARD_BACKGROUND}" style="padding:32px 28px 36px;background-color:${CARD_BACKGROUND};">${logo}<h1 style="margin:0 0 16px;color:#000000;font:900 30px/1.15 Arial,sans-serif;letter-spacing:-0.6px;">${escapeHtml(heading)}</h1><div style="color:#27272a;font:400 16px/1.65 Arial,sans-serif;">${body}</div>${actionHtml}<p style="margin:28px 0 0;padding-top:18px;border-top:1px solid #000000;color:#000000;font:400 13px/1.5 Arial,sans-serif;">${escapeHtml(footer)}</p></td></tr></table></td></tr></table></body></html>`;
};

const sendPasswordReset = async ({ to, resetUrl }) => {
    const assets = emailAssets();
    const html = emailShell({
        preview: "Reset your WCase password securely.",
        heading: "Reset your password",
        body: `<p style="margin:0 0 12px;">We received a request to reset the password for your WCase account.</p><p style="margin:0;">This secure link expires in <strong>30 minutes</strong> and can only be used once. If you did not request this, you can safely ignore this email.</p>`,
        action: { label: "Reset Password", url: resetUrl }, logoUrl: assets.logoUrl
    });
    await transport().sendMail({
        from: sender(), to, subject: "Reset your WCase password",
        text: `Reset your WCase password using this secure, single-use link within 30 minutes:\n\n${resetUrl}\n\nIf you did not request this, ignore this email.`, html, attachments: assets.attachments
    });
};

const sendWelcomeEmail = async ({ to, name }) => {
    const displayName = String(name || "Creator");
    const appUrl = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
    const assets = emailAssets();
    const html = emailShell({
        preview: "Welcome to WCase—your creator portfolio is ready to begin.",
        heading: `Welcome to WCase, ${name || "Creator"}!`,
        body: `<p style="margin:0 0 12px;">Your creator account has been created successfully.</p><p style="margin:0;">Build your portfolio, add your best work, control what visitors can see, and share one polished public link.</p>`,
        action: appUrl ? { label: "Create Your Portfolio", url: `${appUrl}/dashboard` } : null,
        logoUrl: assets.logoUrl
    });
    await transport().sendMail({
        from: sender(), to, subject: "Welcome to WCase",
        text: `Welcome to WCase, ${displayName}! Your creator account has been created successfully.${appUrl ? `\n\nOpen your dashboard: ${appUrl}/dashboard` : ""}`,
        html, attachments: assets.attachments
    });
};

const sendOtpEmail = async ({ to, otp, purpose, expiresInMinutes = 10 }) => {
    const deleting = purpose === "account_deletion";
    const assets = emailAssets();
    const heading = deleting ? "Confirm account deletion" : "Verify your email";
    const explanation = deleting
        ? "Use this verification code to confirm permanent deletion of your WCase account. Your account and creator content will be permanently deleted after verification."
        : "Use this verification code to finish creating your WCase account.";
    const html = emailShell({
        preview: deleting ? "Confirm permanent deletion of your WCase account." : "Verify your email to finish creating your WCase account.",
        heading,
        body: `<p style="margin:0 0 18px;">${explanation}</p><div style="margin:0 auto 18px;padding:16px 20px;border:2px solid #000000;border-radius:10px;background:${BRAND_YELLOW};color:#000000;font:900 34px/1 Arial,sans-serif;letter-spacing:8px;max-width:260px;">${escapeHtml(otp)}</div><p style="margin:0 0 12px;">This code expires in <strong>${expiresInMinutes} minutes</strong> and can only be used once.</p><p style="margin:0;">If you did not request this, ignore this email and do not share the code.</p>`,
        action: null,
        logoUrl: assets.logoUrl,
        footer: `© ${new Date().getFullYear()} WCase · Showcase your work. Share one link.`
    });
    await transport().sendMail({
        from: sender(), to,
        subject: deleting ? "Confirm deletion of your WCase account" : "Verify your WCase email",
        text: `${heading}\n\n${explanation}\n\nVerification code: ${otp}\n\nThis code expires in ${expiresInMinutes} minutes and can only be used once. If you did not request this, ignore this email.`,
        html, attachments: assets.attachments
    });
};

module.exports = { sendPasswordReset, sendWelcomeEmail, sendOtpEmail };
