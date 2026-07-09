import { Request, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { hashPassword } from "../../utils/password.js";
import { User } from "../auth/user.schema.js";
import { Table } from "../table/table.model.js";

const staffRoles = ["admin", "staff"] as const;
const staffRoleValues = [...staffRoles];

const strictEmailRegex =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|in|org|net|edu|co)$/;

const phoneSchema = z
  .string()
  .trim()
  .max(20, "Phone number cannot exceed 20 characters")
  .optional();

const createAdminStaffSchema = z.object({
  userName: z
    .string()
    .trim()
    .min(3, "Name must be at least 3 characters")
    .max(40, "Name cannot exceed 40 characters"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email format")
    .regex(strictEmailRegex, "Invalid email"),
  phoneNumber: phoneSchema,
  role: z.enum(staffRoles).default("staff"),
  isActive: z.boolean().default(true),
  password: z.string().trim().min(6, "Password must be at least 6 characters"),
});

const updateAdminStaffSchema = z.object({
  userName: z
    .string()
    .trim()
    .min(3, "Name must be at least 3 characters")
    .max(40, "Name cannot exceed 40 characters")
    .optional(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email format")
    .regex(strictEmailRegex, "Invalid email")
    .optional(),
  phoneNumber: phoneSchema,
  role: z.enum(staffRoles).optional(),
  isActive: z.boolean().optional(),
  password: z
    .string()
    .trim()
    .min(6, "Password must be at least 6 characters")
    .optional(),
});

const assignTableToStaffSchema = z.object({
  staffId: z
    .preprocess((value) => (value === "" ? null : value), z.string().nullable())
    .optional(),
});

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getQueryString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const getPositiveInt = (value: unknown, fallback: number, max: number) => {
  const parsed =
    typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, max);
};

const buildStaffFilters = (query: Request["query"]) => {
  const filters: Record<string, unknown> = {
    role: { $in: staffRoleValues },
  };
  const search = getQueryString(query.search);
  const status = getQueryString(query.status);
  const role = getQueryString(query.role);

  if (search) {
    const term = escapeRegex(search);
    filters.$or = [
      { userName: { $regex: term, $options: "i" } },
      { email: { $regex: term, $options: "i" } },
      { phoneNumber: { $regex: term, $options: "i" } },
    ];
  }

  if (status === "active") {
    filters.isActive = true;
  }

  if (status === "inactive") {
    filters.isActive = false;
  }

  if (role === "admin" || role === "staff") {
    filters.role = role;
  }

  return filters;
};

const getStaffById = (id: string) =>
  User.findOne({ _id: id, role: { $in: staffRoleValues } });

const hasAnotherActiveAdmin = async (staffId: string) => {
  const activeAdmins = await User.countDocuments({
    _id: { $ne: staffId },
    role: "admin",
    isActive: true,
  });

  return activeAdmins > 0;
};

const isDuplicateKeyError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === 11000;

const formatAssignedStaff = (assignedStaff: any) => {
  if (!assignedStaff || typeof assignedStaff !== "object" || !("_id" in assignedStaff)) {
    return null;
  }

  return {
    _id: String(assignedStaff._id),
    userName: assignedStaff.userName,
    email: assignedStaff.email,
    isActive: assignedStaff.isActive,
  };
};

const formatTableAssignment = (table: any) => ({
  _id: String(table._id),
  tableNumber: table.tableNumber,
  isActive: table.isActive,
  isOccupied: table.isOccupied,
  assignedStaff: formatAssignedStaff(table.assignedStaff),
});

export const getAdminTableAssignmentsController = async (
  _req: Request,
  res: Response
) => {
  try {
    const [tables, staff] = await Promise.all([
      Table.find()
        .sort({ tableNumber: 1 })
        .populate("assignedStaff", "userName email role isActive")
        .lean(),
      User.find({ role: "staff", isActive: true })
        .select("userName email phoneNumber role isActive")
        .sort({ userName: 1 })
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      tables: tables.map(formatTableAssignment),
      staff,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load table assignments",
    });
  }
};

export const assignTableToStaffController = async (
  req: Request<{ tableId: string }>,
  res: Response
) => {
  try {
    if (!isValidObjectId(req.params.tableId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid table id",
      });
    }

    const validation = assignTableToStaffSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        errors: validation.error.format(),
        message: "Invalid table assignment",
      });
    }

    const staffId = validation.data.staffId || null;

    if (staffId && !isValidObjectId(staffId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff id",
      });
    }

    const table = await Table.findById(req.params.tableId);

    if (!table) {
      return res.status(404).json({
        success: false,
        message: "Table not found",
      });
    }

    if (staffId) {
      const staff = await User.exists({
        _id: staffId,
        role: "staff",
        isActive: true,
      });

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: "Active staff member not found",
        });
      }
    }

    table.assignedStaff = staffId ? new mongoose.Types.ObjectId(staffId) : null;
    await table.save();
    await table.populate("assignedStaff", "userName email role isActive");

    return res.status(200).json({
      success: true,
      table: formatTableAssignment(table),
      message: staffId ? "Table assigned" : "Table unassigned",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to assign table",
    });
  }
};

