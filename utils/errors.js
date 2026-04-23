// utils/errors.js — Enhanced error handling

/**
 * Custom application error class
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        name: this.name,
        message: this.message,
        statusCode: this.statusCode,
        details: this.details,
        timestamp: this.timestamp,
      },
    };
  }
}

/**
 * Validation error class
 */
export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, details);
    this.name = "ValidationError";
  }
}

/**
 * Authentication error class
 */
export class AuthError extends AppError {
  constructor(message) {
    super(message, 401);
    this.name = "AuthError";
  }
}

/**
 * Authorization error class
 */
export class ForbiddenError extends AppError {
  constructor(message = "Access denied") {
    super(message, 403);
    this.name = "ForbiddenError";
  }
}

/**
 * Not found error class
 */
export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404);
    this.name = "NotFoundError";
  }
}

/**
 * Conflict error class
 */
export class ConflictError extends AppError {
  constructor(message) {
    super(message, 409);
    this.name = "ConflictError";
  }
}

/**
 * Too many requests error class
 */
export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests") {
    super(message, 429);
    this.name = "TooManyRequestsError";
  }
}

/**
 * Internal server error class
 */
export class InternalServerError extends AppError {
  constructor(message = "Internal server error", details = null) {
    super(message, 500, details);
    this.name = "InternalServerError";
  }
}

/**
 * Handle async route errors
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Express error handling middleware
 */
export function errorHandler(err, req, res, next) {
  // Default to 500 if no status code
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Log error for debugging
  if (statusCode >= 500) {
    console.error(`[ERROR] ${statusCode}: ${message}`, {
      stack: err.stack,
      details: err.details,
    });
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      ...(process.env.NODE_ENV !== "production" && { details: err.details }),
      ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    },
  });
}

/**
 * Validate request data
 */
export function validateRequest(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.validated = validated;
      next();
    } catch (error) {
      const details = error.errors?.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      next(new ValidationError("Validation failed", details));
    }
  };
}

/**
 * Check authorization
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthError("Authentication required"));
    }
    if (roles.length && !roles.includes(req.user.role)) {
      return next(new ForbiddenError("Insufficient permissions"));
    }
    next();
  };
}

export default {
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
  InternalServerError,
  asyncHandler,
  errorHandler,
  validateRequest,
  authorize,
};
