"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = require("mongoose");
const userSchema = new mongoose_1.Schema({
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
        index: true
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
}, {
    timestamps: true
});
exports.User = (0, mongoose_1.model)("User", userSchema);
//# sourceMappingURL=user.schema.js.map