import { Router } from "express";

import {
  addMember,
  editMember,
  getMember,
  listMembers,
  removeMember,
} from "../controllers/memberController.js";

const router = Router();

router.get("/", listMembers);
router.get("/:id", getMember);
router.post("/", addMember);
router.put("/:id", editMember);
router.delete("/:id", removeMember);

export default router;