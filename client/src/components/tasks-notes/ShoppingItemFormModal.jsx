import React, { useState, useEffect } from "react";
import { X, ShoppingCart, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

const UNIT_OPTIONS = [
    { value: "kg", label: "kg (Kilogram)" },
    { value: "g", label: "g (Gram)" },
    { value: "litre", label: "Litre" },
    { value: "ml", label: "ml (Millilitre)" },
    { value: "pieces", label: "Pieces (नग)" },
    { value: "packets", label: "Packets (पुडे)" },
    { value: "boxes", label: "Boxes (खोके)" },
    { value: "dozen", label: "Dozen (डझन)" },
    { value: "cans", label: "Cans (डबे)" },
    { value: "bundle", label: "Bundle (पेंढी)" },
    { value: "other", label: "Other" }
];

const PRESET_ITEMS = [
    { name: "Rice (तांदूळ)", defaultUnit: "kg", defaultQty: 10 },
    { name: "Oil (तेल)", defaultUnit: "litre", defaultQty: 5 },
    { name: "Ghee (तूप)", defaultUnit: "kg", defaultQty: 2 },
    { name: "Sugar (साखर)", defaultUnit: "kg", defaultQty: 5 },
    { name: "Flowers (फुले)", defaultUnit: "kg", defaultQty: 3 },
    { name: "Modak (मोदक)", defaultUnit: "pieces", defaultQty: 51 },
    { name: "Camphor (कापूर)", defaultUnit: "packets", defaultQty: 5 },
    { name: "Incense (अगरबत्ती)", defaultUnit: "packets", defaultQty: 4 },
    { name: "Coconut (नारळ)", defaultUnit: "pieces", defaultQty: 11 },
    { name: "Gulal & Kumkum", defaultUnit: "packets", defaultQty: 2 },
    { name: "Paper plates & bowls", defaultUnit: "packets", defaultQty: 10 },
];

const ShoppingItemFormModal = ({
    isOpen,
    onClose,
    onSubmit,
    editingItem,
    isSubmitting
}) => {
    const [itemName, setItemName] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [unit, setUnit] = useState("pieces");
    const [note, setNote] = useState("");

    useEffect(() => {
        if (editingItem) {
            setItemName(editingItem.itemName || "");
            setQuantity(editingItem.quantity || 1);
            setUnit(editingItem.unit || "pieces");
            setNote(editingItem.note || "");
        } else {
            setItemName("");
            setQuantity(1);
            setUnit("pieces");
            setNote("");
        }
    }, [editingItem, isOpen]);

    if (!isOpen) return null;

    const handleSelectPreset = (preset) => {
        setItemName(preset.name);
        setUnit(preset.defaultUnit);
        setQuantity(preset.defaultQty);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!itemName.trim()) {
            toast.error("Item name is required");
            return;
        }

        const numQty = parseFloat(quantity);
        if (isNaN(numQty) || numQty <= 0) {
            toast.error("Quantity must be greater than 0");
            return;
        }

        onSubmit({
            itemName: itemName.trim(),
            quantity: numQty,
            unit,
            note: note.trim()
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
            <div className="w-full max-w-lg my-auto rounded-2xl sm:rounded-3xl bg-white shadow-2xl dark:bg-gray-900 dark:border dark:border-gray-800 animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 p-4 sm:p-6 dark:border-gray-800">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                            <ShoppingCart className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                                {editingItem ? "Edit Shopping Item" : "Add Shopping / Grocery Item"}
                            </h3>
                            <p className="text-xs text-gray-400">
                                {editingItem
                                    ? "Update item quantity, unit, or notes"
                                    : "Quickly track grocery & supplies for festival"}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="p-4 sm:p-6 space-y-4 max-h-[72vh] overflow-y-auto">
                        {/* Quick Presets (Only when adding new item) */}
                        {!editingItem && (
                            <div>
                                <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                                    <Sparkles className="h-3 w-3 text-amber-500" />
                                    <span>Quick Suggestions (Tap to fill)</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 rounded-xl bg-gray-50/70 border border-gray-100 dark:bg-gray-950/40 dark:border-gray-800">
                                    {PRESET_ITEMS.map((preset) => (
                                        <button
                                            key={preset.name}
                                            type="button"
                                            onClick={() => handleSelectPreset(preset)}
                                            className="rounded-lg bg-white border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:border-amber-500 hover:text-amber-700 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-300 dark:hover:border-amber-500 transition-colors shrink-0"
                                        >
                                            {preset.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Item Name */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                Item Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={itemName}
                                onChange={(e) => setItemName(e.target.value)}
                                placeholder="e.g., Basmati Rice, Ghee, Agarbatti..."
                                maxLength={100}
                                autoFocus
                                required
                                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 outline-none transition-colors focus:border-amber-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
                            />
                        </div>

                        {/* Quantity and Unit in 2-column grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                    Quantity <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="0.01"
                                    step="any"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    required
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 outline-none transition-colors focus:border-amber-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                    Unit
                                </label>
                                <select
                                    value={unit}
                                    onChange={(e) => setUnit(e.target.value)}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-xs sm:text-sm text-gray-900 outline-none transition-colors focus:border-amber-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
                                >
                                    {UNIT_OPTIONS.map((u) => (
                                        <option key={u.value} value={u.value}>
                                            {u.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Note */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                Note / Brand / Vendor (Optional)
                            </label>
                            <input
                                type="text"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="e.g., Buy from Shinde Kirana store or preferred brand"
                                maxLength={150}
                                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 outline-none transition-colors focus:border-amber-500 focus:bg-white dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-2.5 border-t border-gray-100 p-4 sm:p-6 dark:border-gray-800">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center justify-center px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-xl shadow-sm transition-colors disabled:opacity-50"
                        >
                            {isSubmitting
                                ? "Saving..."
                                : editingItem
                                ? "Update Item"
                                : "Add Item"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ShoppingItemFormModal;
