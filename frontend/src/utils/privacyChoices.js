export const PRIVACY_CHOICE_KEY = "wcasePrivacyChoice";
export const PRIVACY_CHOICES = Object.freeze({ OPTIONAL: "optional", ESSENTIAL: "essential" });

const OPTIONAL_STORAGE_KEYS = ["wcaseVisitorId", "wcaseLikedWorks", "wcaseWorkViews", "wcasePortfolioViews"];

const availableStorage = (storage) => storage || globalThis.localStorage;

export function readPrivacyChoice(storage) {
    try {
        const value = availableStorage(storage).getItem(PRIVACY_CHOICE_KEY);
        return Object.values(PRIVACY_CHOICES).includes(value) ? value : "";
    } catch {
        return "";
    }
}

export function clearOptionalStorage(storage) {
    try {
        const target = availableStorage(storage);
        OPTIONAL_STORAGE_KEYS.forEach((key) => target.removeItem(key));
        return true;
    } catch {
        return false;
    }
}

export function savePrivacyChoice(choice, storage) {
    if (!Object.values(PRIVACY_CHOICES).includes(choice)) return false;
    try {
        const target = availableStorage(storage);
        target.setItem(PRIVACY_CHOICE_KEY, choice);
        if (choice === PRIVACY_CHOICES.ESSENTIAL) clearOptionalStorage(target);
        return true;
    } catch {
        return false;
    }
}
