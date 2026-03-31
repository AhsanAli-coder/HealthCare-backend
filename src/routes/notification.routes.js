import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getMyNotifications,
  markAllRead,
  markNotificationRead,
} from "../controllers/notification.controller.js";

const router = Router();
router.use(verifyJWT);

router.route("/").get(getMyNotifications);
router.route("/read-all").patch(markAllRead);
router.route("/:notificationId/read").patch(markNotificationRead);

export default router;

