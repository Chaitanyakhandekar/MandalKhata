import { create } from "zustand";
import { festivalApi } from "../api/festival.api.js";

export const useMandalStore = create((set, get) => ({
    years: [],
    activeYear: null,
    selectedYear: localStorage.getItem("selectedYear") || "",
    loading: false,

    resolveSelection: (years) => {
        const active = years.find(y => y.isActive);
        const current = get().selectedYear;
        const stillValid = years.some(y => y.year === current);
        const selected = stillValid ? current : (active ? active.year : (years.length > 0 ? years[0].year : ""));
        if (selected) {
            localStorage.setItem("selectedYear", selected);
        }
        return { active, selected };
    },

    setYears: (years) => {
        const { active, selected } = get().resolveSelection(years);
        set({ years, activeYear: active, selectedYear: selected });
    },

    setSelectedYear: (year) => {
        localStorage.setItem("selectedYear", year);
        set({ selectedYear: year });
    },

    fetchYears: async () => {
        set({ loading: true });
        const response = await festivalApi.getYears();
        if (response && response.success) {
            const years = response.data;
            const { active, selected } = get().resolveSelection(years);
            set({ years, activeYear: active, selectedYear: selected, loading: false });
        } else {
            set({ loading: false });
        }
    }
}));
