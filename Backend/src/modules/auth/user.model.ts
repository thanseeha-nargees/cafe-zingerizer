export interface IUser {
    userName: string;
    email: string;
    password?: string;
    role: "user" | "admin";
    phoneNumber?: string;
    profileImage: string;
    isActive: boolean;
    isVerified: boolean;
    refreshTokenHash?: string;
}

export interface AuthUser {
    userId: string;
    role: string;
}

export type userRole = "user" | "admin";

export interface AuthUserPayload {
    userId: string;
    role: userRole;
    email: string;
}
