import { Router } from "express";
import { requestPayment } from "./pinpad.service";

const router = Router();

router.post("/payment", requestPayment);

export default router;
