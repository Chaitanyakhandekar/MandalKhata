import React, { useRef, useState } from "react";
import Layout from "../components/Layout.jsx";
import {
    Building2,
    Home as HomeIcon,
    Coins,
    Receipt,
    Download,
    FileSpreadsheet,
    UploadCloud,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Loader2,
    RefreshCw,
    FileDown,
    ArrowRight,
    RotateCcw
} from "lucide-react";
import toast from "react-hot-toast";
import {
    downloadBulkTemplate,
    uploadBulkPreview,
    confirmBulkImport,
    downloadBulkErrorReport
} from "../api/bulkImport.api.js";

const IMPORT_TYPES = [
    { key: "buildings", label: "Buildings", description: "Building, wing and flat ranges", icon: Building2 },
    { key: "households", label: "Households / Residents", description: "Occupant details per flat", icon: HomeIcon },
    { key: "donations", label: "Donations", description: "Resident & external donor donations", icon: Coins },
    { key: "expenses", label: "Expenses", description: "Festival expenditure records", icon: Receipt }
];

const STEPS = ["Select Type", "Upload File", "Preview & Validate", "Confirm Import"];

const BulkImport = () => {
    const [selectedType, setSelectedType] = useState(null);
    const [fileName, setFileName] = useState("");
    const [parsing, setParsing] = useState(false);
    const [importing, setImporting] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [preview, setPreview] = useState(null);
    const [result, setResult] = useState(null);
    const fileInputRef = useRef(null);

    const activeType = IMPORT_TYPES.find((t) => t.key === selectedType);
    const currentStep = !selectedType ? 0 : !preview && !parsing && !result ? 1 : !result ? 2 : 3;

    const handleSelectType = (typeKey) => {
        setSelectedType(typeKey);
        setPreview(null);
        setResult(null);
        setFileName("");
        setConfirming(false);
    };

    const handleTemplateDownload = async (format) => {
        if (!selectedType) return;
        try {
            await downloadBulkTemplate(selectedType, format);
            toast.success(`Template template-${selectedType}.${format} downloaded`);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to download template");
        }
    };

    const handleFileChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        setPreview(null);
        setResult(null);
        setConfirming(false);
        setParsing(true);
        try {
            const response = await uploadBulkPreview(selectedType, file);
            if (response.success) {
                setPreview(response.data);
                if (response.data.validRows === 0) {
                    toast.error("No importable rows found - fix the errors shown and upload the file again");
                } else {
                    toast.success(`${response.data.validRows} of ${response.data.totalRows} rows are valid and ready to import`);
                }
            } else {
                toast.error(response.message || "Failed to parse the file");
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "An error occurred while parsing the file");
        } finally {
            setParsing(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleErrorReport = async () => {
        if (!preview) return;
        try {
            await downloadBulkErrorReport({
                type: preview.type,
                fileName: preview.fileName,
                statuses: preview.errors
            });
            toast.success("Error report downloaded");
        } catch (err) {
            toast.error("Failed to download the error report");
        }
    };

    const handleConfirm = async () => {
        if (!preview || !preview.data || preview.data.length === 0) return;
        if (!confirming) {
            setConfirming(true);
            return;
        }
        setImporting(true);
        setConfirming(false);
        try {
            const response = await confirmBulkImport(selectedType, preview.data);
            if (response.success) {
                setResult(response.data);
                toast.success(response.message || "Import completed");
                window.dispatchEvent(new Event("dashboard-data-refresh"));
            } else {
                toast.error(response.message || "Import failed");
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "An error occurred while importing");
        } finally {
            setImporting(false);
            setConfirming(false);
        }
    };

    const resetAll = () => {
        setSelectedType(null);
        setPreview(null);
        setResult(null);
        setFileName("");
        setConfirming(false);
    };

    const statCard = (label, value, colorClass) => (
        <div className="flex flex-col items-center rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
            <span className={`text-2xl font-bold ${colorClass}`}>{value}</span>
            <span className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
        </div>
    );

    return (
        <Layout>
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">Bulk Import</h1>
                    <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
                        Upload buildings, households, donations and expenses from Excel or CSV files
                    </p>
                </div>
                {selectedType && (
                    <button
                        onClick={resetAll}
                        className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-950"
                    >
                        <RotateCcw className="h-4 w-4" />
                        Start Over
                    </button>
                )}
            </div>

            {/* Stepper */}
            {selectedType && (
                <div className="mb-6 flex items-center gap-2 overflow-x-auto rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    {STEPS.map((step, index) => (
                        <React.Fragment key={step}>
                            {index > 0 && <div className={`h-px w-6 shrink-0 sm:w-10 ${index <= currentStep ? "bg-indigo-500" : "bg-gray-200 dark:bg-gray-800"}`} />}
                            <span className={`flex shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${index <= currentStep ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400"}`}>
                                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${index <= currentStep ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-400 dark:bg-gray-800"}`}>
                                    {index + 1}
                                </span>
                                {step}
                            </span>
                        </React.Fragment>
                    ))}
                </div>
            )}

            {/* Step 1 - Select import type */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {IMPORT_TYPES.map((typeEntry) => {
                    const Icon = typeEntry.icon;
                    const isSelected = selectedType === typeEntry.key;
                    return (
                        <button
                            key={typeEntry.key}
                            onClick={() => handleSelectType(typeEntry.key)}
                            className={`flex items-start gap-3 rounded-2xl border p-5 text-left shadow-sm transition-all ${isSelected
                                ? "border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500 dark:bg-indigo-950/20"
                                : "border-gray-100 bg-white hover:border-indigo-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-900"
                            }`}
                        >
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isSelected ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400"}`}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-800 dark:text-white">{typeEntry.label}</p>
                                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{typeEntry.description}</p>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Step 2 - Template download + file upload */}
            {selectedType && (
                <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <h3 className="text-md font-bold text-gray-800 dark:text-white mb-1.5">
                            Step 2: Download Template
                        </h3>
                        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                            Download the {activeType.label} template and fill it with your data. Worksheets
                            (Data / Sample Data / Instructions) explain every column.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={() => handleTemplateDownload("xlsx")}
                                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/15 transition hover:bg-indigo-700"
                            >
                                <FileSpreadsheet className="h-4 w-4" />
                                Excel (.xlsx)
                            </button>
                            <button
                                onClick={() => handleTemplateDownload("csv")}
                                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300 dark:hover:bg-gray-800"
                            >
                                <FileDown className="h-4 w-4" />
                                CSV (.csv)
                            </button>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <h3 className="text-md font-bold text-gray-800 dark:text-white mb-1.5">
                            Upload File
                        </h3>
                        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                            Upload your completed Excel or CSV file. It is parsed and validated
                            immediately - nothing is written to the database until you confirm.
                        </p>
                        <label
                            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center transition hover:border-indigo-400 hover:bg-indigo-50/30 dark:border-gray-800 dark:bg-gray-950 dark:hover:border-indigo-900"
                            htmlFor="import-file-input"
                        >
                            {parsing ? (
                                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                            ) : (
                                <UploadCloud className="h-6 w-6 text-gray-400" />
                            )}
                            {fileName ? (
                                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{fileName}</p>
                            ) : (
                                <>
                                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                        {parsing ? "Parsing file..." : "Click to choose a file"}
                                    </p>
                                    <p className="text-[10px] text-gray-400">.xlsx, .xls or .csv - max 10 MB</p>
                                </>
                            )}
                            <input
                                id="import-file-input"
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                className="hidden"
                                onChange={handleFileChange}
                                disabled={parsing}
                            />
                        </label>
                    </div>
                </div>
            )}

            {/* Step 3 - Preview panel */}
            {preview && !result && (
                <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                            <h3 className="text-md font-bold text-gray-800 dark:text-white">
                                Validation Preview
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                File: <span className="font-semibold">{preview.fileName}</span> - review the
                                result below. Errors are NOT imported.
                            </p>
                        </div>
                        <button
                            onClick={handleErrorReport}
                            disabled={preview.errors.length === 0}
                            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300"
                        >
                            <FileDown className="h-4 w-4" />
                            Download Error Report
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                        {statCard("Total Rows", preview.totalRows, "text-gray-800 dark:text-white")}
                        {statCard("Valid", preview.validRows, "text-emerald-600 dark:text-emerald-400")}
                        {statCard("Updates", preview.updatedRows, "text-indigo-600 dark:text-indigo-400")}
                        {statCard("Duplicates", preview.duplicateRows, "text-amber-600 dark:text-amber-400")}
                        {statCard("Invalid", preview.invalidRows, "text-rose-600 dark:text-rose-400")}
                        {statCard("Warnings", preview.warnings.length, "text-sky-600 dark:text-sky-400")}
                    </div>

                    {preview.warnings.length > 0 && (
                        <div className="mt-4 rounded-xl bg-sky-50 p-4 text-xs text-sky-800 dark:bg-sky-950/20 dark:text-sky-400">
                            <p className="mb-1 font-bold uppercase tracking-wider text-[10px]">Warnings</p>
                            {preview.warnings.map((warning, index) => (
                                <p key={index} className="mt-1">
                                    Row {warning.row} - {warning.fieldLabel || "Field"}: {warning.message}
                                </p>
                            ))}
                        </div>
                    )}

                    {preview.invalidRows === 0 ? (
                        <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            Every row is valid and ready to import.
                        </div>
                    ) : preview.errors.length > 0 && (
                        <div className="mt-4 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
                            <div className="max-h-72 overflow-y-auto">
                                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                                    <thead className="sticky top-0 bg-gray-50/50 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:bg-gray-800/20">
                                        <tr>
                                            <th className="px-4 py-3">Row</th>
                                            <th className="px-4 py-3">Field</th>
                                            <th className="px-4 py-3">Reason</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.errors.map((error, index) => (
                                            <tr key={index} className="border-t border-gray-100 text-xs dark:border-gray-800">
                                                <td className="px-4 py-3 font-bold text-gray-700 dark:text-gray-300">Row {error.row}</td>
                                                <td className="px-4 py-3">
                                                    {error.fieldLabel ? (
                                                        <span className="inline-flex items-center rounded-lg bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/20 dark:text-rose-400">
                                                            {error.fieldLabel}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{error.message}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 flex items-center justify-end gap-3">
                        <button
                            onClick={resetAll}
                            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={importing || preview.data.length === 0}
                            className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold text-white shadow-md transition disabled:cursor-not-allowed disabled:opacity-40 ${
                                confirming
                                    ? "bg-emerald-600 shadow-emerald-600/15 hover:bg-emerald-700"
                                    : "bg-indigo-600 shadow-indigo-600/15 hover:bg-indigo-700"
                            }`}
                        >
                            {importing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Importing...
                                </>
                            ) : confirming ? (
                                <>
                                    <AlertTriangle className="h-4 w-4" />
                                    Click again to confirm
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4" />
                                    Confirm Import (({preview.data.length}) rows)
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Step 4 - Result summary */}
            {result && (
                <div className="mt-6 rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm dark:border-emerald-900/40 dark:bg-gray-900">
                    <div className="mb-4 flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-md font-bold text-gray-800 dark:text-white">Import Completed</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                The imported records are now part of the totals, balances, flat and
                                resident statistics and Mahaprasad calculations. Dashboard statistics
                                were refreshed automatically.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                        {statCard("Imported", result.imported, "text-emerald-600 dark:text-emerald-400")}
                        {statCard("Extended", result.updated, "text-indigo-600 dark:text-indigo-400")}
                        {statCard("Skipped", result.skipped, "text-amber-600 dark:text-amber-400")}
                        {statCard("Failed", result.failed, "text-rose-600 dark:text-rose-400")}
                    </div>

                    {result.failedRows.length > 0 && (
                        <div className="mt-4 overflow-hidden rounded-xl border border-rose-200 dark:border-rose-900/40">
                            <div className="max-h-56 overflow-y-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-rose-50/50 text-[11px] font-bold uppercase tracking-wider text-rose-500 dark:bg-rose-950/20">
                                        <tr>
                                            <th className="px-4 py-3">Row</th>
                                            <th className="px-4 py-3">Reason</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.failedRows.map((failure, index) => (
                                            <tr key={index} className="border-t border-rose-50 dark:border-rose-900/40">
                                                <td className="px-4 py-3 font-bold text-gray-700 dark:text-gray-300">Row {failure.row}</td>
                                                <td className="px-4 py-3 text-rose-700 dark:text-rose-400">{failure.message}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 flex items-center justify-end gap-3">
                        <button
                            onClick={resetAll}
                            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-800"
                        >
                            <ArrowRight className="h-4 w-4" />
                            Import Another File
                        </button>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default BulkImport;