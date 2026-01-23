import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from "cookie-parser";
import destinationsRouter from "./routes/destinations.js";
import generateRouter from "./routes/generate.js";
import extractTiktokRouter from "./routes/extract-tiktok.js";
import itineraryItemsRouter from "./routes/itineraryItems.js";
import itinerariesRouter from "./routes/itineraries.js";
import authRouter from "./routes/auth.js";

// Load environment variables from the repo root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();

// Middleware
// CORS: allow localhost and production origins
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  // Add your Vercel domains here
  process.env.FRONTEND_URL, // Set this in your backend environment variables
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: function(origin, callback) {
    // allow requests with no origin (curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Also allow any vercel.app subdomain
    if (origin && origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/generate", generateRouter);
app.use("/api/extract-tiktok", extractTiktokRouter);
app.use("/api/destinations", destinationsRouter);
app.use("/api/itinerary-items", itineraryItemsRouter);
app.use("/api/itineraries", itinerariesRouter);
app.use("/api/auth", authRouter);

// Health check route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
