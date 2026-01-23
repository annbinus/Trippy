import express from "express";
import pool from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

const router = express.Router();

// POST /api/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // Check if user exists
    const { rows: existing } = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at`,
      [name, email, hashed]
    );

    const user = rows[0];
    // Set JWT token after registration for auto-login
    const token = signToken(user);
    // Return token in response body instead of cookie
    res.status(201).json({ user, token });
  } catch (err) {
    console.error("POST /api/register error:", err);
    res.status(500).json({ error: "Failed to register" });
  }
});

// POST /api/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const { rows } = await pool.query("SELECT id, name, email, password_hash FROM users WHERE email = $1", [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Return user without password and JWT token
    const safeUser = { id: user.id, name: user.name, email: user.email };
    const token = signToken(safeUser);
    // Return token in response body instead of cookie
    res.json({ user: safeUser, token });
  } catch (err) {
    console.error("POST /api/login error:", err);
    res.status(500).json({ error: "Failed to login" });
  }
});

// GET /api/auth/me
router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/, "") || req.cookies?.token;
    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ error: "Not authenticated" });
    res.json({ user: { id: payload.id, name: payload.name, email: payload.email } });
  } catch (err) {
    console.error("GET /api/auth/me error:", err);
    res.status(500).json({ error: "Failed to verify" });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});

export default router;
