import mongoose from "mongoose";

const festivalYearSchema = new mongoose.Schema({
    year: {
        type: String,
        required: true,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, { timestamps: true });

festivalYearSchema.index({ year: 1, createdBy: 1 }, { unique: true });

export const FestivalYear = mongoose.model("FestivalYear", festivalYearSchema);
