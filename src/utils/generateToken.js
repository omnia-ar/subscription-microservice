import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const generateToken = (payload, expiresIn = "5h") => {
  const secretKey = process.env.NOTIFICATION_MICROSERVICE_TOKEN || "secretKey";
  return jwt.sign(payload, secretKey, { expiresIn });
};

export default generateToken;
