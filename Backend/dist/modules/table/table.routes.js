"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const table_controller_js_1 = require("./table.controller.js");
const router = (0, express_1.Router)();
router.post("/", table_controller_js_1.createTableController);
router.get("/available", table_controller_js_1.getAvailableTablesController);
router.get("/settings", table_controller_js_1.getTableSettingsController);
router.post("/settings/setup", table_controller_js_1.setupTableSettingsController);
router.get("/qrcodes", table_controller_js_1.getAllTableQrCodesController);
router.post("/qrcodes/generate", table_controller_js_1.generateAllTableQrCodesController);
router.get("/:tableId", table_controller_js_1.getTableByIdController);
router.patch("/:tableId/status", table_controller_js_1.updateTableStatusController);
router.get("/", table_controller_js_1.getAllTablesController);
exports.default = router;
//# sourceMappingURL=table.routes.js.map