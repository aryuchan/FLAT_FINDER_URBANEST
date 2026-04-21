// utils/validators.js — Hardened Plain Validators (Zero Dependencies)
// Fixes: Bug #2 — Missing utility crash

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const signupSchema = {
  parse: (d) => {
    if (!d.name || d.name.length < 2) throw new Error("Name must be at least 2 characters");
    if (!d.email || !emailRegex.test(d.email)) throw new Error("Invalid email format");
    if (!d.password || d.password.length < 8) throw new Error("Password must be at least 8 characters");
    if (!['tenant', 'owner'].includes(d.role)) throw new Error("Invalid role selected");
    return d;
  }
};

export const loginSchema = {
  parse: (d) => {
    if (!d.email || !d.password) throw new Error("Email and password are required");
    return d;
  }
};

export const addFlatSchema = {
  parse: (d) => {
    if (!d.title || d.title.length < 5) throw new Error("Title must be at least 5 characters");
    if (!d.city) throw new Error("City is required");
    if (!d.rent || d.rent <= 0) throw new Error("Rent must be greater than 0");
    if (!d.type) throw new Error("Property type is required");
    return d;
  }
};

export const bookingSchema = {
  parse: (d) => {
    if (!d.flat_id || !d.check_in || !d.check_out) throw new Error("Missing booking details");
    if (new Date(d.check_out) <= new Date(d.check_in)) throw new Error("Check-out must be after check-in");
    return d;
  }
};

export const userUpdateSchema = {
  parse: (d) => {
    if (!d.name && !d.email && !d.status) throw new Error("At least one field must be provided for update");
    return d;
  }
};
