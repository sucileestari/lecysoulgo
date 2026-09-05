import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (
  error,
  _req,
  res,
  _next,
) => {
  console.error("SERVER ERROR:", error);

  res.status(500).json({
    success: false,
    message:
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan pada server",
  });
};