import React, { useEffect, useState, useCallback } from "react";
import Layout from "../components/Layout.jsx";
import { reportApi } from "../api/report.api.js";
import { useMandalStore } from "../store/useMandalStore.js";
import { BookOpen, CalendarDays, ArrowUpRight, TrendingUp, TrendingDown, Scale } from "lucide-react";
import toast from "react-hot-toast";

const Ledger = () => {
    const { selectedYear } = useMandalStore();

    const [ledger, setLedger] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchLedger = useCallback(async () => {
        if (!selectedYear) return;
        setLoading(true);
        try {
            const response = await reportApi.getLedger({ festivalYear: selectedYear });
            if (response.success) {
                setLedger(response.data);
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
        }).format(val);
    };

    return (
        <Layout>
            {/* Header section */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                    Transaction Ledger
                </h1>
                <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
                    A unified chronological ledger of all income and expenses for {selectedYear}
                </p>
            </div>

            {/* List Table Container */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-md shadow-gray-100/30 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center justify-between border-b border-gray-100 p-6 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-indigo-500" />
                        <h3 className="text-md font-bold text-gray-800 dark:text-white">Unified Ledger</h3>
                    </div>
                </div>

                {loading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                            <p className="text-xs font-medium text-gray-400">Loading ledger...</p>
                        </div>
                    </div>
                ) : ledger.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <BookOpen className="h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-sm font-bold text-gray-400 dark:text-gray-500">Ledger is empty</p>
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
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4 text-right">Debit / Credit</th>
                                        <th className="px-6 py-4 text-right">Running Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40">
                                    {ledger.map((tx) => (
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
                            {ledger.map((tx) => (
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
