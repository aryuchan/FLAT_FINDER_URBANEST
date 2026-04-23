// utils/index.js — Utilities index for easier imports

export * from "./helpers.js";
export * from "./errors.js";
export * from "./performance.js";
export * from "./db-helpers.js";
export * from "./api-response.js";

// Re-export commonly used items
export { default as logger } from "./logger.js";

export const utils = {
  helpers: () => import("./helpers.js"),
  errors: () => import("./errors.js"),
  performance: () => import("./performance.js"),
  dbHelpers: () => import("./db-helpers.js"),
  apiResponse: () => import("./api-response.js"),
  logger: () => import("./logger.js"),
};
