
import { Router } from "express";

import * as authController from "./auth.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

router.post("/login", authController.login);
router.get("/me", authenticate, authController.me);
router.post("/logout", authenticate, authController.logout);

export default router;
