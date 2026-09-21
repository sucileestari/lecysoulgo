import crypto from "node:crypto";

import { supabase } from "../config/supabase.js";

/* =========================================
   TYPES
========================================= */

export type AuthUser = {
  id: string;
  name: string;
  username: string;
  role_id: string;
  role: string;
  permissions: string[];
  is_active: boolean;
};

type UserRecord = {
  id: string;
  name: string;
  username: string;
  password_hash: string;
  role_id: string;
  is_active: boolean;
};

type RoleRecord = {
  id: string;
  name: string;
};

type PermissionRecord = {
  code: string;
};

type RolePermissionRecord = {
  permission: PermissionRecord | null;
};

/* =========================================
   PASSWORD HASH
========================================= */

const SCRYPT_KEY_LENGTH = 64;

/**
 * Membuat password hash menggunakan
 * Node.js crypto.scrypt.
 *
 * Format:
 *
 * scrypt:salt:hash
 */
export async function hashPassword(
  password: string,
): Promise<string> {
  if (!password) {
    throw new Error(
      "Password wajib diisi.",
    );
  }

  const salt =
    crypto.randomBytes(16).toString(
      "hex",
    );

  const derivedKey =
    await new Promise<Buffer>(
      (resolve, reject) => {
        crypto.scrypt(
          password,
          salt,
          SCRYPT_KEY_LENGTH,
          (error, key) => {
            if (error) {
              reject(error);
              return;
            }

            resolve(key);
          },
        );
      },
    );

  return [
    "scrypt",
    salt,
    derivedKey.toString("hex"),
  ].join(":");
}

/* =========================================
   PASSWORD VERIFY
========================================= */

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  if (
    !password ||
    !storedHash
  ) {
    return false;
  }

  /* =========================================
     SUPPORT LEGACY SHA-256 HASH
     Format:
     64 karakter hexadecimal
  ========================================= */

  const isSha256Hash =
    /^[a-f0-9]{64}$/i.test(
      storedHash,
    );

  if (isSha256Hash) {
    const calculatedHash =
      crypto
        .createHash("sha256")
        .update(password)
        .digest("hex");

    const calculatedBuffer =
      Buffer.from(
        calculatedHash,
        "hex",
      );

    const storedBuffer =
      Buffer.from(
        storedHash,
        "hex",
      );

    if (
      calculatedBuffer.length !==
      storedBuffer.length
    ) {
      return false;
    }

    return crypto.timingSafeEqual(
      calculatedBuffer,
      storedBuffer,
    );
  }

  /* =========================================
     SCRYPT HASH
     Format:
     scrypt:salt:hash
  ========================================= */

  const parts =
    storedHash.split(":");

  if (
    parts.length !== 3 ||
    parts[0] !== "scrypt"
  ) {
    return false;
  }

  const salt = parts[1];
  const storedKeyHex = parts[2];

  if (
    !salt ||
    !storedKeyHex
  ) {
    return false;
  }

  let storedKey: Buffer;

  try {
    storedKey =
      Buffer.from(
        storedKeyHex,
        "hex",
      );
  } catch {
    return false;
  }

  const derivedKey =
    await new Promise<Buffer>(
      (resolve, reject) => {
        crypto.scrypt(
          password,
          salt,
          SCRYPT_KEY_LENGTH,
          (error, key) => {
            if (error) {
              reject(error);
              return;
            }

            resolve(key);
          },
        );
      },
    );

  if (
    derivedKey.length !==
    storedKey.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    derivedKey,
    storedKey,
  );
}

/* =========================================
   GET USER
========================================= */

