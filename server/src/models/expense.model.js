import mongoose from "mongoose";

const paymentSubSchema = new mongoose.Schema({
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    paymentMethod: {
        type: String,
        enum: ["cash", "upi", "bank"],
        default: "cash",
        required: true
    },
    date: {
        type: Date,
        default: Date.now,
        required: true
    },
    note: {
        type: String,
        trim: true,
        default: ""
    },
    paidBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

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
    paidAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        default: null
    },
    vendorName: {
        type: String,
        trim: true,
        default: ""
    },
    paymentStatus: {
        type: String,
        enum: ["paid", "partially_paid", "pending"],
        default: "paid",
        required: true
    },
    payments: {
        type: [paymentSubSchema],
        default: []
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
