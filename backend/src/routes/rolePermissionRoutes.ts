import {
  Router,
} from "express";

import {
  authenticate,
} from "../middleware/authMiddleware.js";

import {
  requirePermission,
} from "../middleware/permissionMiddleware.js";

import {
  getRolesHandler,
  getPermissionsHandler,
  getRolePermissionsHandler,
  updateRolePermissionsHandler,
  createRoleHandler,
  updateRoleHandler,
  deleteRoleHandler,
} from "../controllers/rolePermissionController.js";

const router =
  Router();

/* =========================================
   ALL ROUTES REQUIRE LOGIN
========================================= */

router.use(
  authenticate,
);

/* =========================================
   GET ALL ROLES

   GET /api/roles
========================================= */

router.get(
  "/",
  requirePermission(
    "roles.view",
  ),
  getRolesHandler,
);

/* =========================================
   GET ALL PERMISSIONS

   GET /api/roles/permissions
========================================= */

router.get(
  "/permissions",
  requirePermission(
    "roles.view",
  ),
  getPermissionsHandler,
);

/* =========================================
   GET ROLE PERMISSIONS

   GET /api/roles/:roleId/permissions
========================================= */

router.get(
  "/:roleId/permissions",
  requirePermission(
    "roles.view",
  ),
  getRolePermissionsHandler,
);

/* =========================================
   UPDATE ROLE PERMISSIONS

   PUT /api/roles/:roleId/permissions
========================================= */

router.put(
  "/:roleId/permissions",
  requirePermission(
    "permissions.manage",
  ),
  updateRolePermissionsHandler,
);

/* =========================================
   CREATE ROLE

   POST /api/roles
========================================= */

router.post(
  "/",
  requirePermission(
    "roles.create",
  ),
  createRoleHandler,
);

/* =========================================
   UPDATE ROLE

   PUT /api/roles/:roleId
========================================= */

router.put(
  "/:roleId",
  requirePermission(
    "roles.edit",
  ),
  updateRoleHandler,
);

/* =========================================
   DELETE ROLE

   DELETE /api/roles/:roleId
========================================= */

router.delete(
  "/:roleId",
  requirePermission(
    "roles.delete",
  ),
  deleteRoleHandler,
);

export default router;