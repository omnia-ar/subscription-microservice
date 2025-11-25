/**
 * Middleware de validación de requests
 * Proporciona validación y sanitización de datos de entrada
 */

import { ValidationError } from "../errors/CustomErrors.js";
import logger from "../utils/logger.js";

/**
 * Valida que los campos requeridos estén presentes en el body
 */
export const validateRequiredFields = (requiredFields) => {
  return (req, res, next) => {
    const missingFields = [];

    for (const field of requiredFields) {
      if (
        req.body[field] === undefined ||
        req.body[field] === null ||
        req.body[field] === ""
      ) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      logger.warn("Missing required fields", {
        missingFields,
        url: req.originalUrl,
        method: req.method,
      });

      return next(
        new ValidationError(
          `Campos requeridos faltantes: ${missingFields.join(", ")}`,
          missingFields[0],
          null,
          { missingFields }
        )
      );
    }

    next();
  };
};

/**
 * Valida que los parámetros de ruta estén presentes
 */
export const validateParams = (requiredParams) => {
  return (req, res, next) => {
    const missingParams = [];

    for (const param of requiredParams) {
      if (!req.params[param]) {
        missingParams.push(param);
      }
    }

    if (missingParams.length > 0) {
      logger.warn("Missing required params", {
        missingParams,
        url: req.originalUrl,
        method: req.method,
      });

      return next(
        new ValidationError(
          `Parámetros requeridos faltantes: ${missingParams.join(", ")}`,
          missingParams[0],
          null,
          { missingParams }
        )
      );
    }

    next();
  };
};

/**
 * Valida el formato de email
 */
export const validateEmail = (fieldName = "email") => {
  return (req, res, next) => {
    const email = req.body[fieldName];

    if (!email) {
      return next();
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      logger.warn("Invalid email format", {
        field: fieldName,
        url: req.originalUrl,
      });

      return next(
        new ValidationError(
          `El formato del email es inválido`,
          fieldName,
          email
        )
      );
    }

    next();
  };
};

/**
 * Sanitiza strings para prevenir inyecciones
 */
export const sanitizeStrings = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === "string") {
      // Remover caracteres peligrosos
      return obj
        .replace(/[<>]/g, "") // Remover < y >
        .trim();
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }

    if (typeof obj === "object" && obj !== null) {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitize(value);
      }
      return sanitized;
    }

    return obj;
  };

  // Sanitizar body (puede ser reasignado)
  if (req.body) {
    req.body = sanitize(req.body);
  }

  // Sanitizar query (modificar propiedades en lugar de reasignar)
  if (req.query && Object.keys(req.query).length > 0) {
    const sanitizedQuery = sanitize(req.query);
    Object.keys(req.query).forEach((key) => delete req.query[key]);
    Object.assign(req.query, sanitizedQuery);
  }

  // Sanitizar params (modificar propiedades en lugar de reasignar)
  if (req.params && Object.keys(req.params).length > 0) {
    const sanitizedParams = sanitize(req.params);
    Object.keys(req.params).forEach((key) => delete req.params[key]);
    Object.assign(req.params, sanitizedParams);
  }

  next();
};

/**
 * Valida tipos de datos
 */
export const validateTypes = (schema) => {
  return (req, res, next) => {
    const errors = [];

    for (const [field, expectedType] of Object.entries(schema)) {
      const value = req.body[field];

      if (value === undefined || value === null) {
        continue; // Skip if not present (use validateRequiredFields for required checks)
      }

      const actualType = typeof value;

      if (expectedType === "number" && actualType !== "number") {
        if (isNaN(Number(value))) {
          errors.push(`${field} debe ser un número`);
        }
      } else if (expectedType === "string" && actualType !== "string") {
        errors.push(`${field} debe ser una cadena de texto`);
      } else if (expectedType === "boolean" && actualType !== "boolean") {
        errors.push(`${field} debe ser un booleano`);
      } else if (expectedType === "array" && !Array.isArray(value)) {
        errors.push(`${field} debe ser un array`);
      } else if (
        expectedType === "object" &&
        (actualType !== "object" || Array.isArray(value))
      ) {
        errors.push(`${field} debe ser un objeto`);
      }
    }

    if (errors.length > 0) {
      logger.warn("Type validation failed", {
        errors,
        url: req.originalUrl,
      });

      return next(
        new ValidationError(
          `Errores de validación de tipos: ${errors.join(", ")}`,
          null,
          null,
          { errors }
        )
      );
    }

    next();
  };
};
