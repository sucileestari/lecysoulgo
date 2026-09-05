import type { NextFunction, Request, Response } from "express";

import {
  createMember,
  deleteMember,
  getMemberById,
  getMembers,
  updateMember,
} from "../services/memberService.js";

export async function listMembers(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const search =
      typeof req.query.search === "string"
        ? req.query.search
        : undefined;

    const data = await getMembers(search);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMember(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = Array.isArray(req.params.id)
  ? req.params.id[0]
  : req.params.id;

    const data = await getMemberById(id);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function addMember(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await createMember(req.body);

    res.status(201).json({
      success: true,
      message: "Member berhasil ditambahkan",
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function editMember(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = Array.isArray(req.params.id)
  ? req.params.id[0]
  : req.params.id;

const data = await updateMember(
  id,
  req.body,
);

    res.json({
      success: true,
      message: "Member berhasil diperbarui",
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function removeMember(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = Array.isArray(req.params.id)
  ? req.params.id[0]
  : req.params.id;

await deleteMember(id);

    res.json({
      success: true,
      message: "Member berhasil dihapus",
    });
  } catch (error) {
    next(error);
  }
}