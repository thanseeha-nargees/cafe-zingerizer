"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllTableQrCodesService = exports.generateAllTableQrCodesService = exports.updateTableStatusService = exports.setupTableSettingsService = exports.getTableSettingsService = exports.getAvailableTablesService = exports.getAllTablesService = exports.createTableService = void 0;
const table_model_js_1 = require("./table.model.js");
const qrcode_1 = __importDefault(require("qrcode"));
const DEFAULT_TABLE_COUNT = 12;
const DEFAULT_TABLE_COLUMNS = 4;
const getTableQrUrl = (tableId) => {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    return `${frontendUrl}/menu?table=${tableId}`;
};
const addQrToTable = async (table) => {
    const qrUrl = getTableQrUrl(table._id.toString());
    const qrCode = await qrcode_1.default.toDataURL(qrUrl);
    table.qrUrl = qrUrl;
    table.qrCode = qrCode;
    await table.save();
    return table;
};
const getTableLabel = (tableNumber) => {
    return `T-${String(tableNumber).padStart(2, "0")}`;
};
const getTableStatus = (table, selectedTableId) => {
    if (!table.isActive || table.isOccupied) {
        return "occupied";
    }
    if (selectedTableId && table._id.toString() === selectedTableId) {
        return "selected";
    }
    return "available";
};
const formatTableSetting = (table, selectedTableId, columns = DEFAULT_TABLE_COLUMNS) => ({
    _id: table._id.toString(),
    tableNumber: table.tableNumber,
    label: getTableLabel(table.tableNumber),
    tableNo: getTableLabel(table.tableNumber),
    tableName: getTableLabel(table.tableNumber),
    row: Math.ceil(table.tableNumber / columns),
    column: ((table.tableNumber - 1) % columns) + 1,
    status: getTableStatus(table, selectedTableId),
    isActive: table.isActive,
    isOccupied: table.isOccupied,
    qrUrl: table.qrUrl,
    qrCode: table.qrCode,
});
const getFormattedTables = async (selectedTableId, columns = DEFAULT_TABLE_COLUMNS) => {
    const tables = await table_model_js_1.Table.find().sort({ tableNumber: 1 });
    return tables.map((table) => formatTableSetting(table, selectedTableId, columns));
};
const getTableRows = (tables, columns = DEFAULT_TABLE_COLUMNS) => {
    return tables.reduce((rows, table, index) => {
        const rowIndex = Math.floor(index / columns);
        if (!rows[rowIndex]) {
            rows[rowIndex] = [];
        }
        rows[rowIndex].push(table);
        return rows;
    }, []);
};
const ensureDefaultTables = async (totalTables = DEFAULT_TABLE_COUNT) => {
    const tableNumbers = Array.from({ length: totalTables }, (_, index) => index + 1);
    const existingTables = await table_model_js_1.Table.find({
        tableNumber: { $in: tableNumbers },
    }).select("tableNumber");
    const existingNumbers = new Set(existingTables.map((table) => table.tableNumber));
    const missingTables = tableNumbers
        .filter((tableNumber) => !existingNumbers.has(tableNumber))
        .map((tableNumber) => ({ tableNumber }));
    if (missingTables.length > 0) {
        await table_model_js_1.Table.insertMany(missingTables);
    }
};
const createTableService = async (tableNumber) => {
    const table = await table_model_js_1.Table.create({
        tableNumber,
    });
    const tableWithQr = await addQrToTable(table);
    return formatTableSetting(tableWithQr);
};
exports.createTableService = createTableService;
const getAllTablesService = async () => {
    return await getFormattedTables();
};
exports.getAllTablesService = getAllTablesService;
const getAvailableTablesService = async () => {
    const tables = await table_model_js_1.Table.find({
        isActive: true,
        isOccupied: false,
    }).sort({ tableNumber: 1 });
    return tables.map((table) => formatTableSetting(table));
};
exports.getAvailableTablesService = getAvailableTablesService;
const getTableSettingsService = async (selectedTableId, columns = DEFAULT_TABLE_COLUMNS) => {
    const tables = await getFormattedTables(selectedTableId, columns);
    const tableRows = getTableRows(tables, columns);
    return {
        serviceTypes: ["Dining", "Takeaway"],
        legend: ["selected", "available", "occupied"],
        rows: tableRows.length,
        columns,
        totalTables: tables.length,
        tables,
        tableRows,
    };
};
exports.getTableSettingsService = getTableSettingsService;
const setupTableSettingsService = async (totalTables = DEFAULT_TABLE_COUNT, columns = DEFAULT_TABLE_COLUMNS) => {
    await ensureDefaultTables(totalTables);
    return await (0, exports.getTableSettingsService)(undefined, columns);
};
exports.setupTableSettingsService = setupTableSettingsService;
const updateTableStatusService = async (tableId, data) => {
    const table = await table_model_js_1.Table.findByIdAndUpdate(tableId, {
        ...(data.isOccupied !== undefined && { isOccupied: data.isOccupied }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
    }, { new: true, runValidators: true });
    if (!table) {
        throw new Error("Table not found");
    }
    return formatTableSetting(table);
};
exports.updateTableStatusService = updateTableStatusService;
const generateAllTableQrCodesService = async () => {
    const tables = await table_model_js_1.Table.find().sort({ tableNumber: 1 });
    for (const table of tables) {
        await addQrToTable(table);
    }
    return tables;
};
exports.generateAllTableQrCodesService = generateAllTableQrCodesService;
const getAllTableQrCodesService = async () => {
    const tables = await table_model_js_1.Table.find().sort({ tableNumber: 1 });
    for (const table of tables) {
        if (!table.qrCode || !table.qrUrl) {
            await addQrToTable(table);
        }
    }
    return tables.map((table) => ({
        _id: table._id,
        tableNumber: table.tableNumber,
        qrUrl: table.qrUrl,
        qrCode: table.qrCode,
        isActive: table.isActive,
        isOccupied: table.isOccupied,
    }));
};
exports.getAllTableQrCodesService = getAllTableQrCodesService;
//# sourceMappingURL=table.service.js.map