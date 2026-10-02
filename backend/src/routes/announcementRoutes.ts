import { Router } from "express";

import {
  authenticate,
} from "../middleware/authMiddleware.js";

import {
  addAnnouncement,
  editAnnouncement,
  getAnnouncement,
  listAnnouncements,
  removeAnnouncement,
  publishAnnouncementController,
} from "../controllers/announcementController.js";

const router = Router();

/* =========================================
   ALL ADMIN ANNOUNCEMENT ROUTES REQUIRE LOGIN
========================================= */

router.use(
  authenticate,
);

/* =========================================
   GET ALL ANNOUNCEMENTS
========================================= */

router.get(
  "/",
  listAnnouncements,
);

/* =========================================
   GET ANNOUNCEMENT BY ID
========================================= */

router.get(
  "/:id",
  getAnnouncement,
);

/* =========================================
   CREATE ANNOUNCEMENT
========================================= */

router.post(
  "/",
  addAnnouncement,
);

/* =========================================
   UPDATE ANNOUNCEMENT
========================================= */

router.put(
  "/:id",
  editAnnouncement,
);

/* =========================================
   DELETE ANNOUNCEMENT
========================================= */

router.delete(
  "/:id",
  removeAnnouncement,
);

/* =========================================
   PUBLISH ANNOUNCEMENT
========================================= */

router.post(
  "/:id/publish",
  publishAnnouncementController,
);

export default router;