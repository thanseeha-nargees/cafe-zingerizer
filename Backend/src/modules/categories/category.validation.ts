import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(2, "Name is required"),

  slug: z.string().min(2, "Slug is required"),

  image: z.string().min(1, "Image is required"),
});
