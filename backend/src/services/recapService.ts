import { supabase } from "../config/supabase.js";

/* =========================================
   TYPES
========================================= */

export type Recap = {
  id: string;

  batch_id: string;

  member_id: string;

  detail_barang: string;

  qty: number;

  harga_barang: number;

  total_harga: number;

  persentase_dp: number;

  total_dp: number;

  sisa_pelunasan: number;

  /*
   * Status Checkout / CO.
   *
   * false = Belum
   * true  = Sudah
   */
  sudah_co: boolean;

  max_timbun: string | null;

  created_at: string;

  updated_at: string;

  /*
   * Data member untuk ditampilkan
   * di frontend.
   */
  member?: {
    id: string;

    name: string;

    phone: string;

    type: "customer" | "employee" | "hnr";
  } | null;
};

/* =========================================
   CREATE RECAP INPUT
========================================= */

export type CreateRecapInput = {
  batch_id: string;

  member_id: string;

  detail_barang: string;

  qty: number;

  harga_barang: number;

  persentase_dp: number;
};

/* =========================================
   PAYMENT TYPE
========================================= */

type PaymentType =
  | "DP"
  | "PELUNASAN";

/* =========================================
   PAYMENT STATUS
========================================= */

type PaymentRecord = {
  payment_type:
    | string
    | null;

  status:
    | string
    | null;
};

/* =========================================
   PAYMENT STATUS HELPER
========================================= */

/**
 * Menentukan apakah tipe pembayaran
 * tertentu sudah paid.
 *
 * Case-insensitive:
 * paid
 * Paid
 * PAID
 *
 * semuanya dianggap paid.
 */
function isPaymentPaid(
  payments: PaymentRecord[],
  paymentType: PaymentType,
): boolean {
  const normalizedPaymentType =
    paymentType.toUpperCase();

  return payments.some(
    (payment) =>
      String(
        payment.payment_type ??
          "",
      ).toUpperCase() ===
        normalizedPaymentType &&
      String(
        payment.status ??
          "",
      ).toLowerCase() ===
        "paid",
  );
}

/**
 * Menentukan apakah seluruh pembayaran
 * sebuah recap sudah lunas.
 *
 * Requirement CO:
 *
 * DP       = paid
 * Pelunasan = paid
 *
 * barulah CO bisa ditandai.
 */
function isRecapFullyPaid(
  payments: PaymentRecord[],
): boolean {
  const dpPaid =
    isPaymentPaid(
      payments,
      "DP",
    );

  const pelunasanPaid =
    isPaymentPaid(
      payments,
      "PELUNASAN",
    );

  return (
    dpPaid &&
    pelunasanPaid
  );
}

/* =========================================
   GET RECAPS BY BATCH
========================================= */

/**
 * Mengambil seluruh rekapan
 * berdasarkan batch.
 */
export async function getRecapsByBatch(
  batchId: string,
): Promise<Recap[]> {
  /* -------------------------------------
     VALIDATION
  ------------------------------------- */

  if (!batchId.trim()) {
    throw new Error(
      "ID batch wajib diisi.",
    );
  }

  /* -------------------------------------
     GET RECAPS
  ------------------------------------- */

  const {
    data,
    error,
  } =
    await supabase
      .from("recaps")
      .select(`
        *,
        member:members (
          id,
          name,
          phone,
          type
        )
      `)
      .eq(
        "batch_id",
        batchId,
      )
      .order(
        "created_at",
        {
          ascending: true,
        },
      );

  if (error) {
    throw new Error(
      `Gagal mengambil data rekapan: ${error.message}`,
    );
  }

  return (data ?? []) as Recap[];
}

/* =========================================
   GET RECAP BY ID
========================================= */

/**
 * Mengambil satu recap berdasarkan ID.
 *
 * Digunakan oleh proses update CO
 * agar status terbaru divalidasi
 * langsung dari database.
 */
export async function getRecapById(
  id: string,
): Promise<Recap> {
  if (!id.trim()) {
    throw new Error(
      "ID rekapan wajib diisi.",
    );
  }

  const {
    data,
    error,
  } =
    await supabase
      .from("recaps")
      .select(`
        *,
        member:members (
          id,
          name,
          phone,
          type
        )
      `)
      .eq(
        "id",
        id.trim(),
      )
      .single();

  if (
    error ||
    !data
  ) {
    throw new Error(
      `Rekapan tidak ditemukan: ${
        error?.message ??
        "Data tidak tersedia."
      }`,
    );
  }

  return data as Recap;
}

