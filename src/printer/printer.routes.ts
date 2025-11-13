import { Router } from "express";
import { printTicket } from "./printer.service";


const router = Router();
router.post("/ticket", printTicket);

export default router;
