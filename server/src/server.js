import cookieParser from 'cookie-parser';
import express from 'express';
import { createServer } from "http"
import { Server } from "socket.io"
import cors from 'cors';
import dotenv from "dotenv";

dotenv.config({ path: "./.env" })


const app = express();  // Create an Express application

const httpServer = createServer(app)   // Create an HTTP server

// Initialize Socket.IO with the server


const allowedOrigins = [
    process.env.CLIENT_URL,
    "http://localhost:5173",
    "https://mandal-khata-opacurps4-chaitanyakhandekars-projects.vercel.app",
    "https://mandal-khata.vercel.app"
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true
}))
app.use(express.json({
    limit: "16kb"
}))
app.use(cookieParser())
app.use(express.urlencoded({
    extended: true,
    limit: "16kb"
}))
app.use(express.static("public"))


import userRouter from "./routes/user.route.js"
import festivalRouter from "./routes/festival.route.js"
import donationRouter from "./routes/donation.route.js"
import expenseRouter from "./routes/expense.route.js"
import reportRouter from "./routes/report.route.js"
import householdRouter from "./routes/household.route.js"
import buildingConfigRouter from "./routes/buildingConfig.route.js"
import externalDonorRouter from "./routes/externalDonor.route.js"
import mahaprasadRouter from "./routes/mahaprasad.route.js"

app.use("/api/users", userRouter)
app.use("/api/festivals", festivalRouter)
app.use("/api/donations", donationRouter)
app.use("/api/expenses", expenseRouter)
app.use("/api/reports", reportRouter)
app.use("/api/households", householdRouter)
app.use("/api/building-configs", buildingConfigRouter)
app.use("/api/donors", externalDonorRouter)
app.use("/api/mahaprasad", mahaprasadRouter)

// Global 404 and error handlers
app.use((req, res) => {
    res.status(404).json({ success: false, message: "Route not found" });
});

app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || "Something went wrong"
    });
});

// const PORT = process.env.PORT || 3000;
// httpServer.listen(PORT, () => {
//     console.log(`Server listening on port ${PORT}`);
// });

export { httpServer };

