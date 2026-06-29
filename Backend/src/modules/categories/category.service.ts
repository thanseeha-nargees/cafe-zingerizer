import { Category } from "./category.schema.js";

export const createCategory = async (data: {
  name: string;
  slug: string;
  image: string;
}) => {
  return await Category.create(data);
};

export const getAllCategories = async () => {
  return await Category.find().sort({ createdAt: -1 });
};

export const getCategoryById = async (id: string) => {
  return await Category.findById(id);
};

export const deleteCategory = async (id: string) => {
  return await Category.findByIdAndDelete(id);
};