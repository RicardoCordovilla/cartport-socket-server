import { Router } from "express";
import pinpadRoutes from "./pinpad/pinpad.routes";

const router = Router();
router.use("/pinpad", pinpadRoutes);

export default router;
