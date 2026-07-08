import { z } from "zod";

const optionalBooleanFromFormData = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "string") {
    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }
  }

  return value;
}, z.boolean().optional());

export const createMenuSchema = z.object({
  name: z.string().min(2, "Name is required"),

  description: z.string().optional(),

  price: z.coerce.number().min(1, "Price must be greater than 0"),

  category: z.string().min(1, "Category is required"),

  image: z.string().optional(),

  isAvailable: optionalBooleanFromFormData,
});

export const updateMenuSchema = createMenuSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  "At least one product field is required"
);
