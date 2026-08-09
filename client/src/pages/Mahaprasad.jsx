import React, { useEffect, useState, useCallback } from "react";
import Layout from "../components/Layout.jsx";
import { mahaprasadApi } from "../api/mahaprasad.api.js";
import { householdApi } from "../api/household.api.js";
import { useMandalStore } from "../store/useMandalStore.js";
import {
    Users,
    Home as HomeIcon,
    Building2,
    ShieldCheck,
    Calculator,
    Save
} from "lucide-react";
import toast from "react-hot-toast";

const Mahaprasad = () => {
    const { selectedYear } = useMandalStore();

    const [planning, setPlanning] = useState({
        festivalYear: null,
        expectedAttendancePercentage: 80,
        safetyBufferPercentage: 10,
        note: "",
        registeredHouseholds: 0,
        totalPeople: 0,
        expectedAttendance: 0,
        recommendedMeals: 0,
        externalDonorsExcluded: true
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [buildings, setBuildings] = useState([]);

    const fetchPlanning = useCallback(async () => {
        if (!selectedYear) return;
        setLoading(true);
        try {
            const response = await mahaprasadApi.getMahaprasad({ festivalYear: selectedYear });
            if (response.success) {
                setPlanning(response.data);
            } else {
                toast.error(response.message || "Failed to load Mahaprasad planning");
            }
        } catch (err) {
            toast.error("An error occurred while loading Mahaprasad planning");
        } finally {
            setLoading(false);
        }
    }, [selectedYear]);

    const fetchBuildings = useCallback(async () => {
        try {
            const response = await householdApi.getHouseholdOverview();
            if (response.success) {
                setBuildings(response.data.buildings || []);
            }
        } catch (err) {
            console.error(err);
        }
    }, []);

    useEffect(() => {
        fetchPlanning();
        fetchBuildings();
    }, [fetchPlanning, fetchBuildings]);

    // Live calculation preview based on currently entered percentages
    const expectedAttendance = Math.round(planning.totalPeople * (Number(planning.expectedAttendancePercentage) || 0) / 100);
    const recommendedMeals = Math.round(expectedAttendance * (1 + (Number(planning.safetyBufferPercentage) || 0) / 100));

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setPlanning((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        const attendancePct = Number(planning.expectedAttendancePercentage);
        const bufferPct = Number(planning.safetyBufferPercentage);
        if (attendancePct < 0 || attendancePct > 100) {
            toast.error("Expected attendance percentage must be between 0 and 100");
            return;
        }
        if (bufferPct < 0 || bufferPct > 100) {
            toast.error("Safety buffer percentage must be between 0 and 100");
            return;
        }

        setSaving(true);
        try {
            const response = await mahaprasadApi.updateMahaprasad({
                festivalYear: selectedYear,
                expectedAttendancePercentage: attendancePct,
                safetyBufferPercentage: bufferPct,
                note: planning.note
            });
            if (response.success) {
                setPlanning(response.data.planning);
                toast.success("Mahaprasad planning saved successfully");
            } else {
                toast.error(response.message || "Failed to save Mahaprasad planning");
            }
        } catch (err) {
            toast.error("An error occurred while saving Mahaprasad planning");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Layout>
            {/* Header */}
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                        Mahaprasad Planning
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
                        Plan Mahaprasad meals for festival year {selectedYear} based on resident household population
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/15 transition-all hover:bg-indigo-700 disabled:opacity-50"
                >
                    {saving ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    ) : (
                        <Save className="h-4.5 w-4.5" />
                    )}
                    Save Planning
                </button>
            </div>

            {/* External donors exclusion notice */}
            <div className="mb-8 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
                <ShieldCheck className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                    <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                        External Donors are excluded from this calculation
                    </p>
                    <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                        Mahaprasad planning uses ONLY registered resident households and their family member counts.
                        Shops, businesses, organizations and well-wishers are never counted in the population.
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="flex h-[50vh] items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                        <p className="text-sm font-medium text-gray-500">Loading Mahaprasad planning...</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Population & Calculation Card */}
                    <div className="lg:col-span-2">
                        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md shadow-gray-100/30 dark:border-gray-800 dark:bg-gray-900">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
                                    <Calculator className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-md font-bold text-gray-800 dark:text-white">Resident Population & Meal Calculation</h3>
                                    <p className="text-xs text-gray-400 mt-0.5">Configurable percentages, computed and saved per festival year</p>
                                </div>
                            </div>

                            {/* Population summary */}
                            <div className="mb-6 grid grid-cols-2 gap-4">
                                <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5 text-center dark:border-gray-800 dark:bg-gray-950">
                                    <HomeIcon className="mx-auto h-6 w-6 text-indigo-500 mb-2" />
                                    <div className="text-3xl font-bold text-gray-900 dark:text-white">{planning.registeredHouseholds}</div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-1">Registered Households</div>
                                </div>
                                <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5 text-center dark:border-gray-800 dark:bg-gray-950">
                                    <Users className="mx-auto h-6 w-6 text-violet-500 mb-2" />
                                    <div className="text-3xl font-bold text-gray-900 dark:text-white">{planning.totalPeople}</div>
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mt-1">Total Resident People</div>
                                </div>
                            </div>

                            {/* Configurable percentages */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                        Expected Attendance (%)
                                    </label>
                                    <input
                                        type="number"
                                        name="expectedAttendancePercentage"
                                        min="0"
                                        max="100"
                                        value={planning.expectedAttendancePercentage}
                                        onChange={handleInputChange}
                                        className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1.5">% of residents expected to attend the festival</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                        Safety Buffer (%)
                                    </label>
                                    <input
                                        type="number"
                                        name="safetyBufferPercentage"
                                        min="0"
                                        max="100"
                                        value={planning.safetyBufferPercentage}
                                        onChange={handleInputChange}
                                        className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1.5">Extra meals prepared on top of expected attendance</p>
                                </div>
                            </div>

                            {/* Calculation result */}
                            <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white shadow-lg shadow-indigo-600/20">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">
                                            Expected Attendance
                                        </div>
                                        <div className="mt-2 flex items-end gap-1.5">
                                            <span className="text-3xl font-bold">{expectedAttendance.toLocaleString("en-IN")}</span>
                                            <span className="text-xs font-medium text-indigo-200 pb-1">people</span>
                                        </div>
                                        <p className="text-[10px] text-indigo-200 mt-1.5">
                                            {planning.totalPeople} × {Number(planning.expectedAttendancePercentage) || 0}%
                                        </p>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">
                                            Recommended Meals
                                        </div>
                                        <div className="mt-2 flex items-end gap-1.5">
                                            <span className="text-3xl font-bold">{recommendedMeals.toLocaleString("en-IN")}</span>
                                            <span className="text-xs font-medium text-indigo-200 pb-1">servings</span>
                                        </div>
                                        <p className="text-[10px] text-indigo-200 mt-1.5">
                                            Attendance + {Number(planning.safetyBufferPercentage) || 0}% safety buffer
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5">
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Planning Note</label>
                                <textarea
                                    name="note"
                                    value={planning.note || ""}
                                    onChange={handleInputChange}
                                    rows="2"
                                    placeholder="e.g. 421 residents, 80% attendance, 10% buffer - prepare 371 meals"
                                    className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                ></textarea>
                            </div>
                        </div>
                    </div>

                    {/* Building-wise breakdown + steps */}
                    <div className="space-y-6">
                        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md shadow-gray-100/30 dark:border-gray-800 dark:bg-gray-900">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                                    <Building2 className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-md font-bold text-gray-800 dark:text-white">People by Building</h3>
                                    <p className="text-xs text-gray-400 mt-0.5">Resident population breakdown</p>
                                </div>
                            </div>

                            {buildings.length === 0 ? (
                                <p className="text-sm text-gray-400 py-6 text-center">No buildings configured yet</p>
                            ) : (
                                <div className="space-y-2">
                                    {buildings.map((b) => (
                                        <div key={b.building} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 dark:border-gray-800">
                                            <div className="flex items-center gap-2.5">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
                                                    B{b.building}
                                                </div>
                                                <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                                    {b.households} households
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-bold text-violet-600 dark:text-violet-400">{b.people}</span>
                                                <span className="text-[10px] text-gray-400 ml-1">people</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-md shadow-gray-100/30 dark:border-gray-800 dark:bg-gray-900">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
                                    <ShieldCheck className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-md font-bold text-gray-800 dark:text-white">How it works</h3>
                                    <p className="text-xs text-gray-400 mt-0.5">Calculation steps</p>
                                </div>
                            </div>
                            <ol className="space-y-3 text-xs text-gray-500 dark:text-gray-400">
                                <li className="flex gap-2.5">
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">1</span>
                                    Sum family member counts of all active registered households
                                </li>
                                <li className="flex gap-2.5">
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">2</span>
                                    Multiply by expected attendance % → expected attendees
                                </li>
                                <li className="flex gap-2.5">
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">3</span>
                                    Add safety buffer % on top → recommended meals
                                </li>
                                <li className="flex gap-2.5">
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">!</span>
                                    <span>
                                        <b>Never</b> includes External Donors, unregistered flats or inactive households
                                    </span>
                                </li>
                            </ol>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Mahaprasad;