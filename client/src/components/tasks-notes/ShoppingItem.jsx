import React from "react";
import { Check, Pencil, Trash2, ShoppingBag, StickyNote, Clock } from "lucide-react";

const ShoppingItem = ({ item, onToggle, onEdit, onDelete, isToggling }) => {
    return (
        <div
            className={`group relative rounded-xl sm:rounded-2xl border p-3 sm:p-3.5 transition-all duration-200 ${
                item.isPurchased
                    ? "border-gray-200/70 bg-gray-50/60 dark:border-gray-800 dark:bg-gray-900/40 opacity-75"
                    : "border-gray-100 bg-white shadow-sm hover:border-gray-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
            }`}
        >
            <div className="flex items-center gap-3">
                {/* Checkbox */}
                <button
                    type="button"
                    onClick={() => onToggle(item._id)}
                    disabled={isToggling}
                    aria-label={item.isPurchased ? "Mark as unpurchased" : "Mark as purchased"}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                        item.isPurchased
                            ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500"
                            : "border-gray-300 bg-white hover:border-emerald-500 hover:bg-emerald-50 text-transparent dark:border-gray-700 dark:bg-gray-950 dark:hover:border-emerald-500"
                    } disabled:opacity-50`}
                >
                    <Check className={`h-4 w-4 stroke-[3] transition-transform ${item.isPurchased ? "scale-100" : "scale-0 group-hover:scale-75 text-gray-300"}`} />
                </button>

                {/* Details */}
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span
                            className={`text-sm sm:text-base font-semibold text-gray-900 dark:text-white break-words ${
                                item.isPurchased ? "line-through text-gray-400 dark:text-gray-500" : ""
                            }`}
                        >
                            {item.itemName}
                        </span>

                        {/* Quantity + Unit Badge */}
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 border border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40">
                            <ShoppingBag className="h-3 w-3" />
                            {item.quantity} {item.unit}
                        </span>
                    </div>

                    {/* Note if provided */}
                    {item.note && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 break-words">
                            <StickyNote className="h-3 w-3 shrink-0 text-gray-400" />
                            <span>{item.note}</span>
                        </p>
                    )}

                    {/* Purchased timestamp */}
                    {item.isPurchased && item.purchasedAt && (
                        <p className="mt-1 flex items-center gap-1 text-[10px] text-gray-400">
                            <Clock className="h-2.5 w-2.5" />
                            Purchased on{" "}
                            {new Date(item.purchasedAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit"
                            })}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1">
                    <button
                        type="button"
                        onClick={() => onEdit(item)}
                        title="Edit item"
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(item)}
                        title="Delete item"
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShoppingItem;
