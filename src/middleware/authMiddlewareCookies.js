import { ApiError } from "../utils/apiError.js";
import { verifyToken } from "../utils/verifyToken.js";

//* Extrae el token desde la cookie "access_token"
export const extractTokenFromCookie = (req, res, next) => {
  const token = req.cookies.access_token;
  return token || null;
};

export const verifyTokenFromCookie = async (req, res, next) => {
  const token = extractTokenFromCookie(req, res, next);

  if (!token) {
    return next(new ApiError("No se encontro el token", 401));
  }

  try {
    const payload = await verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      (error.message && error.message.includes("expired"))
    ) {
      return next(new ApiError("Token expirado", 401));
    }
    return next(error);
  }
};
