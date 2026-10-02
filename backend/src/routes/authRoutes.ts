import {
  Router,
} from "express";

import {
  loginHandler,
  meHandler,
  changePasswordHandler,
} from "../controllers/authController.js";

import {
  authenticate,
} from "../middleware/authMiddleware.js";

const router =
  Router();

/* =========================================
   LOGIN
========================================= */

/**
 * POST /api/auth/login
 */
router.post(
  "/login",
  loginHandler,
);

/* =========================================
   CURRENT USER
========================================= */

/**
 * GET /api/auth/me
 */
router.get(
  "/me",
  authenticate,
  meHandler,
);

/* =========================================
   CHANGE PASSWORD
========================================= */

/**
 * POST /api/auth/change-password
 */
router.post(
  "/change-password",
  authenticate,
  changePasswordHandler,
);

export default router;
