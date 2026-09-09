import { supabase } from "../config/supabase.js";

type MemberType =
  | "customer"
  | "employee";

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
    type !== "employee"
  ) {
    throw new Error(
      "Tipe anggota tidak valid",
    );
  }

  return type;
}

function handleSupabaseError(
  error: { code?: string; message?: string },
): never {
  if (error.code === "23505") {
    throw new Error(
      "Nomor HP sudah terdaftar. Gunakan nomor HP yang berbeda.",
    );
  }

  throw new Error(
    error.message || "Terjadi kesalahan pada database",
  );
}

export async function getMembers(search?: string) {
  let query = supabase
    .from("members")
    .select("*")
    .order("updated_at", { ascending: false });

  if (search?.trim()) {
    query = query.ilike(
      "name",
      `%${search.trim()}%`,
    );
  }

  const { data, error } = await query;

  if (error) {
    handleSupabaseError(error);
  }

  return data;
}

export async function getMemberById(id: string) {
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    handleSupabaseError(error);
  }

  return data;
}

export async function createMember(
  input: MemberInput,
) {
  const name = input.name.trim();
  const phone = normalizePhone(input.phone);
  const type = normalizeMemberType(
    input.type,
  );

  if (!name) {
    throw new Error("Nama lengkap wajib diisi");
  }

  if (!phone) {
    throw new Error("Nomor HP wajib diisi");
  }

  const { data, error } = await supabase
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

  return data;
}

export async function updateMember(
  id: string,
  input: UpdateMemberInput,
) {
  const updateData: UpdateMemberInput = {};

  if (input.name !== undefined) {
    const name = input.name.trim();

    if (!name) {
      throw new Error("Nama lengkap wajib diisi");
    }

    updateData.name = name;
  }

  if (input.phone !== undefined) {
    const phone = normalizePhone(input.phone);

    if (!phone) {
      throw new Error("Nomor HP wajib diisi");
    }

    updateData.phone = phone;
  }

  if (input.type !== undefined) {
    updateData.type = normalizeMemberType(
      input.type,
    );
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error(
      "Minimal satu data harus diperbarui",
    );
  }

  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("members")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    handleSupabaseError(error);
  }

  return data;
}

export async function deleteMember(id: string) {
  const { error } = await supabase
    .from("members")
    .delete()
    .eq("id", id);

  if (error) {
    handleSupabaseError(error);
  }
}