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


app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
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

app.use("/api/users", userRouter)
app.use("/api/festivals", festivalRouter)
app.use("/api/donations", donationRouter)
app.use("/api/expenses", expenseRouter)
app.use("/api/reports", reportRouter)

// const PORT = process.env.PORT || 3000;
// httpServer.listen(PORT, () => {
//     console.log(`Server listening on port ${PORT}`);
// });

export { httpServer };

