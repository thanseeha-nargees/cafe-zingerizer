import { Request, Response } from "express";

export const uploadImage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      imageUrl: (req.file as Express.Multer.File).path,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};