// utils/db-helpers.js — Enhanced database utilities and query builders

import { Cache } from "./performance.js";

/**
 * Query builder for safer SQL construction
 */
export class QueryBuilder {
  constructor() {
    this.conditions = [];
    this.params = [];
    this.orders = [];
    this.limit_ = null;
    this.offset_ = null;
  }

  where(column, operator, value) {
    if (value === undefined) {
      // Two argument form: where('column', value)
      this.conditions.push(`${column} = ?`);
      this.params.push(operator);
    } else {
      // Three argument form: where('column', '=', value)
      this.conditions.push(`${column} ${operator} ?`);
      this.params.push(value);
    }
    return this;
  }

  andWhere(column, operator, value) {
    return this.where(column, operator, value);
  }

  orWhere(column, operator, value) {
    if (value === undefined) {
      this.conditions.push(`OR ${column} = ?`);
      this.params.push(operator);
    } else {
      this.conditions.push(`OR ${column} ${operator} ?`);
      this.params.push(value);
    }
    return this;
  }

  orderBy(column, direction = "ASC") {
    this.orders.push(`${column} ${direction.toUpperCase()}`);
    return this;
  }

  limit(count) {
    this.limit_ = count;
    return this;
  }

  offset(count) {
    this.offset_ = count;
    return this;
  }

  buildWhere() {
    if (this.conditions.length === 0) return "";
    return "WHERE " + this.conditions.join(" AND ");
  }

  buildOrderBy() {
    if (this.orders.length === 0) return "";
    return "ORDER BY " + this.orders.join(", ");
  }

  buildLimit() {
    if (!this.limit_) return "";
    let sql = `LIMIT ${this.limit_}`;
    if (this.offset_) sql += ` OFFSET ${this.offset_}`;
    return sql;
  }

  getParams() {
    return this.params;
  }
}

/**
 * Query cache with TTL
 */
export class QueryCache {
  constructor(ttl = 3600000) {
    this.cache = new Cache(ttl);
  }

  getKey(sql, params) {
    return `${sql}:${JSON.stringify(params)}`;
  }

  get(sql, params) {
    return this.cache.get(this.getKey(sql, params));
  }

  set(sql, params, value) {
    return this.cache.set(this.getKey(sql, params), value);
  }

  has(sql, params) {
    return this.cache.has(this.getKey(sql, params));
  }

  invalidate(pattern) {
    for (const [key] of this.cache.entries()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }
}

/**
 * Transaction helper
 */
export class Transaction {
  constructor(pool) {
    this.pool = pool;
    this.connection = null;
    this.isActive = false;
  }

  async begin() {
    this.connection = await this.pool.getConnection();
    await this.connection.beginTransaction();
    this.isActive = true;
    return this;
  }

  async query(sql, params = []) {
    if (!this.connection) throw new Error("Transaction not started");
    const [results] = await this.connection.execute(sql, params);
    return results;
  }

  async queryOne(sql, params = []) {
    const results = await this.query(sql, params);
    return results[0] || null;
  }

  async commit() {
    if (!this.connection) throw new Error("Transaction not started");
    await this.connection.commit();
    this.isActive = false;
    this.connection.release();
  }

  async rollback() {
    if (!this.connection) throw new Error("Transaction not started");
    await this.connection.rollback();
    this.isActive = false;
    this.connection.release();
  }

  async end() {
    if (this.isActive) {
      await this.rollback();
    } else if (this.connection) {
      this.connection.release();
    }
  }
}

/**
 * Data mapper for model conversions
 */
export class DataMapper {
  constructor(mapping = {}) {
    this.mapping = mapping;
  }

  mapFromDB(dbRecord) {
    if (!dbRecord) return null;
    const result = {};
    for (const [key, value] of Object.entries(dbRecord)) {
      const mappedKey = this.mapping[key] || key;
      result[mappedKey] = value;
    }
    return result;
  }

  mapToDB(obj) {
    if (!obj) return null;
    const result = {};
    const reverseMapping = Object.entries(this.mapping).reduce(
      (acc, [dbKey, appKey]) => {
        acc[appKey] = dbKey;
        return acc;
      },
      {},
    );

    for (const [key, value] of Object.entries(obj)) {
      const dbKey = reverseMapping[key] || key;
      result[dbKey] = value;
    }
    return result;
  }

  mapListFromDB(dbRecords) {
    return dbRecords.map((record) => this.mapFromDB(record));
  }

  mapListToDB(objects) {
    return objects.map((obj) => this.mapToDB(obj));
  }
}

/**
 * Pagination helper
 */
export class Paginator {
  constructor(totalItems, itemsPerPage = 20, currentPage = 1) {
    this.totalItems = totalItems;
    this.itemsPerPage = itemsPerPage;
    this.currentPage = Math.max(1, currentPage);
  }

  getTotalPages() {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  getOffset() {
    return (this.currentPage - 1) * this.itemsPerPage;
  }

  getLimit() {
    return this.itemsPerPage;
  }

  hasNextPage() {
    return this.currentPage < this.getTotalPages();
  }

  hasPreviousPage() {
    return this.currentPage > 1;
  }

  getNextPage() {
    return this.hasNextPage() ? this.currentPage + 1 : null;
  }

  getPreviousPage() {
    return this.hasPreviousPage() ? this.currentPage - 1 : null;
  }

  toJSON() {
    return {
      currentPage: this.currentPage,
      totalPages: this.getTotalPages(),
      totalItems: this.totalItems,
      itemsPerPage: this.itemsPerPage,
      hasNextPage: this.hasNextPage(),
      hasPreviousPage: this.hasPreviousPage(),
      nextPage: this.getNextPage(),
      previousPage: this.getPreviousPage(),
    };
  }
}

/**
 * Batch query executor
 */
export class BatchQueryExecutor {
  constructor(pool, batchSize = 100) {
    this.pool = pool;
    this.batchSize = batchSize;
    this.queue = [];
  }

  add(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.queue.push({ sql, params, resolve, reject });
      if (this.queue.length >= this.batchSize) {
        this.flush();
      }
    });
  }

  async flush() {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.batchSize);
    const results = await Promise.allSettled(
      batch.map(({ sql, params }) => this.pool.execute(sql, params)),
    );

    batch.forEach((item, idx) => {
      const result = results[idx];
      if (result.status === "fulfilled") {
        item.resolve(result.value[0]);
      } else {
        item.reject(result.reason);
      }
    });
  }

  async drain() {
    while (this.queue.length > 0) {
      await this.flush();
    }
  }
}

export default {
  QueryBuilder,
  QueryCache,
  Transaction,
  DataMapper,
  Paginator,
  BatchQueryExecutor,
};
