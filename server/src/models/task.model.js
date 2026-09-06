import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Task title is required"],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            default: "",
        },
        priority: {
            type: String,
            enum: ["low", "medium", "high"],
            default: "medium",
        },
        dueDate: {
            type: Date,
            default: null,
        },
        isCompleted: {
            type: Boolean,
            default: false,
        },
        completedAt: {
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

taskSchema.index({ createdBy: 1, festivalYear: 1 });
taskSchema.index({ createdBy: 1, isCompleted: 1 });

export const Task = mongoose.model("Task", taskSchema);
