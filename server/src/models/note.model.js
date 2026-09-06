import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Note title is required"],
            trim: true,
        },
        content: {
            type: String,
            required: [true, "Note content is required"],
            trim: true,
        },
        reminderDate: {
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

noteSchema.index({ createdBy: 1, festivalYear: 1 });

export const Note = mongoose.model("Note", noteSchema);
