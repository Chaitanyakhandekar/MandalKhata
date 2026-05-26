import jwt from "jsonwebtoken";
import mongoose from "mongoose";

export const generateTokens = (user)=>{
    try {
        console.log("JWT_ACCESS_SECRET:", process.env.JWT_ACCESS_SECRET ? "defined" : "undefined")
        console.log("EXPIRES_IN_ACCESS_TOKEN:", process.env.EXPIRES_IN_ACCESS_TOKEN)
        
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        return { accessToken, refreshToken }
    } catch (error) {
        console.error("Token generation error:", error)
        return { accessToken: null, refreshToken: null }
    }
}
