import React, { useEffect, useState, useCallback, useMemo } from "react";
import Layout from "../components/Layout.jsx";
import { reportApi } from "../api/report.api.js";
import { useMandalStore } from "../store/useMandalStore.js";
import { BookOpen, CalendarDays, ArrowUpRight, TrendingUp, TrendingDown, Scale, Wallet, Smartphone, Filter } from "lucide-react";
import toast from "react-hot-toast";

const Ledger = () => {
    const { selectedYear } = useMandalStore();

    const [ledger, setLedger] = useState([]);
    const [loading, setLoading] = useState(false);
    const [methodFilter, setMethodFilter] = useState("all"); // "all", "cash", "upi", "bank"

    const fetchLedger = useCallback(async () => {
        if (!selectedYear) return;
        setLoading(true);
        try {
            const response = await reportApi.getLedger({ festivalYear: selectedYear });
            if (response.success) {
                setLedger(response.data || []);
            } else {
                toast.error(response.message || "Failed to load ledger");
            }
        } catch (err) {
            toast.error("An error occurred while fetching ledger");
        } finally {
            setLoading(false);
        }
    }, [selectedYear]);

    useEffect(() => {
        fetchLedger();
    }, [fetchLedger]);

    const formatCurrency = (val) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }).format(val || 0);
    };

    // Calculate balances from ledger
    const summary = useMemo(() => {
        const latest = ledger.length > 0 ? ledger[ledger.length - 1] : null;
        const totalIncome = ledger.filter((t) => t.type === "donation").reduce((s, t) => s + (t.amount || 0), 0);
        const totalExpense = ledger.filter((t) => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);

        return {
            netBalance: latest ? (latest.runningBalance ?? (totalIncome - totalExpense)) : 0,
            cashBalance: latest ? (latest.runningCashBalance ?? 0) : 0,
            upiBalance: latest ? (latest.runningUpiBalance ?? 0) : 0,
            totalIncome,
            totalExpense
        };
    }, [ledger]);

    const filteredLedger = useMemo(() => {
        if (methodFilter === "all") return ledger;
        return ledger.filter((tx) => (tx.paymentMethod || "cash").toLowerCase() === methodFilter.toLowerCase());
    }, [ledger, methodFilter]);

    const getMethodBadge = (method) => {
        const m = (method || "cash").toLowerCase();
        if (m === "cash") {
            return (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <Wallet className="h-3 w-3" />
                    Cash
                </span>
            );
        }
        if (m === "upi") {
            return (
                <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300">
                    <Smartphone className="h-3 w-3" />
                    UPI
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-950/30 dark:text-sky-300">
                Bank
            </span>
        );
    };

    return (
        <Layout>
            {/* Header section */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                    Transaction Ledger
                </h1>
                <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
                    A unified chronological ledger tracking every cash and online transaction for {selectedYear}
                </p>
            </div>

            {/* Balances Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 mb-6">
                {/* Total Balance */}
                <div className="rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm sm:shadow-md shadow-gray-100/40 dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Net Ledger Balance</span>
                        <Scale className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div className={`mt-2 text-xl sm:text-2xl font-bold ${summary.netBalance >= 0 ? "text-gray-900 dark:text-white" : "text-rose-600"}`}>
                        {formatCurrency(summary.netBalance)}
                    </div>
                    <div className="mt-1 text-[11px] text-gray-400">
                        In: ₹{summary.totalIncome.toLocaleString("en-IN")} • Out: ₹{summary.totalExpense.toLocaleString("en-IN")}
                    </div>
                </div>

                {/* Cash in Hand */}
                <div className="rounded-xl sm:rounded-2xl border border-emerald-100/80 bg-white p-4 sm:p-5 shadow-sm sm:shadow-md shadow-emerald-50/50 dark:border-emerald-900/30 dark:bg-gray-900">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Cash in Hand</span>
                        <Wallet className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className={`mt-2 text-xl sm:text-2xl font-bold ${summary.cashBalance >= 0 ? "text-gray-900 dark:text-white" : "text-rose-600"}`}>
                        {formatCurrency(summary.cashBalance)}
                    </div>
                    <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                        Physical cash holding
                    </div>
                </div>

                {/* UPI Account */}
                <div className="rounded-xl sm:rounded-2xl border border-indigo-100/80 bg-white p-4 sm:p-5 shadow-sm sm:shadow-md shadow-indigo-50/50 dark:border-indigo-900/30 dark:bg-gray-900">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">UPI / Bank Balance</span>
                        <Smartphone className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div className={`mt-2 text-xl sm:text-2xl font-bold ${summary.upiBalance >= 0 ? "text-gray-900 dark:text-white" : "text-rose-600"}`}>
                        {formatCurrency(summary.upiBalance)}
                    </div>
                    <div className="mt-1 text-[11px] text-indigo-600 dark:text-indigo-400">
                        Digital account balance
                    </div>
                </div>
            </div>

            {/* List Table Container */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-md shadow-gray-100/30 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 p-4 sm:p-6 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-indigo-500" />
                        <h3 className="text-md font-bold text-gray-800 dark:text-white">Unified Ledger</h3>
                        <span className="text-xs text-gray-400">({filteredLedger.length} records)</span>
                    </div>

                    {/* Method Filter Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                        {[
                            { id: "all", label: "All Methods" },
                            { id: "cash", label: "Cash Only" },
                            { id: "upi", label: "UPI Only" },
                            { id: "bank", label: "Bank" }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setMethodFilter(tab.id)}
                                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                                    methodFilter === tab.id
                                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                                        : "bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                            <p className="text-xs font-medium text-gray-400">Loading ledger...</p>
                        </div>
                    </div>
                ) : filteredLedger.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <BookOpen className="h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-sm font-bold text-gray-400 dark:text-gray-500">
                            {methodFilter === "all" ? "Ledger is empty" : `No ${methodFilter.toUpperCase()} transactions found`}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Record a donation or expense to start calculating your running balance!</p>
                    </div>
                ) : (
                    <>
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 text-[11px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:bg-gray-800/20 dark:border-gray-800">
                                        <th className="px-6 py-4">Ref/Receipt</th>
                                        <th className="px-6 py-4">Transaction Details</th>
                                        <th className="px-6 py-4">Flow</th>
                                        <th className="px-6 py-4">Method</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4 text-right">Debit / Credit</th>
                                        <th className="px-6 py-4 text-right">Running Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                                    {filteredLedger.map((tx) => (
                                        <tr key={tx._id} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/10">
                                            <td className="px-6 py-4.5 font-bold text-xs text-gray-400">
                                                {tx.referenceNumber}
                                            </td>
                                            <td className="px-6 py-4.5">
                                                <div className="font-semibold text-gray-700 dark:text-gray-300">
                                                    {tx.title}
                                                </div>
                                                {tx.note && (
                                                    <div className="text-[10px] text-gray-400 truncate max-w-xs mt-0.5">
                                                        {tx.note}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4.5">
                                                <div className="flex items-center gap-1">
                                                    {tx.type === "donation" ? (
                                                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
                                                            <TrendingUp className="h-3.5 w-3.5" />
                                                        </span>
                                                    ) : (
                                                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400">
                                                            <TrendingDown className="h-3.5 w-3.5" />
                                                        </span>
                                                    )}
                                                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 capitalize">
                                                        {tx.type}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4.5">
                                                {getMethodBadge(tx.paymentMethod)}
                                            </td>
                                            <td className="px-6 py-4.5 text-xs text-gray-400">
                                                <div className="flex items-center gap-1.5">
                                                    <CalendarDays className="h-4 w-4" />
                                                    {new Date(tx.date).toLocaleDateString("en-IN", {
                                                        day: "numeric",
                                                        month: "short",
                                                        year: "numeric"
                                                    })}
                                                </div>
                                            </td>
                                            <td className={`px-6 py-4.5 text-right font-bold text-sm ${
                                                tx.type === "donation" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                                            }`}>
                                                {tx.type === "donation" ? "+" : "-"} ₹{tx.amount.toLocaleString("en-IN")}
                                            </td>
                                            <td className="px-6 py-4.5 text-right font-bold text-sm text-indigo-600 dark:text-indigo-400">
                                                {formatCurrency(tx.runningBalance)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile ledger cards */}
                        <div className="divide-y divide-gray-100 md:hidden dark:divide-gray-800/40">
                            {filteredLedger.map((tx) => (
                                <div key={tx._id} className="px-5 py-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                                                {tx.title}
                                            </div>
                                            <div className="mt-0.5 text-[11px] font-bold text-gray-400">
                                                {tx.referenceNumber}
                                            </div>
                                            {tx.note && (
                                                <div className="mt-0.5 truncate text-[11px] text-gray-400">
                                                    {tx.note}
                                                </div>
                                            )}
                                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                                {tx.type === "donation" ? (
                                                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
                                                        <TrendingUp className="h-3 w-3" />
                                                        Donation
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/20 dark:text-rose-400">
                                                        <TrendingDown className="h-3 w-3" />
                                                        Expense
                                                    </span>
                                                )}
                                                {getMethodBadge(tx.paymentMethod)}
                                                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                                                    <CalendarDays className="h-3 w-3" />
                                                    {new Date(tx.date).toLocaleDateString("en-IN", {
                                                        day: "numeric",
                                                        month: "short",
                                                        year: "numeric"
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <div className={`text-sm font-bold ${tx.type === "donation" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                                {tx.type === "donation" ? "+" : "-"} ₹{tx.amount.toLocaleString("en-IN")}
                                            </div>
                                            <div className="mt-0.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                                Bal: {formatCurrency(tx.runningBalance)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </Layout>
    );
};

export default Ledger;
