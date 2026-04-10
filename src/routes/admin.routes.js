import { Router } from "express";
import { verifyJWT, verifyRole } from "../middlewares/auth.middleware.js";
import {
  activateUser,
  approveDoctor,
  getDashboardKPIs,
  listPendingDoctors,
  listUsers,
  suspendUser,
} from "../controllers/admin.controller.js";

const router = Router();
router.use(verifyJWT, verifyRole(["admin"]));

router.route("/dashboard/kpis").get(getDashboardKPIs);
router.route("/doctors/pending").get(listPendingDoctors);
router.route("/doctors/:doctorId/approve").patch(approveDoctor);

router.route("/users").get(listUsers);
router.route("/users/:userId/suspend").patch(suspendUser);
router.route("/users/:userId/activate").patch(activateUser);

export default router;

