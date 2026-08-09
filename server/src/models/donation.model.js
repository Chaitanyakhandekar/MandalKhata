import mongoose from "mongoose";

const donationSchema = new mongoose.Schema({
    donorName: {
        type: String,
        required: true,
        trim: true
    },
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
donationSchema.index({ household: 1 });
donationSchema.index({ externalDonor: 1 });

export const Donation = mongoose.model("Donation", donationSchema);
