import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { api } from "../../api/axios";

export type StaffRole = "admin" | "staff";
export type StaffStatusFilter = "all" | "active" | "inactive";
export type StaffRoleFilter = "all" | StaffRole;

export type StaffMember = {
  _id: string;
  userName: string;
  email: string;
  phoneNumber?: string;
  role: StaffRole;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type StaffFormPayload = {
  userName: string;
  email: string;
  phoneNumber?: string;
  role: StaffRole;
  isActive: boolean;
  password?: string;
};

export type StaffSummary = {
  totalStaff: number;
  activeStaff: number;
  inactiveStaff: number;
  adminStaff: number;
  regularStaff: number;
};

export type StaffPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type StaffListParams = {
  search: string;
  status: StaffStatusFilter;
  role: StaffRoleFilter;
  page: number;
  limit: number;
};

type StaffListResponse = {
  staff: StaffMember[];
  summary: StaffSummary;
  pagination: StaffPagination;
};

type StaffState = {
  items: StaffMember[];
  summary: StaffSummary;
  pagination: StaffPagination;
  search: string;
  status: StaffStatusFilter;
  role: StaffRoleFilter;
  page: number;
  limit: number;
  loading: boolean;
  saving: boolean;
  savingId: string;
  deletingId: string;
  error: string;
  notice: string;
};

const emptySummary: StaffSummary = {
  totalStaff: 0,
  activeStaff: 0,
  inactiveStaff: 0,
  adminStaff: 0,
  regularStaff: 0,
};

const emptyPagination: StaffPagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
};

const initialState: StaffState = {
  items: [],
  summary: emptySummary,
  pagination: emptyPagination,
  search: "",
  status: "all",
  role: "all",
  page: 1,
  limit: 10,
  loading: false,
  saving: false,
  savingId: "",
  deletingId: "",
  error: "",
  notice: "",
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

export const fetchStaff = createAsyncThunk<
  StaffListResponse,
  StaffListParams,
  { rejectValue: string }
>("staff/fetchStaff", async (params, { rejectWithValue }) => {
  try {
    const response = await api.get<StaffListResponse>("/admin/staff", {
      params,
    });

    return {
      staff: response.data.staff || [],
      summary: response.data.summary || emptySummary,
      pagination: response.data.pagination || emptyPagination,
    };
  } catch (error) {
    return rejectWithValue(getApiMessage(error, "Failed to load staff"));
  }
});

export const createStaff = createAsyncThunk<
  StaffMember,
  StaffFormPayload,
  { rejectValue: string }
>("staff/createStaff", async (payload, { rejectWithValue }) => {
  try {
    const response = await api.post<{ staff: StaffMember }>(
      "/admin/staff",
      payload
    );

    return response.data.staff;
  } catch (error) {
    return rejectWithValue(getApiMessage(error, "Unable to add staff member"));
  }
});

export const updateStaff = createAsyncThunk<
  StaffMember,
  { id: string; changes: Partial<StaffFormPayload> },
  { rejectValue: string }
>("staff/updateStaff", async ({ id, changes }, { rejectWithValue }) => {
  try {
    const response = await api.patch<{ staff: StaffMember }>(
      `/admin/staff/${id}`,
      changes
    );

    return response.data.staff;
  } catch (error) {
    return rejectWithValue(getApiMessage(error, "Unable to update staff"));
  }
});

export const deleteStaff = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>("staff/deleteStaff", async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/admin/staff/${id}`);
    return id;
  } catch (error) {
    return rejectWithValue(getApiMessage(error, "Unable to delete staff"));
  }
});

const staffSlice = createSlice({
  name: "staff",
  initialState,
  reducers: {
    setSearch(state, action: PayloadAction<string>) {
      state.search = action.payload;
      state.page = 1;
    },
    setStatusFilter(state, action: PayloadAction<StaffStatusFilter>) {
      state.status = action.payload;
      state.page = 1;
    },
    setRoleFilter(state, action: PayloadAction<StaffRoleFilter>) {
      state.role = action.payload;
      state.page = 1;
    },
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
    setLimit(state, action: PayloadAction<number>) {
      state.limit = action.payload;
      state.page = 1;
    },
    clearStaffFeedback(state) {
      state.error = "";
      state.notice = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStaff.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(fetchStaff.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.staff;
        state.summary = action.payload.summary;
        state.pagination = action.payload.pagination;
        state.page = action.payload.pagination.page;
        state.limit = action.payload.pagination.limit;
      })
      .addCase(fetchStaff.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load staff";
      })
      .addCase(createStaff.pending, (state) => {
        state.saving = true;
        state.savingId = "";
        state.error = "";
        state.notice = "";
      })
      .addCase(createStaff.fulfilled, (state) => {
        state.saving = false;
        state.notice = "Staff member added.";
      })
      .addCase(createStaff.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || "Unable to add staff member";
      })
      .addCase(updateStaff.pending, (state, action) => {
        state.saving = true;
        state.savingId = action.meta.arg.id;
        state.error = "";
        state.notice = "";
      })
      .addCase(updateStaff.fulfilled, (state, action) => {
        state.saving = false;
        state.savingId = "";
        state.items = state.items.map((staff) =>
          staff._id === action.payload._id ? action.payload : staff
        );
        state.notice = "Staff member updated.";
      })
      .addCase(updateStaff.rejected, (state, action) => {
        state.saving = false;
        state.savingId = "";
        state.error = action.payload || "Unable to update staff";
      })
      .addCase(deleteStaff.pending, (state, action) => {
        state.deletingId = action.meta.arg;
        state.error = "";
        state.notice = "";
      })
      .addCase(deleteStaff.fulfilled, (state, action) => {
        state.deletingId = "";
        state.items = state.items.filter((staff) => staff._id !== action.payload);
        state.notice = "Staff member deleted.";
      })
      .addCase(deleteStaff.rejected, (state, action) => {
        state.deletingId = "";
        state.error = action.payload || "Unable to delete staff";
      });
  },
});

export const {
  clearStaffFeedback,
  setLimit,
  setPage,
  setRoleFilter,
  setSearch,
  setStatusFilter,
} = staffSlice.actions;

export default staffSlice.reducer;
