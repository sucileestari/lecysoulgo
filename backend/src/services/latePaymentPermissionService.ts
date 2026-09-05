import { supabase } from "../config/supabase.js";

/* =========================================
   TYPES
========================================= */

export type LatePaymentStatus =
  | "unpaid"
  | "paid";

export type LatePaymentType =
  | "DP"
  | "PELUNASAN";

/* =========================================
   PERMISSION ITEM
========================================= */

export type LatePaymentPermissionItem = {
  id: string;

  permission_id: string;

  recap_id: string;

  payment_type: LatePaymentType;

  created_at: string;

  recap:
    | {
        id: string;

        detail_barang: string;

        member_id: string;
      }
    | null;
};

/* =========================================
   PERMISSION
========================================= */

export type LatePaymentPermission = {
  id: string;

  member_id: string;

  reason: string;

  payment_date: string;

  payment_status: LatePaymentStatus;

  paid_at: string | null;

  created_at: string;

  updated_at: string;

  member:
    | {
        id: string;

        name: string;

        phone: string;
      }
    | null;

  items: LatePaymentPermissionItem[];
};

/* =========================================
   RECAP OPTION
========================================= */

export type LatePaymentRecapOption = {
  recap_id: string;

  member_id: string;

  member_name: string;

  detail_barang: string;

  payment_type: LatePaymentType;

  reference_date: string;

  max_payment_date: string;

  batch_id: string;
};

/* =========================================
   RECAP OPTIONS RESPONSE
========================================= */

export type LatePaymentRecapOptionsResponse = {
  members: {
    id: string;

    name: string;

    phone: string;
  }[];

  items: LatePaymentRecapOption[];
};

/* =========================================
   CREATE INPUT
========================================= */

export type CreateLatePaymentPermissionInput = {
  member_id: string;

  items: {
    recap_id: string;

    payment_type: LatePaymentType;
  }[];

  reason: string;

  payment_date: string;
};

/* =========================================
   DATE HELPERS
========================================= */

/**
 * Parse YYYY-MM-DD menjadi Date lokal.
 */
function parseDateOnly(
  value: string,
): Date {
  return new Date(
    `${value}T00:00:00`,
  );
}

/**
 * Format Date menjadi YYYY-MM-DD.
 */
function formatDateOnly(
  date: Date,
): string {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      "0",
    );

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      "0",
    );

  return `${year}-${month}-${day}`;
}

/**
 * Ambil tanggal hari ini
 * dalam timezone lokal server.
 */
function getTodayDateOnly(): Date {
  const now =
    new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
}

/**
 * Tambah sejumlah hari.
 */
function addDays(
  date: Date,
  amount: number,
): Date {
  const result =
    new Date(date);

  result.setDate(
    result.getDate() +
      amount,
  );

  return result;
}

/**
 * Reference date wajib minimal
 * 2 hari dari hari ini.
 *
 * Contoh:
 *
 * Hari ini 29 Agustus
 * reference 31 Agustus
 * => VALID
 *
 * Hari ini 30 Agustus
 * reference 31 Agustus
 * => TIDAK VALID
 */
function isEligibleReferenceDate(
  referenceDate: string,
): boolean {
  const today =
    getTodayDateOnly();

  const reference =
    parseDateOnly(
      referenceDate,
    );

  const minimumReferenceDate =
    addDays(
      today,
      2,
    );

  return (
    reference >=
    minimumReferenceDate
  );
}

/**
 * Menentukan status pembayaran
 * untuk tipe pembayaran tertentu.
 *
 * Jika ada payment type yang statusnya paid,
 * dianggap sudah paid.
 */
function getPaymentStatus(
  payments: Array<{
    payment_type:
      | string
      | null;

    status:
      | string
      | null;
  }>,
  paymentType: LatePaymentType,
): LatePaymentStatus {
  const normalizedPaymentType =
    paymentType.toUpperCase();

  const paidPayment =
    payments.find(
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

  return paidPayment
    ? "paid"
    : "unpaid";
}

/* =========================================
   GET ALL PERMISSIONS
========================================= */

export async function getLatePaymentPermissions() {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "late_payment_permissions",
      )
      .select(`
        id,
        member_id,
        reason,
        payment_date,
        payment_status,
        paid_at,
        created_at,
        updated_at,

        member:members (
          id,
          name,
          phone
        ),

        items:late_payment_permission_items (
          id,
          permission_id,
          recap_id,
          payment_type,
          created_at,

          recap:recaps (
            id,
            detail_barang,
            member_id
          )
        )
      `)
      .order(
        "created_at",
        {
          ascending: false,
        },
      );

  if (error) {
    console.error(
      "getLatePaymentPermissions error:",
      error,
    );

    throw new Error(
      `Gagal mengambil data ijin telat bayar: ${error.message}`,
    );
  }

  return data ?? [];
}

