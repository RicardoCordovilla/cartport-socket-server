import { Router } from "express";
import {printTicket, printTest, printFill} from "./printer.service";

const router = Router();
router.post("/ticket", printTicket);
router.post("/test", printTest);
router.post("/print-fill", printFill);

export default router;
