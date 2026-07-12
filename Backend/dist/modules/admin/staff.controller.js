"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAdminStaffController = exports.updateAdminStaffController = exports.createAdminStaffController = exports.getAdminStaffDetailsController = exports.getAdminStaffController = exports.assignTableToStaffController = exports.getAdminTableAssignmentsController = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const zod_1 = require("zod");
const password_js_1 = require("../../utils/password.js");
const user_schema_js_1 = require("../auth/user.schema.js");
const notification_service_js_1 = require("../notifications/notification.service.js");
const table_model_js_1 = require("../table/table.model.js");
const staffRoles = ["admin", "staff"];
const staffRoleValues = [...staffRoles];
const strictEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|in|org|net|edu|co)$/;
const phoneSchema = zod_1.z
    .string()
    .trim()
    .max(20, "Phone number cannot exceed 20 characters")
    .optional();
const createAdminStaffSchema = zod_1.z.object({
    userName: zod_1.z
        .string()
        .trim()
        .min(3, "Name must be at least 3 characters")
        .max(40, "Name cannot exceed 40 characters"),
    email: zod_1.z
        .string()
        .trim()
        .toLowerCase()
        .email("Invalid email format")
        .regex(strictEmailRegex, "Invalid email"),
    phoneNumber: phoneSchema,
    role: zod_1.z.enum(staffRoles).default("staff"),
    isActive: zod_1.z.boolean().default(true),
    password: zod_1.z.string().trim().min(6, "Password must be at least 6 characters"),
});
const updateAdminStaffSchema = zod_1.z.object({
    userName: zod_1.z
        .string()
        .trim()
        .min(3, "Name must be at least 3 characters")
        .max(40, "Name cannot exceed 40 characters")
        .optional(),
    email: zod_1.z
        .string()
        .trim()
        .toLowerCase()
        .email("Invalid email format")
        .regex(strictEmailRegex, "Invalid email")
        .optional(),
    phoneNumber: phoneSchema,
    role: zod_1.z.enum(staffRoles).optional(),
    isActive: zod_1.z.boolean().optional(),
    password: zod_1.z
        .string()
        .trim()
        .min(6, "Password must be at least 6 characters")
        .optional(),
});
const assignTableToStaffSchema = zod_1.z.object({
    staffId: zod_1.z
        .preprocess((value) => (value === "" ? null : value), zod_1.z.string().nullable())
        .optional(),
});
const isValidObjectId = (id) => mongoose_1.default.Types.ObjectId.isValid(id);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const getQueryString = (value) => typeof value === "string" ? value.trim() : "";
const getPositiveInt = (value, fallback, max) => {
    const parsed = typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
    if (!Number.isFinite(parsed) || parsed < 1) {
        return fallback;
    }
    return Math.min(parsed, max);
};
const buildStaffFilters = (query) => {
    const filters = {
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
const getStaffById = (id) => user_schema_js_1.User.findOne({ _id: id, role: { $in: staffRoleValues } });
const hasAnotherActiveAdmin = async (staffId) => {
    const activeAdmins = await user_schema_js_1.User.countDocuments({
        _id: { $ne: staffId },
        role: "admin",
        isActive: true,
    });
    return activeAdmins > 0;
};
const isDuplicateKeyError = (error) => typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000;
const formatAssignedStaff = (assignedStaff) => {
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
const formatTableAssignment = (table) => ({
    _id: String(table._id),
    tableNumber: table.tableNumber,
    isActive: table.isActive,
    isOccupied: table.isOccupied,
    assignedStaff: formatAssignedStaff(table.assignedStaff),
});
const getAdminTableAssignmentsController = async (_req, res) => {
    try {
        const [tables, staff] = await Promise.all([
            table_model_js_1.Table.find()
                .sort({ tableNumber: 1 })
                .populate("assignedStaff", "userName email role isActive")
                .lean(),
            user_schema_js_1.User.find({ role: "staff", isActive: true })
                .select("userName email phoneNumber role isActive")
                .sort({ userName: 1 })
                .lean(),
        ]);
        return res.status(200).json({
            success: true,
            tables: tables.map(formatTableAssignment),
            staff,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to load table assignments",
        });
    }
};
exports.getAdminTableAssignmentsController = getAdminTableAssignmentsController;
const assignTableToStaffController = async (req, res) => {
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
        const table = await table_model_js_1.Table.findById(req.params.tableId);
        if (!table) {
            return res.status(404).json({
                success: false,
                message: "Table not found",
            });
        }
        if (staffId) {
            const staff = await user_schema_js_1.User.exists({
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
        table.assignedStaff = staffId ? new mongoose_1.default.Types.ObjectId(staffId) : null;
        await table.save();
        await table.populate("assignedStaff", "userName email role isActive");
        const notificationTasks = [
            (0, notification_service_js_1.createNotificationsForRole)("admin", {
                title: staffId ? "Table assignment updated" : "Table unassigned",
                message: staffId
                    ? `Table ${table.tableNumber} was assigned to staff.`
                    : `Table ${table.tableNumber} is now unassigned.`,
                type: "STAFF_ASSIGNMENT",
                link: "/admin/staff",
                metadata: {
                    tableId: table._id.toString(),
                    tableNumber: table.tableNumber,
                    staffId,
                },
            }),
        ];
        if (staffId) {
            notificationTasks.push((0, notification_service_js_1.createNotification)({
                userId: staffId,
                role: "staff",
                title: "New table assignment",
                message: `Table ${table.tableNumber} has been assigned to you.`,
                type: "STAFF_ASSIGNMENT",
                link: "/staff/tables",
                metadata: {
                    tableId: table._id.toString(),
                    tableNumber: table.tableNumber,
                },
            }));
        }
        await Promise.all(notificationTasks);
        return res.status(200).json({
            success: true,
            table: formatTableAssignment(table),
            message: staffId ? "Table assigned" : "Table unassigned",
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to assign table",
        });
    }
};
exports.assignTableToStaffController = assignTableToStaffController;
const getAdminStaffController = async (req, res) => {
    try {
        const page = getPositiveInt(req.query.page, 1, 100000);
        const limit = getPositiveInt(req.query.limit, 10, 50);
        const filters = buildStaffFilters(req.query);
        const [filteredTotal, totalStaff, activeStaff, adminStaff, regularStaff,] = await Promise.all([
            user_schema_js_1.User.countDocuments(filters),
            user_schema_js_1.User.countDocuments({ role: { $in: staffRoleValues } }),
            user_schema_js_1.User.countDocuments({ role: { $in: staffRoleValues }, isActive: true }),
            user_schema_js_1.User.countDocuments({ role: "admin" }),
            user_schema_js_1.User.countDocuments({ role: "staff" }),
        ]);
        const totalPages = Math.max(1, Math.ceil(filteredTotal / limit));
        const currentPage = Math.min(page, totalPages);
        const staff = await user_schema_js_1.User.find(filters)
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to load staff",
        });
    }
};
exports.getAdminStaffController = getAdminStaffController;
const getAdminStaffDetailsController = async (req, res) => {
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to load staff member",
        });
    }
};
exports.getAdminStaffDetailsController = getAdminStaffDetailsController;
const createAdminStaffController = async (req, res) => {
    try {
        const validation = createAdminStaffSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                errors: validation.error.format(),
                message: "Invalid staff details",
            });
        }
        const existingUser = await user_schema_js_1.User.exists({ email: validation.data.email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "A user with this email already exists",
            });
        }
        const password = await (0, password_js_1.hashPassword)(validation.data.password);
        const staff = await user_schema_js_1.User.create({
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
        const createdStaff = await user_schema_js_1.User.findById(staff._id)
            .select("-password -refreshTokenHash -__v")
            .lean();
        return res.status(201).json({
            success: true,
            staff: createdStaff,
            message: "Staff member created",
        });
    }
    catch (error) {
        return res.status(isDuplicateKeyError(error) ? 409 : 500).json({
            success: false,
            message: isDuplicateKeyError(error)
                ? "A user with this email already exists"
                : error.message || "Failed to create staff member",
        });
    }
};
exports.createAdminStaffController = createAdminStaffController;
const updateAdminStaffController = async (req, res) => {
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
        const staff = await getStaffById(req.params.id).select("email role isActive");
        if (!staff) {
            return res.status(404).json({
                success: false,
                message: "Staff member not found",
            });
        }
        const currentUserId = req.user?._id;
        const isCurrentUser = currentUserId === req.params.id;
        const nextRole = validation.data.role || staff.role;
        const nextIsActive = validation.data.isActive === undefined
            ? staff.isActive
            : validation.data.isActive;
        if (isCurrentUser && (nextRole !== "admin" || !nextIsActive)) {
            return res.status(400).json({
                success: false,
                message: "You cannot remove your own admin access",
            });
        }
        const removesActiveAdmin = staff.role === "admin" &&
            staff.isActive &&
            (nextRole !== "admin" || !nextIsActive);
        if (removesActiveAdmin && !(await hasAnotherActiveAdmin(req.params.id))) {
            return res.status(400).json({
                success: false,
                message: "At least one active admin account is required",
            });
        }
        if (validation.data.email && validation.data.email !== staff.email) {
            const emailOwner = await user_schema_js_1.User.exists({
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
        const updatePayload = {};
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
            updatePayload.password = await (0, password_js_1.hashPassword)(validation.data.password);
        }
        const updatedStaff = await user_schema_js_1.User.findOneAndUpdate({ _id: req.params.id, role: { $in: staffRoleValues } }, { $set: updatePayload }, { returnDocument: "after", runValidators: true })
            .select("-password -refreshTokenHash -__v")
            .lean();
        if (nextRole !== "staff" || !nextIsActive) {
            await table_model_js_1.Table.updateMany({ assignedStaff: req.params.id }, { $set: { assignedStaff: null } });
        }
        return res.status(200).json({
            success: true,
            staff: updatedStaff,
            message: "Staff member updated",
        });
    }
    catch (error) {
        return res.status(isDuplicateKeyError(error) ? 409 : 500).json({
            success: false,
            message: isDuplicateKeyError(error)
                ? "A user with this email already exists"
                : error.message || "Failed to update staff member",
        });
    }
};
exports.updateAdminStaffController = updateAdminStaffController;
const deleteAdminStaffController = async (req, res) => {
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
        if (staff.role === "admin" &&
            staff.isActive &&
            !(await hasAnotherActiveAdmin(req.params.id))) {
            return res.status(400).json({
                success: false,
                message: "At least one active admin account is required",
            });
        }
        await user_schema_js_1.User.deleteOne({ _id: req.params.id, role: { $in: staffRoleValues } });
        await table_model_js_1.Table.updateMany({ assignedStaff: req.params.id }, { $set: { assignedStaff: null } });
        return res.status(200).json({
            success: true,
            message: "Staff member deleted",
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to delete staff member",
        });
    }
};
exports.deleteAdminStaffController = deleteAdminStaffController;
//# sourceMappingURL=staff.controller.js.map