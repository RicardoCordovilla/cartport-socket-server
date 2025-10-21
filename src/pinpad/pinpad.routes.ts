import { Router } from "express";
import { processReverse, requestPayment } from "./pinpad.service";

const router = Router();

router.post("/payment", requestPayment);
router.post("/reverse-payment", processReverse);

export default router;
