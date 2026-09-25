import { Router } from "express";

import {
  authenticate,
} from "../middleware/authMiddleware.js";

import {
  requirePermission,
} from "../middleware/permissionMiddleware.js";

import {
  addMember,
  editMember,
  getMember,
  listBatchMemberOptions,
  listHnrMembers,
  listMembers,
  listRecapMemberOptions,
  removeMember,
} from "../controllers/memberController.js";

const router = Router();

/* =========================================
   PUBLIC HNR LIST
   Digunakan oleh Rules GO

   Hanya mengembalikan:
   - id
   - name
   - type

   Tidak membutuhkan members.view
========================================= */

router.get(
  "/hnr",
  listHnrMembers,
);

/* =========================================
   ALL NORMAL MEMBER ROUTES REQUIRE LOGIN
========================================= */

router.use(
  authenticate,
);

/* =========================================
   GET ALL MEMBERS
========================================= */

router.get(
  "/",
  requirePermission(
    "members.view",
  ),
  listMembers,
);

/* =========================================
   GET MEMBERS FOR ADD BATCH
========================================= */

router.get(
  "/batch-options",
  requirePermission(
    "batches.create",
  ),
  listBatchMemberOptions,
);

/* =========================================
   GET MEMBERS FOR ADD RECAP
========================================= */

router.get(
  "/recap-options",
  requirePermission(
    "recaps.create",
  ),
  listRecapMemberOptions,
);

/* =========================================
   GET MEMBER BY ID
========================================= */

router.get(
  "/:id",
  requirePermission(
    "members.view",
  ),
  getMember,
);

/* =========================================
   CREATE MEMBER
========================================= */

router.post(
  "/",
  requirePermission(
    "members.create",
  ),
  addMember,
);

/* =========================================
   UPDATE MEMBER
========================================= */

router.put(
  "/:id",
  requirePermission(
    "members.edit",
  ),
  editMember,
);

/* =========================================
   DELETE MEMBER
========================================= */

router.delete(
  "/:id",
  requirePermission(
    "members.delete",
  ),
  removeMember,
);

export default router;