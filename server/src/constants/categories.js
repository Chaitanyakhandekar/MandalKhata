export const DEFAULT_EXPENSE_CATEGORIES = [
    "Decoration",
    "Sound",
    "Lighting",
    "Food",
    "Security",
    "Visarjan",
    "Miscellaneous"
];

export const normalizeCategoryName = (name) => {
    return String(name || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
};
