import jwt from "jsonwebtoken";

import { supabase } from "../config/supabase.js";

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

const JWT_EXPIRES_IN = "8h";

/* =========================================
   TYPES
========================================= */

export type CustomerAccessResult = {
  token: string;

  member: {
    id: string;
    name: string;
    phone: string;
  };
};

/* =========================================
   PHONE NORMALIZATION
========================================= */

/**
 * Menghasilkan beberapa kemungkinan format
 * nomor WhatsApp agar data lama tetap dapat
 * ditemukan.
 *
 * Contoh:
 *
 * 081234567890
 * 6281234567890
 * +6281234567890
 */
function getPhoneVariants(
  phone: string,
): string[] {
  const digits =
    phone.replace(
      /\D/g,
      "",
    );

  if (!digits) {
    return [];
  }

  const variants =
    new Set<string>();

  /* -------------------------------------
     FORMAT ASLI
  ------------------------------------- */

  variants.add(digits);

  /* -------------------------------------
     08xxxxxxxxxx → 62xxxxxxxxxx
  ------------------------------------- */

  if (
    digits.startsWith("0")
  ) {
    variants.add(
      `62${digits.slice(1)}`,
    );
  }

  /* -------------------------------------
     62xxxxxxxxxx → 08xxxxxxxxxx
  ------------------------------------- */

  if (
    digits.startsWith("62")
  ) {
    variants.add(
      `0${digits.slice(2)}`,
    );
  }

  /* -------------------------------------
     8xxxxxxxxxx
     → 08xxxxxxxxxx
     → 62xxxxxxxxxx
  ------------------------------------- */

  if (
    digits.startsWith("8")
  ) {
    variants.add(
      `0${digits}`,
    );

    variants.add(
      `62${digits}`,
    );
  }

  /* -------------------------------------
     +62xxxxxxxxxx
  ------------------------------------- */

  const withoutLeadingZero =
    digits.startsWith("0")
      ? digits.slice(1)
      : digits;

  if (
    withoutLeadingZero.startsWith(
      "8",
    )
  ) {
    variants.add(
      `+62${withoutLeadingZero}`,
    );
  }

  return Array.from(
    variants,
  );
}

/* =========================================
   CUSTOMER LOGIN
========================================= */

/**
 * Login customer berdasarkan nomor WhatsApp.
 *
 * Customer bukan user admin.
 *
 * Jika nomor ditemukan:
 * - generate customer JWT
 * - return token
 * - return data member
 *
 * Jika tidak ditemukan:
 * - throw MEMBER_NOT_FOUND
 */
export async function loginCustomerByPhone(
  phone: string,
): Promise<CustomerAccessResult> {

  /* -------------------------------------
     VALIDATE PHONE
  ------------------------------------- */

  const cleanPhone =
    phone?.trim();

  if (!cleanPhone) {
    throw new Error(
      "Nomor WhatsApp wajib diisi.",
    );
  }

  /* -------------------------------------
     NORMALIZE PHONE
  ------------------------------------- */

  const phoneVariants =
    getPhoneVariants(
      cleanPhone,
    );

  if (
    phoneVariants.length === 0
  ) {
    throw new Error(
      "Nomor WhatsApp tidak valid.",
    );
  }

  /* -------------------------------------
     FIND MEMBER
  ------------------------------------- */

  const {
    data: member,
    error,
  } = await supabase
    .from("members")
    .select(
      `
        id,
        name,
        phone
      `,
    )
    .in(
      "phone",
      phoneVariants,
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "loginCustomerByPhone error:",
      error,
    );

    throw new Error(
      "Gagal memeriksa data member.",
    );
  }

  /* -------------------------------------
     MEMBER NOT FOUND
  ------------------------------------- */

  if (!member) {
    const error =
      new Error(
        "Nomor WhatsApp belum terdaftar sebagai member.",
      );

    error.name =
      "MEMBER_NOT_FOUND";

    throw error;
  }

  /* -------------------------------------
     CREATE CUSTOMER JWT
  ------------------------------------- */

  const token =
    jwt.sign(
      {
        /*
         * sub menjadi identitas utama
         * customer.
         */
        sub: member.id,

        /*
         * Membedakan token customer
         * dengan token admin.
         */
        user_type:
          "customer",

        /*
         * Digunakan oleh
         * customerAuthMiddleware.
         */
        member_id:
          member.id,
      },

      JWT_SECRET,

      {
        expiresIn:
          JWT_EXPIRES_IN,
      },
    );

  /* -------------------------------------
     RETURN
  ------------------------------------- */

  return {
    token,

    member: {
      id:
        member.id,

      name:
        member.name,

      phone:
        member.phone,
    },
  };
}