/* =========================================
   CREATE SINGLE RECAP
========================================= */

/**
 * Membuat satu rekapan
 * untuk satu member.
 */
export async function createRecap(
  input: CreateRecapInput,
): Promise<Recap> {
  const {
    batch_id,
    member_id,
    detail_barang,
    qty,
    harga_barang,
    persentase_dp,
  } = input;

  /* -------------------------------------
     BASIC VALIDATION
  ------------------------------------- */

  if (!batch_id.trim()) {
    throw new Error(
      "ID batch wajib diisi.",
    );
  }

  if (!member_id.trim()) {
    throw new Error(
      "ID member wajib diisi.",
    );
  }

  if (
    !detail_barang.trim()
  ) {
    throw new Error(
      "Detail barang wajib diisi.",
    );
  }

  if (
    !Number.isInteger(
      qty,
    ) ||
    qty <= 0
  ) {
    throw new Error(
      "Qty harus lebih besar dari 0.",
    );
  }

  if (
    !Number.isFinite(
      harga_barang,
    ) ||
    harga_barang < 0
  ) {
    throw new Error(
      "Harga barang tidak valid.",
    );
  }

  if (
    !Number.isFinite(
      persentase_dp,
    ) ||
    persentase_dp < 0 ||
    persentase_dp > 100
  ) {
    throw new Error(
      "Persentase DP harus antara 0 sampai 100.",
    );
  }

  /* -------------------------------------
     CHECK BATCH
  ------------------------------------- */

  const {
    data: batch,
    error: batchError,
  } =
    await supabase
      .from("batches")
      .select("id")
      .eq(
        "id",
        batch_id,
      )
      .maybeSingle();

  if (batchError) {
    throw new Error(
      `Gagal memeriksa batch: ${batchError.message}`,
    );
  }

  if (!batch) {
    throw new Error(
      "Batch tidak ditemukan.",
    );
  }

  /* -------------------------------------
     CHECK MEMBER
  ------------------------------------- */

  const {
    data: member,
    error: memberError,
  } =
    await supabase
      .from("members")
      .select("id")
      .eq(
        "id",
        member_id,
      )
      .maybeSingle();

  if (memberError) {
    throw new Error(
      `Gagal memeriksa member: ${memberError.message}`,
    );
  }

  if (!member) {
    throw new Error(
      "Member tidak ditemukan.",
    );
  }

  /* -------------------------------------
     CALCULATE TOTAL
  ------------------------------------- */

  const totalHarga =
    qty *
    harga_barang;

  const totalDp =
    totalHarga *
    (persentase_dp / 100);

  const sisaPelunasan =
    totalHarga -
    totalDp;

  /* -------------------------------------
     INSERT
  ------------------------------------- */

  const {
    data,
    error,
  } =
    await supabase
      .from("recaps")
      .insert({
        batch_id,

        member_id,

        detail_barang:
          detail_barang.trim(),

        qty,

        harga_barang:
          Math.round(
            harga_barang,
          ),

        total_harga:
          Math.round(
            totalHarga,
          ),

        persentase_dp,

        total_dp:
          Math.round(
            totalDp,
          ),

        sisa_pelunasan:
          Math.round(
            sisaPelunasan,
          ),

        /*
         * Explicitly set default CO
         * menjadi belum.
         */
        sudah_co:
          false,
      })
      .select(`
        *,
        member:members (
          id,
          name,
          phone,
          type
        )
      `)
      .single();

  if (error) {
    throw new Error(
      `Gagal membuat rekapan: ${error.message}`,
    );
  }

  return data as Recap;
}

/* =========================================
   CREATE MULTIPLE RECAPS
========================================= */

/**
 * Membuat rekapan untuk banyak member
 * dari satu form.
 *
 * Contoh:
 *
 * memberIds:
 * [
 *   "member-1",
 *   "member-2",
 *   "member-3"
 * ]
 *
 * Akan dibuat 3 record.
 */
