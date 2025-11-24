// utils/ApiError.ts
export class ApiError extends Error {
  statusCode
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}
