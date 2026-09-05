import type {
  Request,
  Response,
} from "express";

import jwt from "jsonwebtoken";

import {
  getAuthUserById,
  loginUser,
} from "../services/authService.js";

/* =========================================
   JWT CONFIG
========================================= */

const JWT_SECRET = (
  process.env.JWT_SECRET ?? ""
).trim();

if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET belum diatur di environment variables.",
  );
}

/*
 * Session JWT berlaku 8 jam.
 */
const JWT_EXPIRES_IN = "8h";

/* =========================================
   LOGIN
========================================= */

export async function loginHandler(
  req: Request,
  res: Response,
) {
  try {
    const {
      username,
      password,
    } = req.body ?? {};

    /* -------------------------------------
       VALIDATION
    ------------------------------------- */

    if (
      typeof username !== "string" ||
      !username.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Username wajib diisi.",
      });
    }

    if (
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password wajib diisi.",
      });
    }

    /* -------------------------------------
       VALIDATE USER
    ------------------------------------- */

    const user =
      await loginUser(
        username,
        password,
      );

    /* -------------------------------------
       CREATE JWT SESSION
    ------------------------------------- */

    const token = jwt.sign(
      {
        sub: user.id,
        role: user.role,
        role_id: user.role_id,
      },
      JWT_SECRET,
      {
        expiresIn:
          JWT_EXPIRES_IN,
      },
    );

    /* -------------------------------------
       RESPONSE
    ------------------------------------- */

    return res.status(200).json({
      success: true,
      message:
        "Login berhasil.",
      data: {
        token,
        user,
      },
    });
  } catch (error) {
    console.error(
      "Login error:",
      error,
    );

    /*
     * Jangan expose detail database
     * atau error internal ke client.
     */

    const message =
      error instanceof Error
        ? error.message
        : "Login gagal.";

    return res.status(401).json({
      success: false,
      message,
    });
  }
}

/* =========================================
   CURRENT USER / SESSION
========================================= */

export async function meHandler(
  req: Request,
  res: Response,
) {
  try {
    /* -------------------------------------
       USER ID DARI JWT
    ------------------------------------- */

    const userId =
      req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Unauthorized.",
      });
    }

    /* -------------------------------------
       GET USER TERBARU DARI DATABASE
    ------------------------------------- */

    const user =
      await getAuthUserById(
        userId,
      );

    /* -------------------------------------
       RESPONSE
    ------------------------------------- */

    return res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    console.error(
      "Me error:",
      error,
    );

    return res.status(401).json({
      success: false,
      message:
        "Session tidak valid.",
    });
  }
}