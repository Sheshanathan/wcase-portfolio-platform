const safeErrorSummary = (error) => {
    const name = typeof error?.name === "string" && /^[A-Za-z][A-Za-z0-9]{0,49}$/.test(error.name) ? error.name : "Error";
    const rawCode = error?.code;
    const code = (typeof rawCode === "number" && Number.isSafeInteger(rawCode)) || (typeof rawCode === "string" && /^[A-Z0-9_-]{1,50}$/.test(rawCode))
        ? rawCode
        : "UNEXPECTED_ERROR";
    return { name, code };
};

const logError = (context, error, requestId) => {
    const event = { event: context, ...safeErrorSummary(error) };
    if (requestId) event.requestId = requestId;
    console.error("Application error", event);
};

module.exports = { logError, safeErrorSummary };
