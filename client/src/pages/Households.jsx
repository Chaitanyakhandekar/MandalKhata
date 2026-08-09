import React, { useEffect, useState, useCallback } from "react";
import Layout from "../components/Layout.jsx";
import { householdApi } from "../api/household.api.js";
import { buildingConfigApi } from "../api/buildingConfig.api.js";
import {
    Plus,
    Search,
    X,
    Edit2,
    Trash2,
    Home as HomeIcon,
    Users,
    Building2,
    ChevronLeft,
    ChevronRight,
    KeyRound,
    Power
} from "lucide-react";
import toast from "react-hot-toast";

const Households = () => {
    const [activeTab, setActiveTab] = useState("households");

    // Overview Statistics
    const [overview, setOverview] = useState({
        totalHouseholds: 0,
        totalRegisteredFlats: 0,
        totalExpectedFlats: 0,
        remainingFlats: 0,
        totalResidents: 0,
        buildings: [],
        wings: [],
        unregisteredFlats: []
    });
    const [overviewLoading, setOverviewLoading] = useState(false);

    // Household List State
    const [households, setHouseholds] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [loading, setLoading] = useState(false);

    // Household Filters
    const [search, setSearch] = useState("");
    const [building, setBuilding] = useState("");
    const [wing, setWing] = useState("");
    const [status, setStatus] = useState("");

    // Household Modal State
    const [isOpen, setIsOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        building: "",
        wing: "",
        flatNumber: "",
        headOfFamily: "",
        phone: "",
        memberCount: 1,
        active: true,
        note: ""
    });
    const [formLoading, setFormLoading] = useState(false);

    // Building Config State
    const [configs, setConfigs] = useState([]);
    const [configLoading, setConfigLoading] = useState(false);

    // Building Config Modal State
    const [configModalOpen, setConfigModalOpen] = useState(false);
    const [configEditingId, setConfigEditingId] = useState(null);
    const [configForm, setConfigForm] = useState({ building: "", wing: "", ranges: [{ start: "", end: "" }] });
    const [configFormLoading, setConfigFormLoading] = useState(false);

    const fetchOverview = useCallback(async () => {
        setOverviewLoading(true);
        try {
            const response = await householdApi.getHouseholdOverview();
            if (response.success) {
                setOverview(response.data);
            } else {
                toast.error(response.message || "Failed to load household statistics");
            }
        } catch (err) {
            toast.error("Failed to load household statistics");
        } finally {
            setOverviewLoading(false);
        }
    }, []);

    const fetchHouseholds = useCallback(async () => {
        setLoading(true);
        try {
            const response = await householdApi.getHouseholds({
                search,
                building,
                wing,
                active: status,
                page,
                limit: 15
            });
            if (response.success) {
                setHouseholds(response.data.households);
                setTotal(response.data.total);
                setPages(response.data.pages);
            } else {
                toast.error(response.message || "Failed to load households");
            }
        } catch (err) {
            toast.error("An error occurred while loading households");
        } finally {
            setLoading(false);
        }
    }, [search, building, wing, status, page]);

    const fetchConfigs = useCallback(async () => {
        setConfigLoading(true);
        try {
            const response = await buildingConfigApi.getBuildingConfigs();
            if (response.success) {
                setConfigs(response.data);
            } else {
                toast.error(response.message || "Failed to load building configurations");
            }
        } catch (err) {
            toast.error("An error occurred while loading building configurations");
        } finally {
            setConfigLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOverview();
        fetchHouseholds();
    }, [fetchOverview, fetchHouseholds]);

    useEffect(() => {
        if (activeTab === "buildings") {
            fetchConfigs();
        }
    }, [activeTab, fetchConfigs]);

    const handleResetFilters = () => {
        setSearch("");
        setBuilding("");
        setWing("");
        setStatus("");
        setPage(1);
    };

    // ---- Household Form Handlers ----
    const openAddModal = () => {
        setEditingId(null);
        setFormData({
            building: "",
            wing: "",
            flatNumber: "",
            headOfFamily: "",
            phone: "",
            memberCount: 1,
            active: true,
            note: ""
        });
        setIsOpen(true);
    };

    const openEditModal = (household) => {
        setEditingId(household._id);
        setFormData({
            building: household.building,
            wing: household.wing,
            flatNumber: household.flatNumber,
            headOfFamily: household.headOfFamily,
            phone: household.phone || "",
            memberCount: household.memberCount,
            active: household.active,
            note: household.note || ""
        });
        setIsOpen(true);
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();

        if (!formData.building || Number(formData.building) < 1) {
            toast.error("Valid building number is required");
            return;
        }
        if (!formData.wing.trim()) {
            toast.error("Wing is required");
            return;
        }
        if (!formData.flatNumber || Number(formData.flatNumber) < 1) {
            toast.error("Valid flat number is required");
            return;
        }
        if (!formData.headOfFamily.trim()) {
            toast.error("Head of family name is required");
            return;
        }
        if (!formData.memberCount || Number(formData.memberCount) < 1) {
            toast.error("Member count must be at least 1");
            return;
        }

        setFormLoading(true);
        try {
            let response;
            if (editingId) {
                response = await householdApi.updateHousehold(editingId, {
                    ...formData,
                    building: Number(formData.building),
                    flatNumber: Number(formData.flatNumber),
                    memberCount: Number(formData.memberCount)
                });
            } else {
                response = await householdApi.createHousehold({
                    ...formData,
                    building: Number(formData.building),
                    flatNumber: Number(formData.flatNumber),
                    memberCount: Number(formData.memberCount)
                });
            }

            if (response.success) {
                toast.success(editingId ? "Household updated successfully" : "Household registered successfully");
                setIsOpen(false);
                fetchHouseholds();
                fetchOverview();
            } else {
                toast.error(response.message || "Failed to save household");
            }
        } catch (err) {
            toast.error("An error occurred while saving the household");
        } finally {
            setFormLoading(false);
        }
    };

    const handleToggleActive = async (household) => {
        const response = await householdApi.toggleHouseholdActive(household._id, !household.active);
        if (response.success) {
            toast.success(response.message || "Household status updated");
            fetchHouseholds();
            fetchOverview();
        } else {
            toast.error(response.message || "Failed to update household status");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this household?")) return;
        try {
            const response = await householdApi.deleteHousehold(id);
            if (response.success) {
                toast.success("Household deleted successfully");
                fetchHouseholds();
                fetchOverview();
            } else {
                toast.error(response.message || "Failed to delete household");
            }
        } catch (err) {
            toast.error("An error occurred while deleting the household");
        }
    };

    // ---- Building Config Form Handlers ----
    const openConfigAddModal = () => {
        setConfigEditingId(null);
        setConfigForm({ building: "", wing: "", ranges: [{ start: "", end: "" }] });
        setConfigModalOpen(true);
    };

    const openConfigEditModal = (config) => {
        const ranges = (Array.isArray(config.flatRanges) && config.flatRanges.length > 0)
            ? config.flatRanges.map((range) => ({ start: String(range.start), end: String(range.end) }))
            : [{ start: "1", end: String(config.expectedFlats || 1) }];
        setConfigEditingId(config._id);
        setConfigForm({
            building: config.building,
            wing: config.wing,
            ranges
        });
        setConfigModalOpen(true);
    };

    const handleConfigInputChange = (e) => {
        const { name, value } = e.target;
        setConfigForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleRangeChange = (index, field, value) => {
        setConfigForm((prev) => {
            const ranges = prev.ranges.map((range, i) => (i === index ? { ...range, [field]: value } : range));
            return { ...prev, ranges };
        });
    };

    const handleAddRange = () => {
        setConfigForm((prev) => ({ ...prev, ranges: [...prev.ranges, { start: "", end: "" }] }));
    };

    const handleRemoveRange = (index) => {
        setConfigForm((prev) => {
            const ranges = prev.ranges.filter((_, i) => i !== index);
            return { ...prev, ranges: ranges.length > 0 ? ranges : [{ start: "", end: "" }] };
        });
    };

    const configRangeTotal = configForm.ranges.reduce((sum, range) => {
        const start = Number(range.start);
        const end = Number(range.end);
        return sum + (Number.isInteger(start) && Number.isInteger(end) && start >= 1 && end >= start ? end - start + 1 : 0);
    }, 0);

    const handleConfigSubmit = async (e, forceRemove = false) => {
        e.preventDefault();

        if (!configForm.building || Number(configForm.building) < 1) {
            toast.error("Valid building number is required");
            return;
        }
        if (!configForm.wing.trim()) {
            toast.error("Wing is required");
            return;
        }
        const cleanRanges = configForm.ranges
            .map((range) => ({ start: Number(range.start), end: Number(range.end) }))
            .filter((range) => Number.isInteger(range.start) && Number.isInteger(range.end) && range.start >= 1 && range.end >= 1);
        if (cleanRanges.length === 0) {
            toast.error("At least one valid flat range is required (start ≤ end)");
            return;
        }
        for (const range of cleanRanges) {
            if (range.start > range.end) {
                toast.error(`Invalid range ${range.start} - ${range.end}: start must be ≤ end`);
                return;
            }
        }

        setConfigFormLoading(true);
        try {
            let response;
            const payload = {
                building: Number(configForm.building),
                wing: configForm.wing.trim().toUpperCase(),
                flatRanges: cleanRanges
            };
            if (forceRemove) payload.confirmRemove = true;

            if (configEditingId) {
                response = await buildingConfigApi.updateBuildingConfig(configEditingId, payload);
            } else {
                response = await buildingConfigApi.createBuildingConfig(payload);
            }

            if (response.success) {
                toast.success(configEditingId ? "Building configuration updated successfully" : "Building configuration created successfully");
                setConfigModalOpen(false);
                fetchConfigs();
                fetchOverview();
            } else {
                if (!forceRemove && response.message && response.message.includes("registered households")) {
                    const proceed = window.confirm(
                        "The new flat ranges remove flats that already have registered households. Existing household, occupant and donation records will be preserved but those flats will no longer count under the configured ranges. Continue?"
                    );
                    if (proceed) {
                        await handleConfigSubmit(e, true);
                        return;
                    }
                }
                toast.error(response.message || "Failed to save building configuration");
            }
        } catch (err) {
            toast.error("An error occurred while saving the configuration");
        } finally {
            setConfigFormLoading(false);
        }
    };

    const handleConfigDelete = async (id) => {
        if (!window.confirm("Are you sure you want to remove this building & wing configuration?")) return;
        try {
            const response = await buildingConfigApi.deleteBuildingConfig(id);
            if (response.success) {
                toast.success("Building configuration deleted successfully");
                fetchConfigs();
                fetchOverview();
            } else {
                toast.error(response.message || "Failed to delete configuration");
            }
        } catch (err) {
            toast.error("An error occurred while deleting the configuration");
        }
    };

    const wingStatsMap = {};
    overview.wings.forEach((w) => {
        wingStatsMap[`${w.building}-${w.wing}`] = w;
    });

    const unregisteredMap = {};
    overview.unregisteredFlats.forEach((u) => {
        unregisteredMap[`${u.building}-${u.wing}`] = u.flats;
    });

    return (
        <Layout>
            {/* Header */}
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                        Resident Households
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
                        Manage registered flats, resident families and building & wing configurations ({total} households)
                    </p>
                </div>
                {activeTab === "households" ? (
                    <button
                        onClick={openAddModal}
                        className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/15 transition-all hover:bg-indigo-700"
                    >
                        <Plus className="h-4.5 w-4.5" />
                        Register Household
                    </button>
                ) : (
                    <button
                        onClick={openConfigAddModal}
                        className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/15 transition-all hover:bg-indigo-700"
                    >
                        <Plus className="h-4.5 w-4.5" />
                        Add Building & Wing
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="mb-6 flex gap-2">
                <button
                    onClick={() => setActiveTab("households")}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                        activeTab === "households"
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15"
                            : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
                    }`}
                >
                    <HomeIcon className="h-4 w-4" />
                    Households
                </button>
                <button
                    onClick={() => setActiveTab("buildings")}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                        activeTab === "buildings"
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15"
                            : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
                    }`}
                >
                    <Building2 className="h-4 w-4" />
                    Buildings & Wings
                </button>
            </div>

            {/* Overview Metric Cards */}
            <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-400">Registered Households</span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
                            <HomeIcon className="h-4.5 w-4.5" />
                        </div>
                    </div>
                    <div className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
                        {overviewLoading ? "..." : overview.totalHouseholds}
                    </div>
                    <p className="mt-1 text-[10px] font-medium text-gray-400">Active resident families</p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-400">Resident Population</span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400">
                            <Users className="h-4.5 w-4.5" />
                        </div>
                    </div>
                    <div className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
                        {overviewLoading ? "..." : overview.totalResidents}
                    </div>
                    <p className="mt-1 text-[10px] font-medium text-gray-400">Total family members</p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-400">Flats Registered</span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                            <Building2 className="h-4.5 w-4.5" />
                        </div>
                    </div>
                    <div className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
                        {overviewLoading ? "..." : `${overview.totalRegisteredFlats} / ${overview.totalExpectedFlats}`}
                    </div>
                    <p className="mt-1 text-[10px] font-medium text-gray-400">Registered vs expected flats</p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-400">Unregistered Flats</span>
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
                            <KeyRound className="h-4.5 w-4.5" />
                        </div>
                    </div>
                    <div className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
                        {overviewLoading ? "..." : overview.remainingFlats}
                    </div>
                    <p className="mt-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">Remaining flats not yet registered</p>
                </div>
            </div>

            {activeTab === "households" ? (
                <>
                    {/* Filter Bar */}
                    <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5">
                            <div className="relative md:col-span-2">
                                <Search className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search name, phone or flat..."
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-9 pr-3 text-xs placeholder-gray-400 outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950"
                                />
                            </div>
                            <div>
                                <input
                                    type="number"
                                    placeholder="Building No."
                                    value={building}
                                    onChange={(e) => { setBuilding(e.target.value); setPage(1); }}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 px-3 text-xs placeholder-gray-400 outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950"
                                />
                            </div>
                            <div>
                                <input
                                    type="text"
                                    placeholder="Wing (A, B...)"
                                    value={wing}
                                    onChange={(e) => { setWing(e.target.value.toUpperCase()); setPage(1); }}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 px-3 text-xs placeholder-gray-400 outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950"
                                />
                            </div>
                            <div className="flex gap-2">
                                <select
                                    value={status}
                                    onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                                    className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 px-3 text-xs text-gray-600 outline-none transition-colors focus:border-indigo-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400"
                                >
                                    <option value="">All Status</option>
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </select>
                                <button
                                    onClick={handleResetFilters}
                                    className="shrink-0 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Households Table */}
                    <div className="rounded-2xl border border-gray-100 bg-white shadow-md shadow-gray-100/30 dark:border-gray-800 dark:bg-gray-900">
                        {loading ? (
                            <div className="flex h-64 items-center justify-center">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                                    <p className="text-xs font-medium text-gray-400">Loading households...</p>
                                </div>
                            </div>
                        ) : households.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <HomeIcon className="h-12 w-12 text-gray-300 mb-3" />
                                <p className="text-sm font-bold text-gray-400 dark:text-gray-500">No households found</p>
                                <p className="text-xs text-gray-400 mt-1">Register your first resident household to get started!</p>
                            </div>
                        ) : (
                            <>
                                <div className="hidden overflow-x-auto md:block">
                                    <table className="w-full text-left text-sm border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50/50 text-[11px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:bg-gray-800/20 dark:border-gray-800">
                                                <th className="px-6 py-4">Flat</th>
                                                <th className="px-6 py-4">Head of Family</th>
                                                <th className="px-6 py-4">Phone</th>
                                                <th className="px-6 py-4">Members</th>
                                                <th className="px-6 py-4">Status</th>
                                                <th className="px-6 py-4 text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                                            {households.map((h) => (
                                                <tr key={h._id} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/10">
                                                    <td className="px-6 py-4.5">
                                                        <div className="font-bold text-xs text-indigo-600 dark:text-indigo-400">
                                                            B{h.building} · Wing {h.wing} · Flat {h.flatNumber}
                                                        </div>
                                                        {h.note && (
                                                            <div className="text-[10px] text-gray-400 truncate max-w-xs mt-0.5">{h.note}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4.5 font-semibold text-gray-700 dark:text-gray-300">
                                                        {h.headOfFamily}
                                                    </td>
                                                    <td className="px-6 py-4.5 text-xs text-gray-500 font-medium">
                                                        {h.phone || "—"}
                                                    </td>
                                                    <td className="px-6 py-4.5">
                                                        <span className="inline-flex items-center rounded-lg bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700 dark:bg-violet-950/20 dark:text-violet-400">
                                                            {h.memberCount} {h.memberCount === 1 ? "person" : "people"}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4.5">
                                                        <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-semibold ${
                                                            h.active
                                                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                                                                : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                                                        }`}>
                                                            {h.active ? "ACTIVE" : "INACTIVE"}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4.5">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={() => openEditModal(h)}
                                                                title="Edit household"
                                                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                                                            >
                                                                <Edit2 className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleToggleActive(h)}
                                                                title={h.active ? "Deactivate household" : "Activate household"}
                                                                className={`rounded-lg p-1 transition-colors ${
                                                                    h.active ? "text-gray-400 hover:bg-amber-50 hover:text-amber-600" : "text-gray-400 hover:bg-emerald-50 hover:text-emerald-600"
                                                                }`}
                                                            >
                                                                <Power className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(h._id)}
                                                                title="Delete household"
                                                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-red-500 transition-colors"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile household cards */}
                                <div className="divide-y divide-gray-100 md:hidden dark:divide-gray-800/40">
                                    {households.map((h) => (
                                        <div key={h._id} className="px-5 py-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
                                                        B{h.building} · Wing {h.wing} · Flat {h.flatNumber}
                                                    </div>
                                                    <div className="mt-1 font-semibold text-sm text-gray-700 dark:text-gray-300">
                                                        {h.headOfFamily}
                                                    </div>
                                                    <div className="mt-0.5 text-xs text-gray-500 font-medium">
                                                        {h.phone || "—"}
                                                    </div>
                                                    {h.note && (
                                                        <div className="mt-0.5 truncate text-[11px] text-gray-400">{h.note}</div>
                                                    )}
                                                </div>
                                                <div className="shrink-0">
                                                    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                                                        h.active
                                                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                                                            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                                                    }`}>
                                                        {h.active ? "ACTIVE" : "INACTIVE"}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="mt-3 flex items-center justify-between gap-2">
                                                <span className="inline-flex items-center rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-950/20 dark:text-violet-400">
                                                    {h.memberCount} {h.memberCount === 1 ? "person" : "people"}
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        onClick={() => openEditModal(h)}
                                                        title="Edit household"
                                                        aria-label="Edit household"
                                                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-indigo-600 transition-colors dark:border-gray-800 dark:hover:bg-gray-800"
                                                    >
                                                        <Edit2 className="h-4.5 w-4.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleActive(h)}
                                                        title={h.active ? "Deactivate household" : "Activate household"}
                                                        aria-label={h.active ? "Deactivate household" : "Activate household"}
                                                        className={`flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 transition-colors dark:border-gray-800 ${
                                                            h.active ? "text-gray-500 hover:bg-amber-50 hover:text-amber-600" : "text-gray-500 hover:bg-emerald-50 hover:text-emerald-600"
                                                        }`}
                                                    >
                                                        <Power className="h-4.5 w-4.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(h._id)}
                                                        title="Delete household"
                                                        aria-label="Delete household"
                                                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors dark:border-gray-800 dark:hover:bg-red-950/20"
                                                    >
                                                        <Trash2 className="h-4.5 w-4.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {pages > 1 && (
                                    <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 dark:border-gray-800">
                                        <span className="text-xs text-gray-500">Page {page} of {pages}</span>
                                        <div className="flex gap-2">
                                            <button
                                                disabled={page === 1}
                                                onClick={() => setPage(page - 1)}
                                                className="rounded-xl border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:hover:bg-gray-950"
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </button>
                                            <button
                                                disabled={page === pages}
                                                onClick={() => setPage(page + 1)}
                                                className="rounded-xl border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:hover:bg-gray-950"
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </>
            ) : (
                <>
                    {/* Building Configuration Details */}
                    <div className="rounded-2xl border border-gray-100 bg-white shadow-md shadow-gray-100/30 dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-gray-800">
                            <div>
                                <h3 className="text-md font-bold text-gray-800 dark:text-white">Building & Wing Configuration</h3>
                                <p className="text-xs text-gray-400 mt-0.5">Configure flat ranges (start & end) per building & wing to auto-generate flats and track remaining unregistered flats</p>
                            </div>
                            <span className="text-xs font-semibold text-gray-400">
                                {overview.totalExpectedFlats} expected · {overview.totalRegisteredFlats} registered · {overview.remainingFlats} remaining
                            </span>
                        </div>

                        {configLoading ? (
                            <div className="flex h-64 items-center justify-center">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                                    <p className="text-xs font-medium text-gray-400">Loading configurations...</p>
                                </div>
                            </div>
                        ) : configs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <Building2 className="h-12 w-12 text-gray-300 mb-3" />
                                <p className="text-sm font-bold text-gray-400 dark:text-gray-500">No building configurations yet</p>
                                <p className="text-xs text-gray-400 mt-1">Add a building & wing with flat ranges (e.g. 1-20, 101-120) to auto-generate and track remaining flats.</p>
                            </div>
                        ) : (
                            <>
                                <div className="hidden overflow-x-auto md:block">
                                    <table className="w-full text-left text-sm border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50/50 text-[11px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:bg-gray-800/20 dark:border-gray-800">
                                                <th className="px-6 py-4">Building & Wing</th>
                                                <th className="px-6 py-4">Flats (Ranges)</th>
                                                <th className="px-6 py-4">Registered</th>
                                                <th className="px-6 py-4">Remaining</th>
                                                <th className="px-6 py-4">People</th>
                                                <th className="px-6 py-4">Unregistered Flats</th>
                                                <th className="px-6 py-4 text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                                            {configs.map((config) => {
                                                const stats = wingStatsMap[`${config.building}-${config.wing}`] || {
                                                    registeredFlats: 0,
                                                    remainingFlats: 0,
                                                    people: 0
                                                };
                                                const unregistered = unregisteredMap[`${config.building}-${config.wing}`] || [];
                                                return (
                                                    <tr key={config._id} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/10">
                                                        <td className="px-6 py-4.5 font-bold text-xs text-indigo-600 dark:text-indigo-400">
                                                            Building {config.building} · Wing {config.wing}
                                                        </td>
                                                        <td className="px-6 py-4.5">
                                                            <div className="font-semibold text-gray-700 dark:text-gray-300">
                                                                {config.expectedFlats}
                                                            </div>
                                                            {Array.isArray(config.flatRanges) && config.flatRanges.length > 0 && (
                                                                <div className="text-[10px] font-medium text-gray-400 mt-0.5">
                                                                    {config.flatRanges.map((r) => `${r.start}-${r.end}`).join(" · ")}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4.5 font-semibold text-emerald-600 dark:text-emerald-400">
                                                            {stats.registeredFlats}
                                                        </td>
                                                        <td className={`px-6 py-4.5 font-semibold ${stats.remainingFlats > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-400"}`}>
                                                            {stats.remainingFlats}
                                                        </td>
                                                        <td className="px-6 py-4.5 font-semibold text-violet-600 dark:text-violet-400">
                                                            {stats.people}
                                                        </td>
                                                        <td className="px-6 py-4.5">
                                                            {unregistered.length > 0 ? (
                                                                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                                                                    Flats: {unregistered.join(", ")}
                                                                </span>
                                                            ) : (
                                                                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                                                    All flats registered
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4.5">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button
                                                                    onClick={() => openConfigEditModal(config)}
                                                                    className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                                                                >
                                                                    <Edit2 className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleConfigDelete(config._id)}
                                                                    className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-red-500 transition-colors"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile building config cards */}
                                <div className="divide-y divide-gray-100 md:hidden dark:divide-gray-800/40">
                                    {configs.map((config) => {
                                        const stats = wingStatsMap[`${config.building}-${config.wing}`] || {
                                            registeredFlats: 0,
                                            remainingFlats: 0,
                                            people: 0
                                        };
                                        const unregistered = unregisteredMap[`${config.building}-${config.wing}`] || [];
                                        return (
                                            <div key={config._id} className="px-5 py-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
                                                            Building {config.building} · Wing {config.wing}
                                                        </div>
                                                        <div className="mt-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                            {config.expectedFlats} flats
                                                            {Array.isArray(config.flatRanges) && config.flatRanges.length > 0 && (
                                                                <span className="text-[11px] font-medium text-gray-400">
                                                                    {" "}· {config.flatRanges.map((r) => `${r.start}-${r.end}`).join(" · ")}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="mt-0.5 text-[11px] text-gray-400">
                                                            {stats.people} people
                                                        </div>
                                                        <div className={`mt-1 text-[11px] font-medium ${unregistered.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                                                            {unregistered.length > 0 ? `Unregistered: ${unregistered.join(", ")}` : "All flats registered"}
                                                        </div>
                                                    </div>
                                                    <div className="shrink-0 text-right">
                                                        <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                                            {stats.registeredFlats} registered
                                                        </div>
                                                        <div className={`mt-0.5 text-xs font-semibold ${stats.remainingFlats > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-400"}`}>
                                                            {stats.remainingFlats} remaining
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-3 flex justify-end gap-1.5">
                                                    <button
                                                        onClick={() => openConfigEditModal(config)}
                                                        title="Edit configuration"
                                                        aria-label="Edit configuration"
                                                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-indigo-600 transition-colors dark:border-gray-800 dark:hover:bg-gray-800"
                                                    >
                                                        <Edit2 className="h-4.5 w-4.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleConfigDelete(config._id)}
                                                        title="Delete configuration"
                                                        aria-label="Delete configuration"
                                                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors dark:border-gray-800 dark:hover:bg-red-950/20"
                                                    >
                                                        <Trash2 className="h-4.5 w-4.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}

            {/* Household Form Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4">
                    <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 dark:bg-gray-900 dark:border dark:border-gray-800">
                        <div className="flex items-center justify-between border-b border-gray-100 p-6 dark:border-gray-800">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                                {editingId ? "Edit Household" : "Register New Household"}
                            </h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit}>
                            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Building *</label>
                                        <input
                                            type="number"
                                            name="building"
                                            required
                                            min="1"
                                            value={formData.building}
                                            onChange={handleInputChange}
                                            placeholder="1"
                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Wing *</label>
                                        <input
                                            type="text"
                                            name="wing"
                                            required
                                            maxLength="5"
                                            value={formData.wing}
                                            onChange={(e) => handleInputChange({ target: { name: "wing", value: e.target.value.toUpperCase(), type: "text" } })}
                                            placeholder="A"
                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Flat No. *</label>
                                        <input
                                            type="number"
                                            name="flatNumber"
                                            required
                                            min="1"
                                            value={formData.flatNumber}
                                            onChange={handleInputChange}
                                            placeholder="12"
                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Head of Family *</label>
                                    <input
                                        type="text"
                                        name="headOfFamily"
                                        required
                                        value={formData.headOfFamily}
                                        onChange={handleInputChange}
                                        placeholder="Ganesh Sharma"
                                        className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Phone Number</label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            placeholder="9876543210"
                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Family Members *</label>
                                        <input
                                            type="number"
                                            name="memberCount"
                                            required
                                            min="1"
                                            value={formData.memberCount}
                                            onChange={handleInputChange}
                                            placeholder="4"
                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Note / Remarks</label>
                                    <textarea
                                        name="note"
                                        value={formData.note}
                                        onChange={handleInputChange}
                                        rows="2"
                                        placeholder="Any remarks about this household..."
                                        className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                    ></textarea>
                                </div>

                                {editingId && (
                                    <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800">
                                        <input
                                            type="checkbox"
                                            name="active"
                                            checked={formData.active}
                                            onChange={handleInputChange}
                                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Active household</span>
                                        <span className="text-[10px] text-gray-400">Deactivated households are excluded from population counts</span>
                                    </label>
                                )}
                            </div>

                            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4 rounded-b-3xl sm:flex-row sm:items-center sm:justify-end sm:gap-3 dark:border-gray-800 dark:bg-gray-950">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-4 text-xs font-semibold text-gray-500 hover:bg-gray-50 sm:w-auto dark:border-gray-800 dark:bg-gray-900"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 px-4 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 sm:w-auto"
                                >
                                    {formLoading ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                    ) : (
                                        editingId ? "Update Household" : "Register Household"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Building & Wing Config Modal */}
            {configModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4">
                    <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 dark:bg-gray-900 dark:border dark:border-gray-800">
                        <div className="flex items-center justify-between border-b border-gray-100 p-6 dark:border-gray-800">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                                {configEditingId ? "Edit Building & Wing" : "Add Building & Wing"}
                            </h3>
                            <button
                                onClick={() => setConfigModalOpen(false)}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleConfigSubmit}>
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Building *</label>
                                        <input
                                            type="number"
                                            name="building"
                                            required
                                            min="1"
                                            value={configForm.building}
                                            onChange={handleConfigInputChange}
                                            placeholder="1"
                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Wing *</label>
                                        <input
                                            type="text"
                                            name="wing"
                                            required
                                            maxLength="5"
                                            value={configForm.wing}
                                            onChange={(e) => handleConfigInputChange({ target: { name: "wing", value: e.target.value.toUpperCase() } })}
                                            placeholder="A"
                                            className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                        Flat Ranges (Start & End) *
                                    </label>
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        Flats are generated automatically for every number between the start and end (e.g. 1-20, 101-120, 201-220). Multiple non-overlapping ranges per wing are supported.
                                    </p>
                                    <div className="mt-2 space-y-2">
                                        {configForm.ranges.map((range, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <div className="flex-1">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        placeholder="Start (e.g. 1)"
                                                        value={range.start}
                                                        onChange={(e) => handleRangeChange(index, "start", e.target.value)}
                                                        className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                                    />
                                                </div>
                                                <span className="text-xs text-gray-400 font-bold">to</span>
                                                <div className="flex-1">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        placeholder="End (e.g. 20)"
                                                        value={range.end}
                                                        onChange={(e) => handleRangeChange(index, "end", e.target.value)}
                                                        className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-indigo-500 dark:border-gray-850 dark:bg-gray-950"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveRange(index)}
                                                    disabled={configForm.ranges.length === 1 && !configEditingId}
                                                    className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40 dark:hover:bg-red-950/20"
                                                    title="Remove range"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={handleAddRange}
                                            className="flex items-center gap-1.5 rounded-xl border border-dashed border-indigo-300 px-3.5 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-950/20"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            Add Another Range
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-2 dark:text-gray-400">
                                        Total flats generated: <span className="font-bold text-indigo-600 dark:text-indigo-400">{configRangeTotal}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4 rounded-b-3xl sm:flex-row sm:items-center sm:justify-end sm:gap-3 dark:border-gray-800 dark:bg-gray-950">
                                <button
                                    type="button"
                                    onClick={() => setConfigModalOpen(false)}
                                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-4 text-xs font-semibold text-gray-500 hover:bg-gray-50 sm:w-auto dark:border-gray-800 dark:bg-gray-900"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={configFormLoading}
                                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 px-4 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 sm:w-auto"
                                >
                                    {configFormLoading ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                    ) : (
                                        configEditingId ? "Update Config" : "Add Config"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Households;