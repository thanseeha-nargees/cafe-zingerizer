import { Table } from "./table.model.js";
import { TableSetting, TableStatus } from "./table.types.js";
import QRCode from "qrcode";

const DEFAULT_TABLE_COUNT = 12;
const DEFAULT_TABLE_COLUMNS = 4;

const getTableQrUrl = (tableId: string) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  return `${frontendUrl}/menu?table=${tableId}`;
};

const addQrToTable = async (table: any) => {
  const qrUrl = getTableQrUrl(table._id.toString());
  const qrCode = await QRCode.toDataURL(qrUrl);

  table.qrUrl = qrUrl;
  table.qrCode = qrCode;

  await table.save();

  return table;
};

const getTableLabel = (tableNumber: number) => {
  return `T-${String(tableNumber).padStart(2, "0")}`;
};

const getTableStatus = (table: any, selectedTableId?: string): TableStatus => {
  if (!table.isActive || table.isOccupied) {
    return "occupied";
  }

  if (selectedTableId && table._id.toString() === selectedTableId) {
    return "selected";
  }

  return "available";
};

const formatTableSetting = (
  table: any,
  selectedTableId?: string,
  columns = DEFAULT_TABLE_COLUMNS
): TableSetting => ({
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

const getFormattedTables = async (
  selectedTableId?: string,
  columns = DEFAULT_TABLE_COLUMNS
) => {
  const tables = await Table.find().sort({ tableNumber: 1 });

  return tables.map((table) =>
    formatTableSetting(table, selectedTableId, columns)
  );
};

const getTableRows = (tables: TableSetting[], columns = DEFAULT_TABLE_COLUMNS) => {
  return tables.reduce<TableSetting[][]>((rows, table, index) => {
    const rowIndex = Math.floor(index / columns);

    if (!rows[rowIndex]) {
      rows[rowIndex] = [];
    }

    rows[rowIndex].push(table);

    return rows;
  }, []);
};

const ensureDefaultTables = async (totalTables = DEFAULT_TABLE_COUNT) => {
  const tableNumbers = Array.from(
    { length: totalTables },
    (_, index) => index + 1
  );

  const existingTables = await Table.find({
    tableNumber: { $in: tableNumbers },
  }).select("tableNumber");

  const existingNumbers = new Set(
    existingTables.map((table) => table.tableNumber)
  );

  const missingTables = tableNumbers
    .filter((tableNumber) => !existingNumbers.has(tableNumber))
    .map((tableNumber) => ({ tableNumber }));

  if (missingTables.length > 0) {
    await Table.insertMany(missingTables);
  }
};

export const createTableService = async (
  tableNumber: number
) => {
  const table = await Table.create({
    tableNumber,
  });

  const tableWithQr = await addQrToTable(table);

  return formatTableSetting(tableWithQr);
};

export const getAllTablesService = async () => {
  return await getFormattedTables();
};

export const getAvailableTablesService = async () => {
  const tables = await Table.find({
    isActive: true,
    isOccupied: false,
  }).sort({ tableNumber: 1 });

  return tables.map((table) => formatTableSetting(table));
};

export const getTableSettingsService = async (
  selectedTableId?: string,
  columns = DEFAULT_TABLE_COLUMNS
) => {
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

export const setupTableSettingsService = async (
  totalTables = DEFAULT_TABLE_COUNT,
  columns = DEFAULT_TABLE_COLUMNS
) => {
  await ensureDefaultTables(totalTables);

  return await getTableSettingsService(undefined, columns);
};

export const updateTableStatusService = async (
  tableId: string,
  data: {
    isOccupied?: boolean;
    isActive?: boolean;
  }
) => {
  const table = await Table.findByIdAndUpdate(
    tableId,
    {
      ...(data.isOccupied !== undefined && { isOccupied: data.isOccupied }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
    { new: true, runValidators: true }
  );

  if (!table) {
    throw new Error("Table not found");
  }

  return formatTableSetting(table);
};

export const generateAllTableQrCodesService = async () => {
  const tables = await Table.find().sort({ tableNumber: 1 });

  for (const table of tables) {
    await addQrToTable(table);
  }

  return tables;
};

export const getAllTableQrCodesService = async () => {
  const tables = await Table.find().sort({ tableNumber: 1 });

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
