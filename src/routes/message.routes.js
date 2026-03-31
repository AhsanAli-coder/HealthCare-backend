import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getChatHistory } from "../controllers/message.controller.js";

const router = Router();

// Every message route requires the user to be logged in
router.use(verifyJWT);

// Both doctors and patients hit this same route; the controller figures out who they are
router.route("/:appointmentId").get(getChatHistory);

export default router;