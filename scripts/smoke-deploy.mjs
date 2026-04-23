#!/usr/bin/env node

/**
 * Deployment smoke tests for Render/Railway environments.
 *
 * Default mode is read-only checks.
 * Optional auth write-flow can be enabled with RUN_MUTATION=1.
 *
 * Usage:
 *   BASE_URL=https://your-app.onrender.com node scripts/smoke-deploy.mjs
 *   BASE_URL=https://your-app.up.railway.app FRONTEND_ORIGIN=https://your-web.app node scripts/smoke-deploy.mjs
 *   RUN_MUTATION=1 BASE_URL=... node scripts/smoke-deploy.mjs
 */

const BASE_URL = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "";
const RUN_MUTATION = process.env.RUN_MUTATION === "1";

const state = {
  total: 0,
  passed: 0,
  failed: 0,
  failures: [],
};

function log(message) {
  process.stdout.write(`${message}\n`);
}

function pass(name, details = "") {
  state.total += 1;
  state.passed += 1;
  log(`PASS  ${name}${details ? ` - ${details}` : ""}`);
}

function fail(name, details = "") {
  state.total += 1;
  state.failed += 1;
  state.failures.push({ name, details });
  log(`FAIL  ${name}${details ? ` - ${details}` : ""}`);
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // non-JSON body is fine for HTML routes.
    }
    return { ok: true, url, res, text, json };
  } catch (err) {
    return { ok: false, url, error: err };
  }
}

function assertHttp(step, response, expectedStatuses) {
  if (!response.ok) {
    fail(step, `Network error at ${response.url}: ${response.error.message}`);
    return false;
  }
  if (!expectedStatuses.includes(response.res.status)) {
    fail(
      step,
      `Expected status ${expectedStatuses.join("/")}, got ${response.res.status}`,
    );
    return false;
  }
  pass(step, `HTTP ${response.res.status}`);
  return true;
}

function assertApiSuccess(step, response) {
  if (!response.ok) {
    fail(step, `Network error at ${response.url}: ${response.error.message}`);
    return false;
  }
  if (!response.json || typeof response.json.success !== "boolean") {
    fail(step, "Non-standard JSON response shape");
    return false;
  }
  if (!response.json.success) {
    fail(step, response.json.message || "API returned success=false");
    return false;
  }
  pass(step);
  return true;
}

async function runReadOnlyChecks() {
  log(`\n[1] Read-only checks against ${BASE_URL}`);

  const health = await request("/api/health");
  assertApiSuccess("Health API", health);

  const home = await request("/");
  if (assertHttp("Homepage route", home, [200])) {
    const isHtml = (home.res.headers.get("content-type") || "").includes("text/html");
    isHtml ? pass("Homepage content-type") : fail("Homepage content-type", "Expected text/html");
  }

  const tenant = await request("/tenant");
  assertHttp("Tenant route", tenant, [200]);

  const owner = await request("/owner");
  assertHttp("Owner route", owner, [200]);

  const admin = await request("/admin");
  assertHttp("Admin route", admin, [200]);

  const flats = await request("/api/flats");
  assertApiSuccess("Public flats API", flats);

  const unauthorizedMe = await request("/api/me");
  if (assertHttp("Unauthorized /api/me protection", unauthorizedMe, [401])) {
    const hasBody = Boolean(unauthorizedMe.json && unauthorizedMe.json.success === false);
    hasBody ? pass("Unauthorized body shape") : fail("Unauthorized body shape");
  }
}

async function runCorsChecks() {
  log("\n[2] CORS checks");
  if (!FRONTEND_ORIGIN) {
    pass("CORS check skipped", "Set FRONTEND_ORIGIN to enforce Access-Control-Allow-Origin validation");
    return;
  }

  const preflight = await request("/api/flats", {
    method: "OPTIONS",
    headers: {
      Origin: FRONTEND_ORIGIN,
      "Access-Control-Request-Method": "GET",
    },
  });

  if (!assertHttp("CORS preflight", preflight, [204, 200])) return;

  const allowOrigin = preflight.res.headers.get("access-control-allow-origin");
  if (allowOrigin === FRONTEND_ORIGIN || allowOrigin === "*") {
    pass("CORS origin header", allowOrigin);
  } else {
    fail("CORS origin header", `Expected ${FRONTEND_ORIGIN}, got ${allowOrigin || "(missing)"}`);
  }
}

function randomEmail() {
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 100000);
  return `smoke+${ts}${rand}@example.com`;
}

async function runMutationChecks() {
  log("\n[3] Optional mutation checks (signup/login)");
  if (!RUN_MUTATION) {
    pass("Mutation suite skipped", "Set RUN_MUTATION=1 to execute signup/login smoke flow");
    return;
  }

  const email = randomEmail();
  const password = "SmokePass123!";
  const signupBody = {
    name: "Smoke Tenant",
    email,
    password,
    role: "tenant",
  };

  const signup = await request("/api/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(signupBody),
  });
  if (!assertHttp("Signup API", signup, [201])) return;
  if (!assertApiSuccess("Signup success body", signup)) return;

  const login = await request("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!assertHttp("Login API", login, [200])) return;
  if (!assertApiSuccess("Login success body", login)) return;

  const token = login.json?.data?.token || login.json?.token;
  if (!token) {
    fail("JWT token extraction", "Token missing in login response");
    return;
  }
  pass("JWT token extraction");

  const me = await request("/api/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!assertHttp("Authenticated /api/me", me, [200])) return;
  if (!assertApiSuccess("Authenticated /api/me body", me)) return;

  const role = me.json?.data?.role;
  if (role === "tenant") {
    pass("Role assertion", role);
  } else {
    fail("Role assertion", `Expected tenant, got ${role || "(missing)"}`);
  }
}

async function main() {
  log("=== Urbanest Deployment Smoke Test ===");
  await runReadOnlyChecks();
  await runCorsChecks();
  await runMutationChecks();

  log("\n=== Result ===");
  log(`Total: ${state.total}`);
  log(`Passed: ${state.passed}`);
  log(`Failed: ${state.failed}`);

  if (state.failed > 0) {
    log("\nFailures:");
    for (const item of state.failures) {
      log(`- ${item.name}: ${item.details || "No details"}`);
    }
    process.exitCode = 1;
    return;
  }

  log("All smoke checks passed.");
}

main().catch((err) => {
  log(`Fatal error: ${err.message}`);
  process.exit(1);
});
