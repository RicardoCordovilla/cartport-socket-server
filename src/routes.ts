import { Router } from "express";
import pinpadRoutes from "./pinpad/pinpad.routes";
import printerRoutes from "./printer/printer.routes";

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

router.use("/pinpad", pinpadRoutes);
router.use("/printer", printerRoutes);

export default router;
