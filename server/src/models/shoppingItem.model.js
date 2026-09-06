import mongoose from "mongoose";

const shoppingItemSchema = new mongoose.Schema(
    {
        itemName: {
            type: String,
            required: [true, "Item name is required"],
            trim: true,
        },
        quantity: {
            type: Number,
            required: [true, "Quantity is required"],
            min: [0.01, "Quantity must be greater than 0"],
            default: 1,
        },
        unit: {
            type: String,
            enum: [
                "kg",
                "g",
                "litre",
                "ml",
                "pieces",
                "packets",
                "boxes",
                "dozen",
                "cans",
                "bundle",
                "other",
            ],
            default: "pieces",
        },
        note: {
            type: String,
            trim: true,
            default: "",
        },
        isPurchased: {
            type: Boolean,
            default: false,
        },
        purchasedAt: {
            type: Date,
            default: null,
        },
        festivalYear: {
            type: String,
            required: [true, "Festival year is required"],
            trim: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

shoppingItemSchema.index({ createdBy: 1, festivalYear: 1 });
shoppingItemSchema.index({ createdBy: 1, isPurchased: 1 });

export const ShoppingItem = mongoose.model("ShoppingItem", shoppingItemSchema);
