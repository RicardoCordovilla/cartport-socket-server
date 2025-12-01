import { Router } from "express";
import {printTicket, printTest, printFill, printCoinEmpty, printBillEmpty, printRecaudacion} from "./printer.service";

const router = Router();
router.post("/ticket", printTicket);
router.post("/test", printTest);
router.post("/print-fill", printFill);
router.post("/print-coinempty", printCoinEmpty);
router.post("/print-billempty", printBillEmpty);
router.post("/print-recaudacion", printRecaudacion);

export default router;
