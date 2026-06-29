import { z } from "zod";

export const createTableSchema = z.object({
  tableNumber: z.coerce
    .number()
    .int("Table number must be a whole number")
    .positive("Table number must be greater than 0"),
});

export const setupTableSettingsSchema = z
  .object({
    rows: z.coerce
      .number()
      .int("Rows must be a whole number")
      .min(1, "At least 1 row is required")
      .max(25, "Rows cannot be greater than 25")
      .default(3),
    columns: z.coerce
      .number()
      .int("Columns must be a whole number")
      .min(1, "At least 1 column is required")
      .max(10, "Columns cannot be greater than 10")
      .default(4),
    totalTables: z.coerce
      .number()
      .int("Total tables must be a whole number")
      .min(1, "At least 1 table is required")
      .max(100, "Total tables cannot be greater than 100")
      .optional(),
  })
  .default({ rows: 3, columns: 4 })
  .transform((data) => ({
    ...data,
    totalTables: data.totalTables ?? data.rows * data.columns,
  }));

export const updateTableStatusSchema = z.object({
  isOccupied: z.boolean().optional(),
  isActive: z.boolean().optional(),
}).refine((data) => data.isOccupied !== undefined || data.isActive !== undefined, {
  message: "isOccupied or isActive is required",
});
