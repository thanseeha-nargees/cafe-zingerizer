import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { api } from "../../api/axios";

export type AuthRole = "user" | "admin" | "staff";

export type CurrentUser = {
  id: string;
  userName: string;
  email: string;
  role: AuthRole;
};

type AuthStatus = "idle" | "checking" | "authenticated" | "unauthenticated";

type AuthState = {
  currentUser: CurrentUser | null;
  status: AuthStatus;
  error: string;
};

type MeResponse = {
  user: CurrentUser;
};

const initialState: AuthState = {
  currentUser: null,
  status: "idle",
  error: "",
};

const getApiMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }

  return fallback;
};

export const hydrateAuth = createAsyncThunk<
  CurrentUser,
  void,
  { rejectValue: string }
>("auth/hydrateAuth", async (_, { rejectWithValue }) => {
  try {
    const response = await api.get<MeResponse>("/auth/me");

    return response.data.user;
  } catch (error) {
    return rejectWithValue(getApiMessage(error, "Authentication required"));
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCurrentUser(state, action: PayloadAction<CurrentUser>) {
      state.currentUser = action.payload;
      state.status = "authenticated";
      state.error = "";
    },
    clearCurrentUser(state) {
      state.currentUser = null;
      state.status = "unauthenticated";
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(hydrateAuth.pending, (state) => {
        state.status = "checking";
        state.error = "";
      })
      .addCase(hydrateAuth.fulfilled, (state, action) => {
        state.currentUser = action.payload;
        state.status = "authenticated";
        state.error = "";
      })
      .addCase(hydrateAuth.rejected, (state, action) => {
        state.currentUser = null;
        state.status = "unauthenticated";
        state.error = action.payload || "Authentication required";
      });
  },
});

export const { clearCurrentUser, setCurrentUser } = authSlice.actions;

export default authSlice.reducer;
