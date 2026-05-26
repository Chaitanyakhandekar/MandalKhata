import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: "../.env" })
console.log("Loaded MONGODB_URI:", process.env.MONGODB_URI ? "present" : "undefined");

const connectDB = async () => {
    try {
        console.log("Connecting to MongoDB...");
        const connectionInfo = await mongoose.connect(process.env.MONGODB_URI)
        console.log(`MongoDB connected successfully: ${connectionInfo.connection.host}`);
    } catch (error) {
        console.log("MongoDB connection error: ", error.message);
    }
}

export default connectDB;