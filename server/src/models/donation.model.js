import mongoose from "mongoose";

const donationPaymentSubSchema = new mongoose.Schema({
    amount: {
        type: Number,
        required: true,
        min: [0.01, "Payment amount must be greater than 0"]
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
    receivedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const donationSchema = new mongoose.Schema({
    donorName: {
        type: String,
        required: true,
        trim: true
    },
    // amount represents the Pledged / Receipt Amount committed by donor
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    // Total actually collected so far across all payments
    collectedAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    // Remaining pending amount: amount - collectedAmount
    pendingAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    // Derived collection status: "not_collected" | "partially_collected" | "paid"
    collectionStatus: {
        type: String,
        enum: ["not_collected", "partially_collected", "paid"],
        default: "paid",
        required: true
    },
    // Primary/fallback payment method (maintained for backward compatibility)
    paymentMethod: {
        type: String,
        enum: ["cash", "upi", "bank"],
        default: "cash",
        required: true
    },
    // Multiple payment records for this donation
    payments: {
        type: [donationPaymentSubSchema],
        default: []
    },
    phone: {
        type: String,
        trim: true
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
    donorType: {
        type: String,
        enum: ["resident", "external"],
        trim: true
    },
    household: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Household",
        default: null
    },
    externalDonor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ExternalDonor",
        default: null
    },
    receiptNumber: {
        type: String,
        required: true,
        unique: true
    },
    festivalYear: {
        type: String, // Storing year string (e.g. "2025") for query performance and robustness
        required: true,
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, { timestamps: true });

donationSchema.index({ createdBy: 1, festivalYear: 1, donorType: 1 });
donationSchema.index({ createdBy: 1, festivalYear: 1, collectionStatus: 1 });
donationSchema.index({ household: 1 });
donationSchema.index({ externalDonor: 1 });
donationSchema.index({ "payments.paymentMethod": 1 });

export const Donation = mongoose.model("Donation", donationSchema);
