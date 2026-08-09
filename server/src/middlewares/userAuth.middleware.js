import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import dotenv from "dotenv"

dotenv.config({ path: "./.env" })

const userAuth = async (req, res, next) => {
    try {
        const { accessToken } = req.cookies;

        if (!accessToken || accessToken.trim() === "") {
            if (req.headers["x-auth-check-type"] && req.headers["x-auth-check-type"] === "login-check-hit") {
                return res.status(200).json({ success: false, isLoggedIn: false });
            }
            return res.status(401).json({ success: false, message: "Unauthorized User" });
        }

        let decodedToken;
        try {
            decodedToken = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
        } catch (error) {
            console.log("JWT Verify Error:", error.message);
            return res.status(401).json({ success: false, message: "Invalid or expired token" });
        }

        if (!decodedToken) {
            return res.status(500).json({ success: false, message: "No Decoded Token Found" });
        }

        const user = await User.findById(decodedToken._id).select("-password -refreshToken");

        if (!user) {
            return res.status(401).json({ success: false, message: "User account no longer exists" });
        }

        req.user = user;

        next();
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export { userAuth }