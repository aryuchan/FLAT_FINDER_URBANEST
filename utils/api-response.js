// utils/api-response.js — Standardized API response formatter

/**
 * Standard API response
 */
export class ApiResponse {
  constructor(success = true, data = null, message = null, meta = null) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.meta = meta;
    this.timestamp = new Date().toISOString();
  }

  static success(data, message = "Success", meta = null) {
    return new ApiResponse(true, data, message, meta).toJSON();
  }

  static error(message = "Error", data = null, meta = null) {
    return new ApiResponse(false, data, message, meta).toJSON();
  }

  static paginated(items, page, totalPages, totalItems, message = "Success") {
    const meta = {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: items.length,
    };
    return new ApiResponse(true, items, message, meta).toJSON();
  }

  toJSON() {
    return {
      success: this.success,
      data: this.data,
      message: this.message,
      meta: this.meta,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Response handler middleware
 */
export function responseHandler(req, res, next) {
  res.success = (data, message = "Success", statusCode = 200) => {
    return res.status(statusCode).json(ApiResponse.success(data, message));
  };

  res.error = (message = "Error", statusCode = 400, data = null) => {
    return res.status(statusCode).json(ApiResponse.error(message, data));
  };

  res.paginated = (items, page, totalPages, totalItems, statusCode = 200) => {
    return res
      .status(statusCode)
      .json(ApiResponse.paginated(items, page, totalPages, totalItems));
  };

  res.notFound = (resource = "Resource") => {
    return res.error(`${resource} not found`, 404);
  };

  res.unauthorized = (message = "Unauthorized") => {
    return res.error(message, 401);
  };

  res.forbidden = (message = "Access denied") => {
    return res.error(message, 403);
  };

  res.badRequest = (message = "Bad request", data = null) => {
    return res.error(message, 400, data);
  };

  res.conflict = (message = "Conflict") => {
    return res.error(message, 409);
  };

  res.serverError = (message = "Internal server error") => {
    return res.error(message, 500);
  };

  next();
}

export default { ApiResponse, responseHandler };
