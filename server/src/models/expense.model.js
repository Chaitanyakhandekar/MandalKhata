import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    category: {
        type: String,
        enum: ["Decoration", "Sound", "Lighting", "Food", "Security", "Visarjan", "Miscellaneous"],
        required: true
    },
    vendorName: {
        type: String,
        trim: true,
        default: ""
    },
    paymentStatus: {
        type: String,
        enum: ["paid", "pending"],
        default: "paid",
        required: true
    },
    billImage: {
        type: String, // Cloudinary URL
        default: ""
    },
    billImagePublicId: {
        type: String, // Cloudinary public_id for easy deletions
        default: ""
    },
    note: {
        type: String,
        trim: true,
        default: ""
    },
    date: {
        type: Date,
        default: Date.now,
        required: true
    },
    festivalYear: {
        type: String, // Storing year string (e.g. "2025")
        required: true,
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, { timestamps: true });

export const Expense = mongoose.model("Expense", expenseSchema);
