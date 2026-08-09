import { create } from "zustand";

const THEME_KEY = "mandalkhata-theme";

const getInitialTheme = () => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const applyTheme = (theme) => {
    const root = document.documentElement;
    if (theme === "dark") {
        root.classList.add("dark");
    } else {
        root.classList.remove("dark");
    }
};

export const useThemeStore = create((set) => ({
    theme: getInitialTheme(),

    setTheme: (theme) => {
        localStorage.setItem(THEME_KEY, theme);
        const root = document.documentElement;
        root.classList.add("theme-anim");
        applyTheme(theme);
        window.setTimeout(() => root.classList.remove("theme-anim"), 300);
        set({ theme });
    }
}));
