import mongoose from "mongoose";

const mahaprasadSchema = new mongoose.Schema({
    festivalYear: {
        type: String,
        required: true,
        trim: true
    },
    expectedAttendancePercentage: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: 80
    },
    safetyBufferPercentage: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: 10
    },
    note: {
        type: String,
        trim: true,
        default: ""
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, { timestamps: true });

mahaprasadSchema.index({ createdBy: 1, festivalYear: 1 }, { unique: true });

export const Mahaprasad = mongoose.model("Mahaprasad", mahaprasadSchema);