import mongoose from "mongoose";

const householdSchema = new mongoose.Schema({
    building: {
        type: Number,
        required: true,
        min: 1
    },
    wing: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        maxlength: 5
    },
    flatNumber: {
        type: Number,
        required: true,
        min: 1
    },
    headOfFamily: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        trim: true,
        default: ""
    },
    memberCount: {
        type: Number,
        required: true,
        min: 1,
        default: 1
    },
    active: {
        type: Boolean,
        default: true
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

// Prevent duplicate ACTIVE households on the same building + wing + flat
householdSchema.index(
    { createdBy: 1, building: 1, wing: 1, flatNumber: 1 },
    { unique: true, partialFilterExpression: { active: true } }
);

householdSchema.index({ createdBy: 1, building: 1 });
householdSchema.index({ createdBy: 1, headOfFamily: 1 });

export const Household = mongoose.model("Household", householdSchema);