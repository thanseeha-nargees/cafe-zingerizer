import { Request, Response } from "express";
import {
  createTableService,
  getAllTablesService,
  getAvailableTablesService,
  generateAllTableQrCodesService,
  getAllTableQrCodesService,
  getTableSettingsService,
  setupTableSettingsService,
  updateTableStatusService,
} from "./table.service.js";
import {
  createTableSchema,
  setupTableSettingsSchema,
  updateTableStatusSchema,
} from "./table.validation.js";

export const createTableController = async (
  req: Request,
  res: Response
) => {
  try {
    const validation = createTableSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.format(),
      });
    }

    const table = await createTableService(
      validation.data.tableNumber
    );

    return res.status(201).json({
      success: true,
      message: "Table created successfully",
      data: table,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

export const getAllTablesController = async (
  req: Request,
  res: Response
) => {
  try {
    const tables = await getAllTablesService();

    return res.status(200).json({
      success: true,
      data: tables,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

export const getAvailableTablesController = async (
  req: Request,
  res: Response
) => {
  try {
    const tables = await getAvailableTablesService();

    return res.status(200).json({
      success: true,
      data: tables,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

export const getTableSettingsController = async (
  req: Request,
  res: Response
) => {
  try {
    const selectedTableId =
      typeof req.query.selectedTableId === "string"
        ? req.query.selectedTableId
        : undefined;
    const columns =
      typeof req.query.columns === "string"
        ? Number(req.query.columns)
        : undefined;

    const settings = await getTableSettingsService(selectedTableId, columns);

    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

export const setupTableSettingsController = async (
  req: Request,
  res: Response
) => {
  try {
    const validation = setupTableSettingsSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.format(),
      });
    }

    const settings = await setupTableSettingsService(
      validation.data.totalTables,
      validation.data.columns
    );

    return res.status(200).json({
      success: true,
      message: "Table settings created successfully",
      data: settings,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

export const updateTableStatusController = async (
  req: Request<{ tableId: string }>,
  res: Response
) => {
  try {
    const validation = updateTableStatusSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.format(),
      });
    }

    const table = await updateTableStatusService(
      req.params.tableId,
      validation.data
    );

    return res.status(200).json({
      success: true,
      message: "Table status updated successfully",
      data: table,
    });
  } catch (error: any) {
    const statusCode = error.message === "Table not found" ? 404 : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

export const generateAllTableQrCodesController = async (
  req: Request,
  res: Response
) => {
  try {
    const tables = await generateAllTableQrCodesService();

    return res.status(200).json({
      success: true,
      message: "QR codes generated successfully",
      data: tables,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

export const getAllTableQrCodesController = async (
  req: Request,
  res: Response
) => {
  try {
    const tables = await getAllTableQrCodesService();

    return res.status(200).json({
      success: true,
      data: tables,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};
