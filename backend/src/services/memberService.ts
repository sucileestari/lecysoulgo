import { supabase } from "../config/supabase.js";

type MemberType =
  | "customer"
  | "employee"
  | "hnr";

type MemberRecord = {
  id: string;
  name: string;
  phone: string;
  type: MemberType;
  created_at: string;
  updated_at: string;
};

type HnrMemberRecord = {
  id: string;
  name: string;
  type: "hnr";
};

type MemberInput = {
  name: string;
  phone: string;
  type?: MemberType;
};

type UpdateMemberInput = {
  name?: string;
  phone?: string;
  type?: MemberType;
  updated_at?: string;
};

function normalizePhone(phone: string): string {
  return phone.trim();
}

function normalizeMemberType(
  type: string | undefined,
): MemberType {
  if (
    type === undefined ||
    type === ""
  ) {
    return "customer";
  }

  if (
    type !== "customer" &&
    type !== "employee" &&
    type !== "hnr"
  ) {
    throw new Error(
      "Tipe anggota tidak valid",
    );
  }

  return type;
}

function handleSupabaseError(
  error: {
    code?: string;
    message?: string;
  },
): never {
  if (error.code === "23505") {
    throw new Error(
      "Nomor HP sudah terdaftar. Gunakan nomor HP yang berbeda.",
    );
  }

  throw new Error(
    error.message ||
      "Terjadi kesalahan pada database",
  );
}

/* =========================================
   GET MEMBERS
========================================= */

export async function getMembers(
  search?: string,
  type?: "hnr",
): Promise<
  MemberRecord[] | HnrMemberRecord[]
> {
  /*
   * HNR hanya membutuhkan:
   * - id
   * - name
   * - type
   *
   * Query dibuat terpisah supaya
   * TypeScript tidak gagal melakukan
   * inference terhadap select().
   */
  if (type === "hnr") {
    let query = supabase
      .from("members")
      .select(
        "id, name, type",
      )
      .order("updated_at", {
        ascending: false,
      });

    if (search?.trim()) {
      query = query.ilike(
        "name",
        `%${search.trim()}%`,
      );
    }

    const { data, error } =
      await query;

    if (error) {
      handleSupabaseError(error);
    }

    return (data ??
      []) as HnrMemberRecord[];
  }

  /*
   * Normal member query:
   * Mengembalikan seluruh data member.
   *
   * Digunakan oleh:
   * - Member page
   * - Add Batch
   * - Add Recap
   */
  let query = supabase
    .from("members")
    .select("*")
    .order("updated_at", {
      ascending: false,
    });

  if (search?.trim()) {
    query = query.ilike(
      "name",
      `%${search.trim()}%`,
    );
  }

  if (type) {
    query = query.eq(
      "type",
      type,
    );
  }

  const { data, error } =
    await query;

  if (error) {
    handleSupabaseError(error);
  }

  return (data ??
    []) as MemberRecord[];
}

/* =========================================
   GET MEMBER BY ID
========================================= */

export async function getMemberById(
  id: string,
): Promise<MemberRecord> {
  const { data, error } =
    await supabase
      .from("members")
      .select("*")
      .eq("id", id)
      .single();

  if (error) {
    handleSupabaseError(error);
  }

  return data as MemberRecord;
}

/* =========================================
   CREATE MEMBER
========================================= */

export async function createMember(
  input: MemberInput,
): Promise<MemberRecord> {
  const name =
    input.name.trim();

  const phone =
    normalizePhone(
      input.phone,
    );

  const type =
    normalizeMemberType(
      input.type,
    );

  if (!name) {
    throw new Error(
      "Nama lengkap wajib diisi",
    );
  }

  if (!phone) {
    throw new Error(
      "Nomor HP wajib diisi",
    );
  }

  const { data, error } =
    await supabase
      .from("members")
      .insert({
        name,
        phone,
        type,
      })
      .select()
      .single();

  if (error) {
    handleSupabaseError(error);
  }

  return data as MemberRecord;
}

/* =========================================
   UPDATE MEMBER
========================================= */

export async function updateMember(
  id: string,
  input: UpdateMemberInput,
): Promise<MemberRecord> {
  /* =========================================
     HNR TIDAK BOLEH DIUBAH
  ========================================= */

  const {
    data: existingMember,
    error:
      existingMemberError,
  } = await supabase
    .from("members")
    .select("id, type")
    .eq("id", id)
    .single();

  if (existingMemberError) {
    handleSupabaseError(
      existingMemberError,
    );
  }

  if (
    existingMember?.type ===
    "hnr"
  ) {
    throw new Error(
      "Member dengan status HNR tidak dapat diedit.",
    );
  }

  const updateData: UpdateMemberInput =
    {};

  if (
    input.name !== undefined
  ) {
    const name =
      input.name.trim();

    if (!name) {
      throw new Error(
        "Nama lengkap wajib diisi",
      );
    }

    updateData.name = name;
  }

  if (
    input.phone !== undefined
  ) {
    const phone =
      normalizePhone(
        input.phone,
      );

    if (!phone) {
      throw new Error(
        "Nomor HP wajib diisi",
      );
    }

    updateData.phone = phone;
  }

  if (
    input.type !== undefined
  ) {
    updateData.type =
      normalizeMemberType(
        input.type,
      );
  }

  if (
    Object.keys(updateData)
      .length === 0
  ) {
    throw new Error(
      "Minimal satu data harus diperbarui",
    );
  }

  updateData.updated_at =
    new Date().toISOString();

  const { data, error } =
    await supabase
      .from("members")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

  if (error) {
    handleSupabaseError(error);
  }

  return data as MemberRecord;
}

/* =========================================
   DELETE MEMBER
========================================= */

export async function deleteMember(
  id: string,
): Promise<void> {
  /* =========================================
     HNR TIDAK BOLEH DIHAPUS
  ========================================= */

  const {
    data: existingMember,
    error:
      existingMemberError,
  } = await supabase
    .from("members")
    .select("id, type")
    .eq("id", id)
    .single();

  if (existingMemberError) {
    handleSupabaseError(
      existingMemberError,
    );
  }

  if (
    existingMember?.type ===
    "hnr"
  ) {
    throw new Error(
      "Member dengan status HNR tidak dapat dihapus.",
    );
  }

  const { error } =
    await supabase
      .from("members")
      .delete()
      .eq("id", id);

  if (error) {
    handleSupabaseError(error);
  }
}