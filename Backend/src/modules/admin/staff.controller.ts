import { Request, Response } from "express";

export const getAdminStaffController = async (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    message: "Admin staff endpoint ready",
  });
};
