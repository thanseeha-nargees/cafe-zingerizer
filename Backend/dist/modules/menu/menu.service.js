"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMenus = exports.createMenu = void 0;
const menu_schema_1 = require("./menu.schema");
const createMenu = async (data) => {
    return await menu_schema_1.Menu.create(data);
};
exports.createMenu = createMenu;
const getMenus = async () => {
    return await menu_schema_1.Menu.find();
};
exports.getMenus = getMenus;
//# sourceMappingURL=menu.service.js.map