/* =========================================
   GET RECAP OPTIONS
========================================= */

/**
 * Mengambil data untuk popup Ajukan Ijin.
 *
 * MEMBERS:
 * Semua member yang pernah mempunyai
 * rekapan.
 *
 * ITEMS:
 * Hanya barang yang memenuhi syarat
 * untuk diajukan.
 *
 * =======================================
 * BUSINESS RULE DETAIL BARANG
 * =======================================
 *
 * 1. DP belum paid
 *    -> tampilkan DP saja.
 *
 * 2. DP sudah paid + Pelunasan belum paid
 *    -> tampilkan Pelunasan saja.
 *
 * 3. DP dan Pelunasan sudah paid
 *    -> jangan tampilkan.
 *
 * 4. Reference date minimal H-2.
 *
 * 5. Reference date:
 *
 *    - DP belum paid
 *      => last_payment_dp
 *
 *    - DP sudah paid dan
 *      Pelunasan belum paid
 *      => last_payment_pelunasan
 *
 * 6. Members tidak bergantung
 *    pada eligibility item.
 *
 * Catatan:
 * Member yang sedang memiliki
 * permission unpaid tetap dikembalikan
 * pada daftar members.
 *
 * Frontend berikutnya akan membuat
 * member tersebut disabled.
 */
