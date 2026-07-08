import { model, Schema } from "mongoose"
import { IUser } from "./user.model.js"

const userSchema = new Schema<IUser>({
    userName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index : true
    },
    password: {
        type: String,
        select: false
    },
    role: {
        type: String,
        default: 'user',
        enum: ['user', 'admin']
    },
    phoneNumber: {
        type: String,
        trim: true,
        default: ""
    },
    profileImage: {
        type: String,
        default: ""
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isVerified: {
        type: Boolean,
        default: true,
    },
    refreshTokenHash: {
        type: String,
        select: false,
        default: "",
    },
},
    {
        timestamps: true
    })

export const User = model("User", userSchema)
