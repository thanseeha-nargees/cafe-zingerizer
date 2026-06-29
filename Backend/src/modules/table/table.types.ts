import { Document } from "mongoose";

export type TableStatus = "selected" | "available" | "occupied";

export interface ITable extends Document {
  tableNumber: number;
  qrCode: string;
  qrUrl: string;
  isActive: boolean;
  isOccupied: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export interface TableSetting {
  _id: string;
  tableNumber: number;
  label: string;
  tableNo: string;
  tableName: string;
  row: number;
  column: number;
  status: TableStatus;
  isActive: boolean;
  isOccupied: boolean;
  qrUrl: string;
  qrCode: string;
}
