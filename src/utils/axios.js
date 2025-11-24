import axios from "axios";

import dotenv from "dotenv";

dotenv.config();

export const axiosInstanceApiMain = axios.create({
  baseURL: process.env.API_BACK_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

export const axiosInstanceNotificationMicroservice = axios.create({
  baseURL: process.env.NOTIFICATION_MICROSERVICE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

export const axiosInstancePaymentMicroservice = axios.create({
  baseURL: process.env.PAYMENT_MICROSERVICE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});
