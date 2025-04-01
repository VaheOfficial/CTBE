import type { Response } from "express";

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const successResponse = (res: Response, message: string, statusCode = 200, data?: any) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const errorResponse = (res: Response, message: string, statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    error: message,
  });
};

export { successResponse, errorResponse };
