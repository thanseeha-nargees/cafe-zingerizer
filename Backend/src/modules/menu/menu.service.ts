import { Menu } from "./menu.schema";

export const createMenu = async (data: any) => {
  return await Menu.create(data);
};

export const getMenus = async () => {
  return await Menu.find();
};