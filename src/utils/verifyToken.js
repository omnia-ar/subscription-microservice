import jwt from "jsonwebtoken";

import { ApiError } from "../utils/apiError.js";

import dotenv from "dotenv";

dotenv.config();

export const verifyToken = async (token) => {
  try {
    if (!token) return { error: "Token requerido" };

    const JWT_SECRET = process.env.JWT_SECRET || "secretKey";
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    console.error("Error verificando token:", error);
    throw new ApiError("Token inválido o expirado", 401);
  }
};
