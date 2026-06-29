import { api } from "../../api/axios";

export const sendOtp = async (email: string) => {
  const response = await api.post("/auth/send-otp", { email });

  return response.data;
};

export const verifyOtp = async (email: string, otp: string) => {
  const response = await api.post("/auth/verify-otp", { email, otp });

  return response.data;
};

export const getMe = async () => {
  const response = await api.get(
    "/auth/me"
  );

  return response.data;
};

export const logoutUser = async () => {
  const response = await api.post(
    "/auth/logout"
  );

  return response.data;
};
