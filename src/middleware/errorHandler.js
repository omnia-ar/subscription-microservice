export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === "development"
      ? err.message
      : "Error interno del servidor";

  console.error(
    `[${req.method}] ${req.originalUrl} → ${statusCode}: ${err.message}`
  );

  res.status(statusCode).json({
    status: "error",
    message,
  });
};