export async function getLatePaymentRecapOptions(): Promise<LatePaymentRecapOptionsResponse> {
  /* =======================================
     STEP 1
     AMBIL SEMUA RECAP
  ======================================= */

  const {
    data: recapData,
    error: recapError,
  } =
    await supabase
      .from("recaps")
      .select(`
        id,
        member_id,
        batch_id,
        detail_barang,
        created_at
      `)
      .not(
        "member_id",
        "is",
        null,
      )
      .not(
        "batch_id",
        "is",
        null,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      );

  if (recapError) {
    console.error(
      "getLatePaymentRecapOptions recap error:",
      recapError,
    );

    throw new Error(
      `Gagal mengambil data rekapan: ${recapError.message}`,
    );
  }

  const recaps =
    recapData ?? [];

  /* =======================================
     STEP 2
     AMBIL SEMUA MEMBER DARI RECAP
  ======================================= */

  const memberIds =
    Array.from(
      new Set(
        recaps
          .map(
            (recap) =>
              recap.member_id,
          )
          .filter(
            (
              memberId,
            ): memberId is string =>
              Boolean(
                memberId,
              ),
          ),
      ),
    );

  let members: {
    id: string;

    name: string;

    phone: string;
  }[] = [];

  if (
    memberIds.length >
    0
  ) {
    const {
      data: memberData,
      error: memberError,
    } =
      await supabase
        .from("members")
        .select(`
          id,
          name,
          phone
        `)
        .in(
          "id",
          memberIds,
        )
        .order(
          "name",
          {
            ascending: true,
          },
        );

    if (memberError) {
      console.error(
        "getLatePaymentRecapOptions member error:",
        memberError,
      );

      throw new Error(
        `Gagal mengambil data member: ${memberError.message}`,
      );
    }

    members =
      (memberData ??
        []) as {
        id: string;

        name: string;

        phone: string;
      }[];
  }

  /* =======================================
     NO RECAP
  ======================================= */

  if (
    recaps.length ===
    0
  ) {
    return {
      members,
      items: [],
    };
  }

  /* =======================================
     STEP 3
     AMBIL BATCH
  ======================================= */

  const batchIds =
    Array.from(
      new Set(
        recaps
          .map(
            (recap) =>
              recap.batch_id,
          )
          .filter(
            (
              batchId,
            ): batchId is string =>
              Boolean(
                batchId,
              ),
          ),
      ),
    );

  const batchMap =
    new Map<
      string,
      {
        id: string;

        last_payment_dp:
          | string
          | null;

        last_payment_pelunasan:
          | string
          | null;
      }
    >();

  if (
    batchIds.length >
    0
  ) {
    const {
      data: batchData,
      error: batchError,
    } =
      await supabase
        .from("batches")
        .select(`
          id,
          last_payment_dp,
          last_payment_pelunasan
        `)
        .in(
          "id",
          batchIds,
        );

    if (batchError) {
      console.error(
        "getLatePaymentRecapOptions batch error:",
        batchError,
      );

      throw new Error(
        `Gagal mengambil data batch: ${batchError.message}`,
      );
    }

    for (
      const batch of
        batchData ?? []
    ) {
      batchMap.set(
        batch.id,
        {
          id:
            batch.id,

          last_payment_dp:
            batch.last_payment_dp,

          last_payment_pelunasan:
            batch.last_payment_pelunasan,
        },
      );
    }
  }

  /* =======================================
     STEP 4
     AMBIL SEMUA PAYMENT
  ======================================= */

  const recapIds =
    recaps.map(
      (recap) =>
        recap.id,
    );

  const paymentMap =
    new Map<
      string,
      {
        payment_type:
          | string
          | null;

        status:
          | string
          | null;
      }[]
    >();

  const {
    data: paymentData,
    error: paymentError,
  } =
    await supabase
      .from("payments")
      .select(`
        recap_id,
        payment_type,
        status,
        created_at
      `)
      .in(
        "recap_id",
        recapIds,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      );

  if (paymentError) {
    console.error(
      "getLatePaymentRecapOptions payment error:",
      paymentError,
    );

    throw new Error(
      `Gagal mengambil data pembayaran: ${paymentError.message}`,
    );
  }

  for (
    const payment of
      paymentData ?? []
  ) {
    const current =
      paymentMap.get(
        payment.recap_id,
      ) ?? [];

    current.push({
      payment_type:
        payment.payment_type,

      status:
        payment.status,
    });

    paymentMap.set(
      payment.recap_id,
      current,
    );
  }

  /* =======================================
     STEP 5
     MEMBER MAP
  ======================================= */

  const memberMap =
    new Map<
      string,
      {
        name: string;

        phone: string;
      }
    >();

  for (
    const member of members
  ) {
    memberMap.set(
      member.id,
      {
        name:
          member.name,

        phone:
          member.phone,
      },
    );
  }

  /* =======================================
     STEP 6
     BUILD ITEMS
  ======================================= */

  const items: LatePaymentRecapOption[] =
    [];

  for (
    const recap of recaps
  ) {
    /* -------------------------------------
       MEMBER
    ------------------------------------- */

    const member =
      memberMap.get(
        recap.member_id,
      );

    if (!member) {
      continue;
    }

    /* -------------------------------------
       BATCH
    ------------------------------------- */

    const batch =
      batchMap.get(
        recap.batch_id,
      );

    if (!batch) {
      continue;
    }

    /* -------------------------------------
       PAYMENTS
    ------------------------------------- */

    const payments =
      paymentMap.get(
        recap.id,
      ) ?? [];

    /* -------------------------------------
       STATUS
    ------------------------------------- */

    const dpStatus =
      getPaymentStatus(
        payments,
        "DP",
      );

    const pelunasanStatus =
      getPaymentStatus(
        payments,
        "PELUNASAN",
      );

    /* =====================================
       CASE 1
       DP BELUM PAID
    ====================================== */

    if (
      dpStatus ===
      "unpaid"
    ) {
      const referenceDate =
        batch.last_payment_dp;

      if (
        !referenceDate
      ) {
        continue;
      }

      /*
       * Tanggal terakhir wajib
       * minimal H-2 dari hari ini.
       */
      if (
        !isEligibleReferenceDate(
          referenceDate,
        )
      ) {
        continue;
      }

      items.push({
        recap_id:
          recap.id,

        member_id:
          recap.member_id,

        member_name:
          member.name,

        detail_barang:
          recap.detail_barang,

        payment_type:
          "DP",

        reference_date:
          referenceDate,

        max_payment_date:
          formatDateOnly(
            addDays(
              parseDateOnly(
                referenceDate,
              ),
              14,
            ),
          ),

        batch_id:
          batch.id,
      });

      continue;
    }

    /* =====================================
       CASE 2
       DP PAID + PELUNASAN BELUM PAID
    ====================================== */

    if (
      pelunasanStatus ===
      "unpaid"
    ) {
      const referenceDate =
        batch.last_payment_pelunasan;

      if (
        !referenceDate
      ) {
        continue;
      }

      if (
        !isEligibleReferenceDate(
          referenceDate,
        )
      ) {
        continue;
      }

      items.push({
        recap_id:
          recap.id,

        member_id:
          recap.member_id,

        member_name:
          member.name,

        detail_barang:
          recap.detail_barang,

        payment_type:
          "PELUNASAN",

        reference_date:
          referenceDate,

        max_payment_date:
          formatDateOnly(
            addDays(
              parseDateOnly(
                referenceDate,
              ),
              14,
            ),
          ),

        batch_id:
          batch.id,
      });
    }

    /*
     * CASE 3:
     *
     * DP paid
     * Pelunasan paid
     *
     * Tidak dimasukkan.
     */
  }

  /* =======================================
     SORT
  ======================================= */

  items.sort(
    (
      first,
      second,
    ) =>
      first.reference_date.localeCompare(
        second.reference_date,
      ),
  );

  /* =======================================
     RESPONSE
  ======================================= */

  return {
    members,

    items,
  };
}

