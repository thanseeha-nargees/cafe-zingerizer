"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllTableQrCodesController = exports.generateAllTableQrCodesController = exports.updateTableStatusController = exports.setupTableSettingsController = exports.getTableSettingsController = exports.getTableByIdController = exports.getAvailableTablesController = exports.getAllTablesController = exports.createTableController = void 0;
const table_service_js_1 = require("./table.service.js");
const table_validation_js_1 = require("./table.validation.js");
const createTableController = async (req, res) => {
    try {
        const validation = table_validation_js_1.createTableSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                error: validation.error.format(),
            });
        }
        const table = await (0, table_service_js_1.createTableService)(validation.data.tableNumber);
        return res.status(201).json({
            success: true,
            message: "Table created successfully",
            data: table,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Something went wrong",
        });
    }
};
exports.createTableController = createTableController;
const getAllTablesController = async (req, res) => {
    try {
        const tables = await (0, table_service_js_1.getAllTablesService)();
        return res.status(200).json({
            success: true,
            data: tables,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Something went wrong",
        });
    }
};
exports.getAllTablesController = getAllTablesController;
const getAvailableTablesController = async (req, res) => {
    try {
        const tables = await (0, table_service_js_1.getAvailableTablesService)();
        return res.status(200).json({
            success: true,
            data: tables,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Something went wrong",
        });
    }
};
exports.getAvailableTablesController = getAvailableTablesController;
const getTableByIdController = async (req, res) => {
    try {
        const table = await (0, table_service_js_1.getTableByIdService)(req.params.tableId);
        if (!table.isActive) {
            return res.status(403).json({
                success: false,
                message: "This table is not active",
            });
        }
        return res.status(200).json({
            success: true,
            data: table,
        });
    }
    catch (error) {
        const statusCode = error.message === "Table not found" ? 404 : 500;
        return res.status(statusCode).json({
            success: false,
            message: error.message || "Something went wrong",
        });
    }
};
exports.getTableByIdController = getTableByIdController;
const getTableSettingsController = async (req, res) => {
    try {
        const selectedTableId = typeof req.query.selectedTableId === "string"
            ? req.query.selectedTableId
            : undefined;
        const columns = typeof req.query.columns === "string"
            ? Number(req.query.columns)
            : undefined;
        const settings = await (0, table_service_js_1.getTableSettingsService)(selectedTableId, columns);
        return res.status(200).json({
            success: true,
            data: settings,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Something went wrong",
        });
    }
};
exports.getTableSettingsController = getTableSettingsController;
const setupTableSettingsController = async (req, res) => {
    try {
        const validation = table_validation_js_1.setupTableSettingsSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                error: validation.error.format(),
            });
        }
        const settings = await (0, table_service_js_1.setupTableSettingsService)(validation.data.totalTables, validation.data.columns);
        return res.status(200).json({
            success: true,
            message: "Table settings created successfully",
            data: settings,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Something went wrong",
        });
    }
};
exports.setupTableSettingsController = setupTableSettingsController;
const updateTableStatusController = async (req, res) => {
    try {
        const validation = table_validation_js_1.updateTableStatusSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                success: false,
                error: validation.error.format(),
            });
        }
        const table = await (0, table_service_js_1.updateTableStatusService)(req.params.tableId, validation.data);
        return res.status(200).json({
            success: true,
            message: "Table status updated successfully",
            data: table,
        });
    }
    catch (error) {
        const statusCode = error.message === "Table not found" ? 404 : 500;
        return res.status(statusCode).json({
            success: false,
            message: error.message || "Something went wrong",
        });
    }
};
exports.updateTableStatusController = updateTableStatusController;
const generateAllTableQrCodesController = async (req, res) => {
    try {
        const tables = await (0, table_service_js_1.generateAllTableQrCodesService)();
        return res.status(200).json({
            success: true,
            message: "QR codes generated successfully",
            data: tables,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Something went wrong",
        });
    }
};
exports.generateAllTableQrCodesController = generateAllTableQrCodesController;
const getAllTableQrCodesController = async (req, res) => {
    try {
        const tables = await (0, table_service_js_1.getAllTableQrCodesService)();
        return res.status(200).json({
            success: true,
            data: tables,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Something went wrong",
        });
    }
};
exports.getAllTableQrCodesController = getAllTableQrCodesController;
//# sourceMappingURL=table.controller.js.map