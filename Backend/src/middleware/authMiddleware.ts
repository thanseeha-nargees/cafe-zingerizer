import { Request, Response, NextFunction } from "express"
import Jwt from "jsonwebtoken"
import { AuthUser,AuthUserPayload } from "../modules/auth/user.model"
import { User } from "../modules/auth/user.schema"
declare global {
    namespace Express {
        interface AuthenticatedUser {
            _id: string
            role: string
        }
        interface Request {
            user?: AuthenticatedUser
        }
    }
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies?.accessToken
        if (!token) {
            return res.status(401).json({ message: "Authentication required" })
        }
        const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET

        if (!secret) {
            return res.status(500).json({ success: false, message: "JWT secret is not configured" })
        }

        const decode = Jwt.verify(token, secret) as AuthUser

        const user = await User.findById(decode.userId).select("-password")

        if (!user || !user.isActive) {
            return res.status(401).json({ success: false, message: 'User no longer exists or is inactive' });
        }

        req.user = { _id: String(user._id), role: user.role }

        next()
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        })
    }
}


export const authorize = (roles: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user as AuthUserPayload | undefined

        if (!user || !roles.includes(user.role)) {
            return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
        }
        next();
    };
}