/* =========================================
   CREATE PERMISSION
========================================= */

export async function createLatePaymentPermission(
  input: CreateLatePaymentPermissionInput,
) {
  /* =======================================
     VALIDATE MEMBER
  ======================================= */

  if (
    !input.member_id?.trim()
  ) {
    throw new Error(
      "ID anggota wajib diisi.",
    );
  }

  /* =======================================
     VALIDATE ITEMS
  ======================================= */

  if (
    !Array.isArray(
      input.items,
    ) ||
    input.items.length ===
      0
  ) {
    throw new Error(
      "Minimal satu barang harus dipilih.",
    );
  }

  /* =======================================
     VALIDATE REASON
  ======================================= */

  if (
    !input.reason?.trim()
  ) {
    throw new Error(
      "Alasan telat wajib diisi.",
    );
  }

  /* =======================================
     VALIDATE DATE
  ======================================= */

  if (
    !input.payment_date?.trim()
  ) {
    throw new Error(
      "Perkiraan tanggal pembayaran wajib diisi.",
    );
  }

  /* =======================================
     DUPLICATE ITEM CHECK
  ======================================= */

  const uniqueItems =
    new Set(
      input.items.map(
        (item) =>
          `${item.recap_id}:${item.payment_type}`,
      ),
    );

  if (
    uniqueItems.size !==
    input.items.length
  ) {
    throw new Error(
      "Barang yang sama tidak boleh dipilih dua kali.",
    );
  }

  /* =======================================
     VALIDATE MEMBER
  ======================================= */

  const {
    data: member,
    error: memberError,
  } =
    await supabase
      .from("members")
      .select(`
        id,
        name,
        phone
      `)
      .eq(
        "id",
        input.member_id,
      )
      .single();

  if (
    memberError ||
    !member
  ) {
    throw new Error(
      "Data anggota tidak ditemukan.",
    );
  }

  /* =======================================
     CHECK EXISTING UNPAID PERMISSION
  ======================================= */

  /*
   * REQUIREMENT:
   *
   * Satu member hanya boleh memiliki
   * satu ijin telat bayar yang masih
   * berstatus unpaid.
   *
   * Jadi meskipun barangnya berbeda,
   * pengajuan baru harus ditolak
   * sampai permission sebelumnya
   * berubah menjadi paid.
   */
  const {
    data:
      existingUnpaidPermission,
    error:
      existingPermissionError,
  } =
    await supabase
      .from(
        "late_payment_permissions",
      )
      .select(
        `
          id
        `,
      )
      .eq(
        "member_id",
        input.member_id,
      )
      .eq(
        "payment_status",
        "unpaid",
      )
      .limit(1)
      .maybeSingle();

  if (
    existingPermissionError
  ) {
    console.error(
      "check existing unpaid permission error:",
      existingPermissionError,
    );

    throw new Error(
      `Gagal mengecek ijin telat bayar sebelumnya: ${existingPermissionError.message}`,
    );
  }

  if (
    existingUnpaidPermission
  ) {
    throw new Error(
      "Member ini masih memiliki ijin telat bayar yang belum diselesaikan. Tandai pembayaran pada ijin sebelumnya sebagai sudah dibayar terlebih dahulu.",
    );
  }

  /* =======================================
     RECAP IDS
  ======================================= */

  const recapIds =
    input.items.map(
      (item) =>
        item.recap_id,
    );

  /* =======================================
     VALIDATE RECAP DATA
  ======================================= */

  const {
    data: recaps,
    error: recapError,
  } =
    await supabase
      .from("recaps")
      .select(`
        id,
        member_id,
        batch_id,
        detail_barang
      `)
      .in(
        "id",
        recapIds,
      );

  if (recapError) {
    console.error(
      "createLatePaymentPermission recap error:",
      recapError,
    );

    throw new Error(
      `Gagal memvalidasi rekapan: ${recapError.message}`,
    );
  }

  if (
    !recaps ||
    recaps.length !==
      input.items.length
  ) {
    throw new Error(
      "Sebagian rekapan yang dipilih tidak ditemukan.",
    );
  }

  /* =======================================
     BATCH IDS
  ======================================= */

  const batchIds =
    Array.from(
      new Set(
        recaps
          .map(
            (recap) =>
              recap.batch_id,
          )
          .filter(
            (
              batchId,
            ): batchId is string =>
              Boolean(
                batchId,
              ),
          ),
      ),
    );

  /* =======================================
     GET BATCH
  ======================================= */

  const {
    data: batches,
    error: batchError,
  } =
    await supabase
      .from("batches")
      .select(`
        id,
        last_payment_dp,
        last_payment_pelunasan
      `)
      .in(
        "id",
        batchIds,
      );

  if (batchError) {
    console.error(
      "createLatePaymentPermission batch error:",
      batchError,
    );

    throw new Error(
      `Gagal memvalidasi batch: ${batchError.message}`,
    );
  }

  const batchMap =
    new Map(
      (
        batches ??
        []
      ).map(
        (batch) => [
          batch.id,
          batch,
        ],
      ),
    );

  /* =======================================
     GET PAYMENTS
  ======================================= */

  const {
    data: payments,
    error: paymentError,
  } =
    await supabase
      .from("payments")
      .select(`
        recap_id,
        payment_type,
        status,
        created_at
      `)
      .in(
        "recap_id",
        recapIds,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      );

  if (paymentError) {
    console.error(
      "createLatePaymentPermission payment error:",
      paymentError,
    );

    throw new Error(
      `Gagal memvalidasi pembayaran: ${paymentError.message}`,
    );
  }

  /* =======================================
     PAYMENT MAP
  ======================================= */

  const paymentMap =
    new Map<
      string,
      {
        payment_type:
          | string
          | null;

        status:
          | string
          | null;
      }[]
    >();

  for (
    const payment of
      payments ?? []
  ) {
    const current =
      paymentMap.get(
        payment.recap_id,
      ) ?? [];

    current.push({
      payment_type:
        payment.payment_type,

      status:
        payment.status,
    });

    paymentMap.set(
      payment.recap_id,
      current,
    );
  }

  /* =======================================
     VALID ITEMS
  ======================================= */

  const validItems: {
    recap_id: string;

    payment_type: LatePaymentType;
  }[] = [];

  const referenceDates: string[] =
    [];

  for (
    const selectedItem of
      input.items
  ) {
    const recap =
      recaps.find(
        (item) =>
          item.id ===
          selectedItem.recap_id,
      );

    if (!recap) {
      throw new Error(
        "Rekapan tidak ditemukan.",
      );
    }

    /* -----------------------------------
       MEMBER HARUS SAMA
    ----------------------------------- */

    if (
      recap.member_id !==
      input.member_id
    ) {
      throw new Error(
        "Semua barang harus milik member yang sama.",
      );
    }

    /* -----------------------------------
       BATCH
    ----------------------------------- */

    const batch =
      batchMap.get(
        recap.batch_id,
      );

    if (!batch) {
      throw new Error(
        `Batch untuk "${recap.detail_barang}" tidak ditemukan.`,
      );
    }

    /* -----------------------------------
       PAYMENTS
    ----------------------------------- */

    const recapPayments =
      paymentMap.get(
        recap.id,
      ) ?? [];

    /* -----------------------------------
       STATUS
    ----------------------------------- */

    const dpStatus =
      getPaymentStatus(
        recapPayments,
        "DP",
      );

    const pelunasanStatus =
      getPaymentStatus(
        recapPayments,
        "PELUNASAN",
      );

    let referenceDate:
      | string
      | null = null;

    /* ===================================
       DP UNPAID
    ==================================== */

    if (
      dpStatus ===
      "unpaid"
    ) {
      /*
       * Karena DP belum dibayar,
       * target harus DP.
       */
      if (
        selectedItem.payment_type !==
        "DP"
      ) {
        throw new Error(
          `Pelunasan untuk "${recap.detail_barang}" belum dapat dipilih karena DP belum dibayar.`,
        );
      }

      referenceDate =
        batch.last_payment_dp;

      if (
        !referenceDate
      ) {
        throw new Error(
          `Tanggal DP terakhir untuk "${recap.detail_barang}" tidak tersedia.`,
        );
      }

      if (
        !isEligibleReferenceDate(
          referenceDate,
        )
      ) {
        throw new Error(
          `Pengajuan untuk "${recap.detail_barang}" sudah melewati batas minimal 2 hari sebelum tanggal pembayaran.`,
        );
      }
    }

    /* ===================================
       DP PAID
       → PELUNASAN
    ==================================== */

    else {
      /*
       * DP sudah dibayar.
       * Target berikutnya = Pelunasan.
       */
      if (
        selectedItem.payment_type !==
        "PELUNASAN"
      ) {
        throw new Error(
          `DP untuk "${recap.detail_barang}" sudah dibayar. Pilih Pelunasan.`,
        );
      }

      if (
        pelunasanStatus ===
        "paid"
      ) {
        throw new Error(
          `Pelunasan untuk "${recap.detail_barang}" sudah dibayar.`,
        );
      }

      referenceDate =
        batch.last_payment_pelunasan;

      if (
        !referenceDate
      ) {
        throw new Error(
          `Tanggal pelunasan terakhir untuk "${recap.detail_barang}" tidak tersedia.`,
        );
      }

      if (
        !isEligibleReferenceDate(
          referenceDate,
        )
      ) {
        throw new Error(
          `Pengajuan untuk "${recap.detail_barang}" sudah melewati batas minimal 2 hari sebelum tanggal pembayaran.`,
        );
      }
    }

    /* -----------------------------------
       SAVE VALID ITEM
    ----------------------------------- */

    validItems.push({
      recap_id:
        selectedItem.recap_id,

      payment_type:
        selectedItem.payment_type,
    });

    if (
      referenceDate
    ) {
      referenceDates.push(
        referenceDate,
      );
    }
  }

  /* =====================================
     EARLIEST REFERENCE DATE
  ====================================== */

  if (
    referenceDates.length ===
    0
  ) {
    throw new Error(
      "Tanggal pembayaran terakhir tidak ditemukan.",
    );
  }

  const earliestReferenceDate =
    referenceDates.reduce(
      (
        earliest,
        current,
      ) =>
        current <
        earliest
          ? current
          : earliest,
    );

  /* =====================================
     PAYMENT DATE RANGE
  ====================================== */

  const earliestDate =
    parseDateOnly(
      earliestReferenceDate,
    );

  /*
   * Minimum:
   * H+1 dari tanggal terakhir
   * paling dekat.
   */
  const minPaymentDate =
    addDays(
      earliestDate,
      1,
    );

  /*
   * Maximum:
   * H+14 dari tanggal terakhir
   * paling dekat.
   */
  const maxPaymentDate =
    addDays(
      earliestDate,
      14,
    );

  const today =
    getTodayDateOnly();

  const selectedPaymentDate =
    parseDateOnly(
      input.payment_date,
    );

  /* =====================================
     PAYMENT DATE VALIDATION
  ====================================== */

  /*
   * Tidak boleh sebelum H+1.
   */
  if (
    selectedPaymentDate <
    minPaymentDate
  ) {
    throw new Error(
      `Perkiraan tanggal pembayaran paling cepat ${formatDateOnly(
        minPaymentDate,
      )}.`,
    );
  }

  /*
   * Tidak boleh lebih dari H+14.
   */
  if (
    selectedPaymentDate >
    maxPaymentDate
  ) {
    throw new Error(
      `Perkiraan tanggal pembayaran maksimal ${formatDateOnly(
        maxPaymentDate,
      )}.`,
    );
  }

  /*
   * Pengaman tambahan agar tanggal
   * tidak berada di masa lalu.
   */
  if (
    selectedPaymentDate <
    today
  ) {
    throw new Error(
      "Perkiraan tanggal pembayaran tidak boleh sebelum hari ini.",
    );
  }

  /* =====================================
     CREATE PARENT
  ====================================== */

  const {
    data: permission,
    error:
      permissionError,
  } =
    await supabase
      .from(
        "late_payment_permissions",
      )
      .insert({
        member_id:
          input.member_id,

        reason:
          input.reason.trim(),

        payment_date:
          input.payment_date.trim(),

        payment_status:
          "unpaid",

        paid_at:
          null,
      })
      .select(`
        id,
        member_id,
        reason,
        payment_date,
        payment_status,
        paid_at,
        created_at,
        updated_at
      `)
      .single();

  if (
    permissionError ||
    !permission
  ) {
    console.error(
      "createLatePaymentPermission error:",
      permissionError,
    );

    throw new Error(
      `Gagal membuat ijin telat bayar: ${
        permissionError?.message ??
        "Unknown error"
      }`,
    );
  }

  /* =====================================
     CREATE ITEMS
  ====================================== */

  const itemsPayload =
    validItems.map(
      (item) => ({
        permission_id:
          permission.id,

        recap_id:
          item.recap_id,

        payment_type:
          item.payment_type,
      }),
    );

  const {
    error: itemError,
  } =
    await supabase
      .from(
        "late_payment_permission_items",
      )
      .insert(
        itemsPayload,
      );

  if (itemError) {
    console.error(
      "createLatePaymentPermission items error:",
      itemError,
    );

    /*
     * Rollback parent jika item
     * gagal dibuat.
     */
    await supabase
      .from(
        "late_payment_permissions",
      )
      .delete()
      .eq(
        "id",
        permission.id,
      );

    throw new Error(
      `Gagal menyimpan detail barang: ${itemError.message}`,
    );
  }

  /* =====================================
     RETURN CREATED DATA
  ====================================== */

  const {
    data: createdPermission,
    error:
      createdPermissionError,
  } =
    await supabase
      .from(
        "late_payment_permissions",
      )
      .select(`
        id,
        member_id,
        reason,
        payment_date,
        payment_status,
        paid_at,
        created_at,
        updated_at,

        member:members (
          id,
          name,
          phone
        ),

        items:late_payment_permission_items (
          id,
          permission_id,
          recap_id,
          payment_type,
          created_at,

          recap:recaps (
            id,
            detail_barang,
            member_id
          )
        )
      `)
      .eq(
        "id",
        permission.id,
      )
      .single();

  if (
    createdPermissionError ||
    !createdPermission
  ) {
    throw new Error(
      "Ijin berhasil dibuat tetapi data detail gagal diambil kembali.",
    );
  }

  return createdPermission;
}

