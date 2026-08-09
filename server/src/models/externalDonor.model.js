import mongoose from "mongoose";

const externalDonorSchema = new mongoose.Schema({
    donorName: {
        type: String,
        required: true,
        trim: true
    },
    donorType: {
        type: String,
        enum: ["Individual", "Business", "Organization", "Shop", "Well-wisher"],
        default: "Individual"
    },
    organizationName: {
        type: String,
        trim: true,
        default: ""
    },
    phone: {
        type: String,
        trim: true,
        default: ""
    },
    address: {
        type: String,
        trim: true,
        default: ""
    },
    note: {
        type: String,
        trim: true,
        default: ""
    },
    active: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, { timestamps: true });

externalDonorSchema.index({ createdBy: 1, donorName: 1 });
externalDonorSchema.index({ createdBy: 1, donorType: 1 });

export const ExternalDonor = mongoose.model("ExternalDonor", externalDonorSchema);