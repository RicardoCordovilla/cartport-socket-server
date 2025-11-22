import { Router } from "express";
import { printTicket, printTest } from "./printer.service";

const router = Router();
router.post("/ticket", printTicket);
router.post("/test", printTest);

export default router;
