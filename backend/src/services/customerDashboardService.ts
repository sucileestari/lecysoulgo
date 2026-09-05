import { supabase } from "../config/supabase.js";

export async function getCustomerDashboard(
  memberId: string,
) {
  if (!memberId) {
    throw new Error("Member ID tidak ditemukan.");
  }

  // =========================================
  // MEMBER
  // =========================================

  const { data: member, error: memberError } =
    await supabase
      .from("members")
      .select(`
        id,
        name,
        phone
      `)
      .eq("id", memberId)
      .maybeSingle();

  if (memberError) {
    console.error(
      "getCustomerDashboard member error:",
      memberError,
    );

    throw new Error(
      "Gagal mengambil data member.",
    );
  }

  if (!member) {
    const error = new Error(
      "Member tidak ditemukan.",
    );

    error.name = "MEMBER_NOT_FOUND";

    throw error;
  }

  // =========================================
  // RECAPS
  // =========================================

  const { data: recaps, error: recapsError } =
    await supabase
      .from("recaps")
      .select(`
        id,
        batch_id,
        member_id
      `)
      .eq("member_id", memberId);

  if (recapsError) {
    console.error(
      "getCustomerDashboard recaps error:",
      recapsError,
    );

    throw new Error(
      "Gagal mengambil data rekapan.",
    );
  }

  return {
    member: {
      id: member.id,
      name: member.name,
      phone: member.phone,
    },

    recaps: recaps ?? [],
  };
}