export const getAdminStaffController = async (req: Request, res: Response) => {
  try {
    const page = getPositiveInt(req.query.page, 1, 100000);
    const limit = getPositiveInt(req.query.limit, 10, 50);
    const filters = buildStaffFilters(req.query);

    const [
      filteredTotal,
      totalStaff,
      activeStaff,
      adminStaff,
      regularStaff,
    ] = await Promise.all([
      User.countDocuments(filters),
      User.countDocuments({ role: { $in: staffRoleValues } }),
      User.countDocuments({ role: { $in: staffRoleValues }, isActive: true }),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ role: "staff" }),
    ]);

    const totalPages = Math.max(1, Math.ceil(filteredTotal / limit));
    const currentPage = Math.min(page, totalPages);
    const staff = await User.find(filters)
      .select("-password -refreshTokenHash -__v")
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * limit)
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      staff,
      summary: {
        totalStaff,
        activeStaff,
        inactiveStaff: totalStaff - activeStaff,
        adminStaff,
        regularStaff,
      },
      pagination: {
        page: currentPage,
        limit,
        total: filteredTotal,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load staff",
    });
  }
};

export const getAdminStaffDetailsController = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff id",
      });
    }

    const staff = await getStaffById(req.params.id)
      .select("-password -refreshTokenHash -__v")
      .lean();

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    return res.status(200).json({
      success: true,
      staff,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load staff member",
    });
  }
};

export const createAdminStaffController = async (req: Request, res: Response) => {
  try {
    const validation = createAdminStaffSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        errors: validation.error.format(),
        message: "Invalid staff details",
      });
    }

    const existingUser = await User.exists({ email: validation.data.email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    const password = await hashPassword(validation.data.password);
    const staff = await User.create({
      userName: validation.data.userName,
      email: validation.data.email,
      phoneNumber: validation.data.phoneNumber || "",
      role: validation.data.role,
      password,
      isActive: validation.data.isActive,
      isVerified: true,
      profileImage: "",
      refreshTokenHash: "",
    });
    const createdStaff = await User.findById(staff._id)
      .select("-password -refreshTokenHash -__v")
      .lean();

    return res.status(201).json({
      success: true,
      staff: createdStaff,
      message: "Staff member created",
    });
  } catch (error: any) {
    return res.status(isDuplicateKeyError(error) ? 409 : 500).json({
      success: false,
      message: isDuplicateKeyError(error)
        ? "A user with this email already exists"
        : error.message || "Failed to create staff member",
    });
  }
};

export const updateAdminStaffController = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff id",
      });
    }

    const validation = updateAdminStaffSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        errors: validation.error.format(),
        message: "Invalid staff details",
      });
    }

    if (Object.keys(validation.data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No staff changes provided",
      });
    }

    const staff = await getStaffById(req.params.id).select(
      "email role isActive"
    );

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    const currentUserId = req.user?._id;
    const isCurrentUser = currentUserId === req.params.id;
    const nextRole = validation.data.role || staff.role;
    const nextIsActive =
      validation.data.isActive === undefined
        ? staff.isActive
        : validation.data.isActive;

    if (isCurrentUser && (nextRole !== "admin" || !nextIsActive)) {
      return res.status(400).json({
        success: false,
        message: "You cannot remove your own admin access",
      });
    }

    const removesActiveAdmin =
      staff.role === "admin" &&
      staff.isActive &&
      (nextRole !== "admin" || !nextIsActive);

    if (removesActiveAdmin && !(await hasAnotherActiveAdmin(req.params.id))) {
      return res.status(400).json({
        success: false,
        message: "At least one active admin account is required",
      });
    }

    if (validation.data.email && validation.data.email !== staff.email) {
      const emailOwner = await User.exists({
        _id: { $ne: req.params.id },
        email: validation.data.email,
      });

      if (emailOwner) {
        return res.status(409).json({
          success: false,
          message: "A user with this email already exists",
        });
      }
    }

    const updatePayload: Record<string, unknown> = {};

    if (validation.data.userName !== undefined) {
      updatePayload.userName = validation.data.userName;
    }

    if (validation.data.email !== undefined) {
      updatePayload.email = validation.data.email;
    }

    if (validation.data.phoneNumber !== undefined) {
      updatePayload.phoneNumber = validation.data.phoneNumber;
    }

    if (validation.data.role !== undefined) {
      updatePayload.role = validation.data.role;
    }

    if (validation.data.isActive !== undefined) {
      updatePayload.isActive = validation.data.isActive;

      if (!validation.data.isActive) {
        updatePayload.refreshTokenHash = "";
      }
    }

    if (validation.data.password) {
      updatePayload.password = await hashPassword(validation.data.password);
    }

    const updatedStaff = await User.findOneAndUpdate(
      { _id: req.params.id, role: { $in: staffRoleValues } },
      { $set: updatePayload },
      { new: true, runValidators: true }
    )
      .select("-password -refreshTokenHash -__v")
      .lean();

    if (nextRole !== "staff" || !nextIsActive) {
      await Table.updateMany(
        { assignedStaff: req.params.id },
        { $set: { assignedStaff: null } }
      );
    }

    return res.status(200).json({
      success: true,
      staff: updatedStaff,
      message: "Staff member updated",
    });
  } catch (error: any) {
    return res.status(isDuplicateKeyError(error) ? 409 : 500).json({
      success: false,
      message: isDuplicateKeyError(error)
        ? "A user with this email already exists"
        : error.message || "Failed to update staff member",
    });
  }
};

export const deleteAdminStaffController = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff id",
      });
    }

    if (req.user?._id === req.params.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    const staff = await getStaffById(req.params.id).select("role isActive");

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    if (
      staff.role === "admin" &&
      staff.isActive &&
      !(await hasAnotherActiveAdmin(req.params.id))
    ) {
      return res.status(400).json({
        success: false,
        message: "At least one active admin account is required",
      });
    }

    await User.deleteOne({ _id: req.params.id, role: { $in: staffRoleValues } });
    await Table.updateMany(
      { assignedStaff: req.params.id },
      { $set: { assignedStaff: null } }
    );

    return res.status(200).json({
      success: true,
      message: "Staff member deleted",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete staff member",
    });
  }
};