/* =========================================
   SYNC PERMISSION STATUS
========================================= */

/**
 * Menyinkronkan status satu ijin telat bayar
 * berdasarkan status seluruh payment yang
 * tercakup di dalam permission tersebut.
 *
 * RULE:
 *
 * - Semua item/payment sudah paid
 *   -> permission = paid
 *
 * - Masih ada minimal satu item/payment
 *   yang belum paid
 *   -> permission tetap unpaid
 *
 * Tidak ada lagi konsep tombol manual
 * "Tandai Sudah Dibayar" untuk mengubah
 * status permission.
 */
export async function syncLatePaymentPermissionStatus(
  id: string,
) {
  if (!id?.trim()) {
    throw new Error(
      "ID ijin telat bayar wajib diisi.",
    );
  }

  /* -------------------------------------
     GET PERMISSION + ITEMS
  ------------------------------------- */

  const {
    data: permission,
    error: permissionError,
  } =
    await supabase
      .from(
        "late_payment_permissions",
      )
      .select(`
        id,
        member_id,
        reason,
        payment_date,
        payment_status,
        paid_at,
        created_at,
        updated_at,

        items:late_payment_permission_items (
          id,
          permission_id,
          recap_id,
          payment_type,
          created_at
        )
      `)
      .eq(
        "id",
        id.trim(),
      )
      .single();

  if (
    permissionError ||
    !permission
  ) {
    throw new Error(
      "Data ijin telat bayar tidak ditemukan.",
    );
  }

  const items =
    permission.items ?? [];

  /* -------------------------------------
     NO ITEMS
  ------------------------------------- */

  if (
    items.length === 0
  ) {
    return permission;
  }

  /* -------------------------------------
     GET PAYMENTS
  ------------------------------------- */

  const recapIds = Array.from(
    new Set(
      items.map(
        (item) => item.recap_id,
      ),
    ),
  );

  const {
    data: payments,
    error: paymentError,
  } =
    await supabase
      .from("payments")
      .select(`
        recap_id,
        payment_type,
        status
      `)
      .in(
        "recap_id",
        recapIds,
      );

  if (paymentError) {
    console.error(
      "syncLatePaymentPermissionStatus payment error:",
      paymentError,
    );

    throw new Error(
      `Gagal memeriksa status pembayaran: ${paymentError.message}`,
    );
  }

  /* -------------------------------------
     CHECK ALL ITEMS PAID
  ------------------------------------- */

  const allItemsPaid =
    items.every(
      (item) =>
        (payments ?? []).some(
          (payment) =>
            payment.recap_id ===
              item.recap_id &&
            String(
              payment.payment_type ??
                "",
            ).toUpperCase() ===
              String(
                item.payment_type ??
                  "",
              ).toUpperCase() &&
            String(
              payment.status ??
                "",
            ).toLowerCase() ===
              "paid",
        ),
    );

  /* -------------------------------------
     ALREADY PAID
  ------------------------------------- */

  if (
    allItemsPaid &&
    String(
      permission.payment_status ??
        "",
    ).toLowerCase() ===
      "paid"
  ) {
    return permission;
  }

  /* -------------------------------------
     ALL PAID -> UPDATE PERMISSION
  ------------------------------------- */

  if (
    allItemsPaid
  ) {
    const paidAt =
      permission.paid_at ??
      new Date().toISOString();

    const {
      data: updatedPermission,
      error: updateError,
    } =
      await supabase
        .from(
          "late_payment_permissions",
        )
        .update({
          payment_status:
            "paid",

          paid_at:
            paidAt,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          permission.id,
        )
        .eq(
          "payment_status",
          "unpaid",
        )
        .select(`
          id,
          member_id,
          reason,
          payment_date,
          payment_status,
          paid_at,
          created_at,
          updated_at
        `)
        .maybeSingle();

    if (updateError) {
      console.error(
        "syncLatePaymentPermissionStatus update error:",
        updateError,
      );

      throw new Error(
        `Gagal memperbarui status ijin telat bayar: ${updateError.message}`,
      );
    }

    return (
      updatedPermission ??
      permission
    );
  }

  /* -------------------------------------
     STILL UNPAID
  ------------------------------------- */

  return permission;
}

/* =========================================
   SYNC ALL UNPAID PERMISSIONS
========================================= */

/**
 * Menyinkronkan seluruh permission unpaid.
 *
 * Berguna ketika halaman Ijin Telat Bayar
 * dibuka sehingga status otomatis selalu
 * mengikuti status payment terbaru.
 */
export async function syncAllLatePaymentPermissionStatuses() {
  const {
    data: permissions,
    error,
  } =
    await supabase
      .from(
        "late_payment_permissions",
      )
      .select("id")
      .eq(
        "payment_status",
        "unpaid",
      );

  if (error) {
    throw new Error(
      `Gagal mengambil ijin telat bayar: ${error.message}`,
    );
  }

  for (
    const permission of
      permissions ?? []
  ) {
    await syncLatePaymentPermissionStatus(
      permission.id,
    );
  }
}

/* =========================================
   LEGACY MARK-AS-PAID GUARD
========================================= */

/**
 * Dipertahankan hanya untuk kompatibilitas
 * dengan controller/route lama.
 *
 * Function ini TIDAK lagi mengubah status
 * permission secara paksa.
 * Status hanya boleh berubah otomatis
 * setelah seluruh payment terkait sudah paid.
 */
export async function markLatePaymentPermissionAsPaid(
  id: string,
) {
  const permission =
    await syncLatePaymentPermissionStatus(
      id,
    );

  if (
    permission.payment_status !==
    "paid"
  ) {
    throw new Error(
      "Ijin telat bayar belum dapat diselesaikan karena masih ada pembayaran yang belum paid.",
    );
  }

  return permission;
}