export async function createRecaps(
  input: {
    batch_id: string;

    member_ids: string[];

    detail_barang: string;

    qty: number;

    harga_barang: number;

    persentase_dp: number;
  },
): Promise<Recap[]> {
  const {
    batch_id,
    member_ids,
    detail_barang,
    qty,
    harga_barang,
    persentase_dp,
  } = input;

  /* -------------------------------------
     VALIDATION
  ------------------------------------- */

  if (!batch_id.trim()) {
    throw new Error(
      "ID batch wajib diisi.",
    );
  }

  if (
    !Array.isArray(
      member_ids,
    ) ||
    member_ids.length ===
      0
  ) {
    throw new Error(
      "Minimal pilih satu pembeli.",
    );
  }

  if (
    !detail_barang.trim()
  ) {
    throw new Error(
      "Detail barang wajib diisi.",
    );
  }

  if (
    !Number.isInteger(
      qty,
    ) ||
    qty <= 0
  ) {
    throw new Error(
      "Qty harus lebih besar dari 0.",
    );
  }

  if (
    !Number.isFinite(
      harga_barang,
    ) ||
    harga_barang < 0
  ) {
    throw new Error(
      "Harga barang tidak valid.",
    );
  }

  if (
    !Number.isFinite(
      persentase_dp,
    ) ||
    persentase_dp < 0 ||
    persentase_dp > 100
  ) {
    throw new Error(
      "Persentase DP harus antara 0 sampai 100.",
    );
  }

  /* -------------------------------------
     CHECK BATCH
  ------------------------------------- */

  const {
    data: batch,
    error: batchError,
  } =
    await supabase
      .from("batches")
      .select("id")
      .eq(
        "id",
        batch_id,
      )
      .maybeSingle();

  if (batchError) {
    throw new Error(
      `Gagal memeriksa batch: ${batchError.message}`,
    );
  }

  if (!batch) {
    throw new Error(
      "Batch tidak ditemukan.",
    );
  }

  /* -------------------------------------
     REMOVE DUPLICATE MEMBER IDS
  ------------------------------------- */

  const uniqueMemberIds =
    [
      ...new Set(
        member_ids,
      ),
    ];

  /* -------------------------------------
     CHECK MEMBERS
  ------------------------------------- */

  const {
    data: members,
    error: membersError,
  } =
    await supabase
      .from("members")
      .select("id")
      .in(
        "id",
        uniqueMemberIds,
      );

  if (membersError) {
    throw new Error(
      `Gagal memeriksa member: ${membersError.message}`,
    );
  }

  const existingMemberIds =
    new Set(
      (
        members ??
        []
      ).map(
        (member) =>
          member.id,
      ),
    );

  const invalidMember =
    uniqueMemberIds.find(
      (memberId) =>
        !existingMemberIds.has(
          memberId,
        ),
    );

  if (invalidMember) {
    throw new Error(
      "Salah satu member tidak ditemukan.",
    );
  }

  /* -------------------------------------
     CALCULATE
  ------------------------------------- */

  const totalHarga =
    qty *
    harga_barang;

  const totalDp =
    totalHarga *
    (persentase_dp / 100);

  const sisaPelunasan =
    totalHarga -
    totalDp;

  /* -------------------------------------
     PREPARE RECORDS
  ------------------------------------- */

  const records =
    uniqueMemberIds.map(
      (memberId) => ({
        batch_id,

        member_id:
          memberId,

        detail_barang:
          detail_barang.trim(),

        qty,

        harga_barang:
          Math.round(
            harga_barang,
          ),

        total_harga:
          Math.round(
            totalHarga,
          ),

        persentase_dp,

        total_dp:
          Math.round(
            totalDp,
          ),

        sisa_pelunasan:
          Math.round(
            sisaPelunasan,
          ),

        /*
         * Semua recap baru
         * dimulai dari Belum CO.
         */
        sudah_co:
          false,
      }),
    );

  /* -------------------------------------
     INSERT
  ------------------------------------- */

  const {
    data,
    error,
  } =
    await supabase
      .from("recaps")
      .insert(
        records,
      )
      .select(`
        *,
        member:members (
          id,
          name,
          phone,
          type
        )
      `);

  if (error) {
    throw new Error(
      `Gagal membuat rekapan: ${error.message}`,
    );
  }

  return (
    (data ??
      []) as Recap[]
  );
}

/* =========================================
   MARK RECAP AS CO
========================================= */

/**
 * Menandai satu barang/recap
 * sebagai sudah CO.
 *
 * Business rules:
 *
 * 1. Recap harus ada.
 * 2. DP harus paid.
 * 3. Pelunasan harus paid.
 * 4. Jika sudah_co = true,
 *    tidak boleh diproses ulang.
 * 5. Tidak ada operasi true -> false.
 */
