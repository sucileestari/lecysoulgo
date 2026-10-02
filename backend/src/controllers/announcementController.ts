import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncementById,
  getAnnouncements,
  getPublishedAnnouncements,
  publishAnnouncement,
  updateAnnouncement,
} from "../services/announcementService.js";

/* =========================================
   HELPER
========================================= */

function getAuthenticatedUserId(
  req: Request,
): string {
  const userId =
    req.user?.id;

  if (
    typeof userId !== "string" ||
    !userId.trim()
  ) {
    throw new Error(
      "User yang sedang login tidak ditemukan.",
    );
  }

  return userId;
}

/* =========================================
   GET ALL ANNOUNCEMENTS
   Admin
========================================= */

export async function listAnnouncements(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const search =
      typeof req.query.search ===
      "string"
        ? req.query.search
        : undefined;

    const data =
      await getAnnouncements(
        search,
      );

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

/* =========================================
   GET PUBLISHED ANNOUNCEMENTS
   Customer Dashboard
========================================= */

export async function listPublishedAnnouncements(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data =
      await getPublishedAnnouncements();

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

/* =========================================
   GET ANNOUNCEMENT BY ID
========================================= */

export async function getAnnouncement(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = Array.isArray(
      req.params.id,
    )
      ? req.params.id[0]
      : req.params.id;

    const data =
      await getAnnouncementById(
        id,
      );

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

/* =========================================
   CREATE ANNOUNCEMENT
========================================= */

export async function addAnnouncement(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId =
      getAuthenticatedUserId(req);

    const data =
      await createAnnouncement(
        req.body,
        userId,
      );

    return res.status(201).json({
      success: true,
      message:
        "Pengumuman berhasil dibuat",
      data,
    });
  } catch (error) {
    return next(error);
  }
}

/* =========================================
   UPDATE ANNOUNCEMENT
========================================= */

export async function editAnnouncement(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = Array.isArray(
      req.params.id,
    )
      ? req.params.id[0]
      : req.params.id;

    const userId =
      getAuthenticatedUserId(req);

    const data =
      await updateAnnouncement(
        id,
        req.body,
        userId,
      );

    return res.json({
      success: true,
      message:
        "Pengumuman berhasil diperbarui",
      data,
    });
  } catch (error) {
    return next(error);
  }
}

/* =========================================
   DELETE ANNOUNCEMENT
========================================= */

export async function removeAnnouncement(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = Array.isArray(
      req.params.id,
    )
      ? req.params.id[0]
      : req.params.id;

    await deleteAnnouncement(
      id,
    );

    return res.json({
      success: true,
      message:
        "Pengumuman berhasil dihapus",
    });
  } catch (error) {
    return next(error);
  }
}

/* =========================================
   PUBLISH ANNOUNCEMENT
========================================= */

export async function publishAnnouncementController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = Array.isArray(
      req.params.id,
    )
      ? req.params.id[0]
      : req.params.id;

    const userId =
      getAuthenticatedUserId(req);

    const data =
      await publishAnnouncement(
        id,
        userId,
      );

    return res.json({
      success: true,
      message:
        "Pengumuman berhasil dipublikasikan",
      data,
    });
  } catch (error) {
    return next(error);
  }
}