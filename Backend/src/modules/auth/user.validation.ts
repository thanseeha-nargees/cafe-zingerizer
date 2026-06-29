import {z} from "zod"


const strictEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|in|org|net|edu|co)$/;

export const sendOtpSchema = z.object({
    email: z.string()
        .email("Invalid email format")
        .regex(strictEmailRegex, "Invalid email")
});

export const registerSchema = z.object({
    userName: z.string().min(3, "Username must be at least 3 characters").max(20, "Username cannot exceed 20 characters"), 
    email: z.string()
        .email("Invalid email format")
        .regex(strictEmailRegex, "Email must end with a valid domain extension like .com, .in, or .org"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: z.enum(['user', 'admin']).default("user"),
    phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format").optional() 
});




export const verifyOtpSchema = z.object({
    email: z.string()
        .email("Invalid email format")
        .regex(strictEmailRegex, "Invalid email"),
    otp: z.string().regex(/^\d{6}$/, "OTP must be exactly 6 digits")
});


export const loginSchema = z.object({
    email: z.string()
        .email("Invalid email format")
        .regex(strictEmailRegex, "Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters")
});


export const forgotPasswordSchema = z.object({
    email: z.string()
        .email("Invalid email format")
        .regex(strictEmailRegex, "Invalid email")
})

export const verifyForgotOtpSchema = z.object({
    email: z.string()
        .email("Invalid email format")
        .regex(strictEmailRegex, "Invalid email"),
    otp: z.string().length(6)
})

export const resetPasswordSchema = z.object({
    email: z.string()
        .email("Invalid email format")
        .regex(strictEmailRegex, "Invalid email"),
    newPassword: z.string().min(8)
})

export type RegisterInput = z.infer<typeof registerSchema>;
export type SendOtpInput = z.infer<typeof sendOtpSchema>
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type VerifyForgotOtpInput = z.infer<typeof verifyForgotOtpSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