export async function markRecapAsCheckedOut(
  id: string,
): Promise<Recap> {
  /* -------------------------------------
     VALIDATE ID
  ------------------------------------- */

  if (!id.trim()) {
    throw new Error(
      "ID rekapan wajib diisi.",
    );
  }

  const recapId =
    id.trim();

  /* -------------------------------------
     GET RECAP
  ------------------------------------- */

  const {
    data: recap,
    error: recapError,
  } =
    await supabase
      .from("recaps")
      .select(`
        id,
        batch_id,
        member_id,
        detail_barang,
        qty,
        harga_barang,
        total_harga,
        persentase_dp,
        total_dp,
        sisa_pelunasan,
        sudah_co,
        created_at,
        updated_at,

        member:members (
          id,
          name,
          phone,
          type
        )
      `)
      .eq(
        "id",
        recapId,
      )
      .single();

  if (
    recapError ||
    !recap
  ) {
    console.error(
      "markRecapAsCheckedOut recap error:",
      recapError,
    );

    throw new Error(
      "Rekapan tidak ditemukan.",
    );
  }

  /* -------------------------------------
     PREVENT DOUBLE CO
  ------------------------------------- */

  if (
    recap.sudah_co ===
    true
  ) {
    throw new Error(
      "Barang ini sudah ditandai sebagai Sudah CO.",
    );
  }

  /* -------------------------------------
     GET PAYMENTS
  ------------------------------------- */

  const {
    data: payments,
    error: paymentError,
  } =
    await supabase
      .from("payments")
      .select(`
        payment_type,
        status
      `)
      .eq(
        "recap_id",
        recapId,
      );

  if (paymentError) {
    console.error(
      "markRecapAsCheckedOut payment error:",
      paymentError,
    );

    throw new Error(
      `Gagal memeriksa status pembayaran: ${paymentError.message}`,
    );
  }

  /* -------------------------------------
     CHECK FULL PAYMENT
  ------------------------------------- */

  const fullyPaid =
    isRecapFullyPaid(
      payments ?? [],
    );

  if (!fullyPaid) {
    const dpPaid =
      isPaymentPaid(
        payments ?? [],
        "DP",
      );

    const pelunasanPaid =
      isPaymentPaid(
        payments ?? [],
        "PELUNASAN",
      );

    if (!dpPaid) {
      throw new Error(
        "Barang belum dapat ditandai CO karena DP belum dibayar.",
      );
    }

    if (!pelunasanPaid) {
      throw new Error(
        "Barang belum dapat ditandai CO karena Pelunasan belum dibayar.",
      );
    }

    throw new Error(
      "Barang belum dapat ditandai CO karena pembayaran belum lunas.",
    );
  }

  /* -------------------------------------
     UPDATE
  ------------------------------------- */

  const {
    data: updatedRecap,
    error: updateError,
  } =
    await supabase
      .from("recaps")
      .update({
        sudah_co:
          true,
      })
      .eq(
        "id",
        recapId,
      )
      .eq(
        "sudah_co",
        false,
      )
      .select(`
        *,
        member:members (
          id,
          name,
          phone,
          type
        )
      `)
      .single();

  if (
    updateError ||
    !updatedRecap
  ) {
    console.error(
      "markRecapAsCheckedOut update error:",
      updateError,
    );

    throw new Error(
      `Gagal menandai barang sebagai Sudah CO: ${
        updateError?.message ??
        "Data tidak berhasil diperbarui."
      }`,
    );
  }

  return updatedRecap as Recap;
}

/* =========================================
   DELETE RECAP
========================================= */

/**
 * Menghapus satu rekapan.
 */
export async function deleteRecap(
  id: string,
): Promise<void> {
  if (!id.trim()) {
    throw new Error(
      "ID rekapan wajib diisi.",
    );
  }

  /* -------------------------------------
     CHECK RECAP
  ------------------------------------- */

  const {
    data: recap,
    error: findError,
  } =
    await supabase
      .from("recaps")
      .select(`
        id,
        sudah_co
      `)
      .eq(
        "id",
        id,
      )
      .maybeSingle();

  if (findError) {
    throw new Error(
      `Gagal mencari rekapan: ${findError.message}`,
    );
  }

  if (!recap) {
    throw new Error(
      "Rekapan tidak ditemukan.",
    );
  }

  /* -------------------------------------
     DELETE
  ------------------------------------- */

  const { error } =
    await supabase
      .from("recaps")
      .delete()
      .eq(
        "id",
        id,
      );

  if (error) {
    throw new Error(
      `Gagal menghapus rekapan: ${error.message}`,
    );
  }
}