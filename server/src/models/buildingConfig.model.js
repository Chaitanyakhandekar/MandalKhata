import mongoose from "mongoose";

const buildingConfigSchema = new mongoose.Schema({
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
    flatRanges: [
        {
            _id: false,
            start: {
                type: Number,
                min: 1
            },
            end: {
                type: Number,
                min: 1
            }
        }
    ],
    // Legacy field: documents created before flat ranges stored only expectedFlats.
    // New documents store flatRanges; expectedFlats is kept optional and derived from ranges.
    expectedFlats: {
        type: Number,
        min: 1
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, { timestamps: true });

buildingConfigSchema.index({ createdBy: 1, building: 1, wing: 1 }, { unique: true });

buildingConfigSchema.index({ createdBy: 1, building: 1 });

export const BuildingConfig = mongoose.model("BuildingConfig", buildingConfigSchema);