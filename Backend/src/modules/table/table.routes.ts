import { Router } from "express";
import {
  createTableController,
  generateAllTableQrCodesController,
  getAllTablesController,
  getAllTableQrCodesController,
  getAvailableTablesController,
  getTableByIdController,
  getTableSettingsController,
  setupTableSettingsController,
  updateTableStatusController,
} from "./table.controller.js";

const router = Router();

router.post("/", createTableController);

router.get("/available", getAvailableTablesController);
router.get("/settings", getTableSettingsController);
router.post("/settings/setup", setupTableSettingsController);
router.get("/qrcodes", getAllTableQrCodesController);
router.post("/qrcodes/generate", generateAllTableQrCodesController);
router.get("/:tableId", getTableByIdController);
router.patch("/:tableId/status", updateTableStatusController);

router.get("/", getAllTablesController);

export default router;
