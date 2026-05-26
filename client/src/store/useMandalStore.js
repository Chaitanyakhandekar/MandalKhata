import { create } from "zustand";
import { festivalApi } from "../api/festival.api.js";

export const useMandalStore = create((set, get) => ({
    years: [],
    activeYear: null,
    selectedYear: localStorage.getItem("selectedYear") || "",
    loading: false,

    setYears: (years) => {
        const active = years.find(y => y.isActive);
        const selected = get().selectedYear || (active ? active.year : "");
        if (selected) {
            localStorage.setItem("selectedYear", selected);
        }
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
            const active = years.find(y => y.isActive);
            const selected = get().selectedYear || (active ? active.year : "");
            if (selected) {
                localStorage.setItem("selectedYear", selected);
            }
            set({ years, activeYear: active, selectedYear: selected, loading: false });
        } else {
            set({ loading: false });
        }
    }
}));
