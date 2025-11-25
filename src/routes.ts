import { Router } from "express";

const router = Router();

// Health check endpoint
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: process.env.PORT || 3000
  });
});

export default router;
