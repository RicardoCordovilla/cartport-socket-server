import { Router } from "express";
import pinpadRoutes from "./pinpad/pinpad.routes";
import printerRoutes from "./printer/printer.routes";

const router = Router();
router.use("/pinpad", pinpadRoutes);
router.use("/printer", printerRoutes);

export default router;