async function getUserByUsername(
  username: string,
): Promise<UserRecord> {
  const { data, error } =
    await supabase
      .from("users")
      .select(
        `
          id,
          name,
          username,
          password_hash,
          role_id,
          is_active
        `,
      )
      .eq(
        "username",
        username,
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      `Gagal mengambil data user: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "Username atau password salah.",
    );
  }

  return data as UserRecord;
}

/* =========================================
   GET ROLE
========================================= */

async function getRoleById(
  roleId: string,
): Promise<RoleRecord> {
  const { data, error } =
    await supabase
      .from("roles")
      .select(
        "id, name",
      )
      .eq(
        "id",
        roleId,
      )
      .single();

  if (error || !data) {
    throw new Error(
      "Role user tidak ditemukan.",
    );
  }

  return data as RoleRecord;
}

/* =========================================
   GET PERMISSIONS
========================================= */

async function getPermissionsByRoleId(
  roleId: string,
): Promise<string[]> {
  const { data, error } =
    await supabase
      .from("role_permissions")
      .select(
        `
          permission:permissions (
            code
          )
        `,
      )
      .eq(
        "role_id",
        roleId,
      );

  if (error) {
    throw new Error(
      `Gagal mengambil permission: ${error.message}`,
    );
  }

  const records =
    (data ??
      []) as unknown as RolePermissionRecord[];

  return records
    .map(
      (item) =>
        item.permission?.code,
    )
    .filter(
      (
        code,
      ): code is string =>
        Boolean(code),
    );
}

/* =========================================
   LOGIN
========================================= */

export async function loginUser(
  username: string,
  password: string,
): Promise<AuthUser> {
  const normalizedUsername =
    username
      .trim()
      .toLowerCase();

  if (!normalizedUsername) {
    throw new Error(
      "Username wajib diisi.",
    );
  }

  if (!password) {
    throw new Error(
      "Password wajib diisi.",
    );
  }

  /* -----------------------------------------
     GET USER
  ----------------------------------------- */

  const user =
    await getUserByUsername(
      normalizedUsername,
    );

  /* -----------------------------------------
     CHECK ACTIVE
  ----------------------------------------- */

  if (!user.is_active) {
    throw new Error(
      "Akun tidak aktif. Hubungi Super Admin.",
    );
  }

  /* -----------------------------------------
     VERIFY PASSWORD
  ----------------------------------------- */

  const passwordValid =
    await verifyPassword(
      password,
      user.password_hash,
    );

  if (!passwordValid) {
    throw new Error(
      "Username atau password salah.",
    );
  }

  /* -----------------------------------------
     GET ROLE
  ----------------------------------------- */

  const role =
    await getRoleById(
      user.role_id,
    );

  /* -----------------------------------------
     GET PERMISSIONS
  ----------------------------------------- */

  let permissions =
    await getPermissionsByRoleId(
      user.role_id,
    );

  /*
   * Super Admin otomatis mempunyai
   * seluruh permission.
   *
   * Permission aktual tetap diambil
   * dari database agar response konsisten.
   */

  if (
    role.name ===
    "super_admin"
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from("permissions")
        .select("code")
        .order("code");

    if (error) {
      throw new Error(
        `Gagal mengambil seluruh permission: ${error.message}`,
      );
    }

    permissions =
      (
        data ?? []
      ).map(
        (
          permission,
        ) => permission.code,
      );
  }

  /* -----------------------------------------
     RETURN USER
  ----------------------------------------- */

  return {
    id: user.id,

    name: user.name,

    username:
      user.username,

    role_id:
      user.role_id,

    role:
      role.name,

    permissions,

    is_active:
      user.is_active,
  };
}

/* =========================================
   GET USER BY ID
========================================= */

export async function getAuthUserById(
  userId: string,
): Promise<AuthUser> {
  const { data, error } =
    await supabase
      .from("users")
      .select(
        `
          id,
          name,
          username,
          role_id,
          is_active,
          roles (
            id,
            name
          )
        `,
      )
      .eq(
        "id",
        userId,
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      `Gagal mengambil user: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "User tidak ditemukan.",
    );
  }

  if (!data.is_active) {
    throw new Error(
      "Akun tidak aktif.",
    );
  }

  const roleData =
    Array.isArray(data.roles)
      ? data.roles[0]
      : data.roles;

  if (!roleData) {
    throw new Error(
      "Role user tidak ditemukan.",
    );
  }

  let permissions =
    await getPermissionsByRoleId(
      data.role_id,
    );

  if (
    roleData.name ===
    "super_admin"
  ) {
    const {
      data: allPermissions,
      error:
        permissionError,
    } =
      await supabase
        .from("permissions")
        .select("code")
        .order("code");

    if (permissionError) {
      throw new Error(
        `Gagal mengambil permission: ${permissionError.message}`,
      );
    }

    permissions =
      (
        allPermissions ?? []
      ).map(
        (
          permission,
        ) => permission.code,
      );
  }

  return {
    id: data.id,

    name: data.name,

    username:
      data.username,

    role_id:
      data.role_id,

    role:
      roleData.name,

    permissions,

    is_active:
      data.is_active,
  };
}