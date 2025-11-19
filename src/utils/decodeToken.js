import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const decodeToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.PAYMENTS_MICROSERVICE_TOKEN);
    return decoded;
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
};

export default decodeToken;
