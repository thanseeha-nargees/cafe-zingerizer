
    import { Request, Response, NextFunction } from "express";
  import { ZodTypeAny } from "zod";

  type validateReq = "body" | "query" | "params"
  
  export const validateRequest = (schema: ZodTypeAny , type : validateReq = "body") => {
    return (
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      const result = schema.safeParse(req[type]);

      if (!result.success) {
        const errors =
          result.error.issues.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          }));
          console.log(errors)
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors,
        });
      }

      req[type] = result.data;

      next();
    };
  };