import { supabase } from "../config/supabase.js";

/* =========================================
   TYPES
========================================= */

export type ManualShipmentShippingStatus =
  | "Sedang dikemas"
  | "Dalam proses pick up";

export type ManualShipmentPaymentStatus =
  | "unpaid"
  | "paid";

export type ManualShipmentExpedition =
  | "JNE"
  | "J&T"
  | "Sicepat"
  | "Grab/Gojek Instant";

export type ManualShipmentItem = {
  id: string;

  shipment_id: string;

  recap_id: string;

  created_at: string;

  recap?: {
    id: string;

    batch_id: string;

    member_id: string;

    detail_barang: string;

    qty: number;

    harga_barang: number;

    total_harga: number;

    sudah_co: boolean;

    batch?: {
      id: string;
      name: string;
      country: string;
    } | null;

    member?: {
      id: string;
      name: string;
      phone: string;
      type?: string | null;
    } | null;
  } | null;
};

export type ManualShipment = {
  id: string;

  batch_id: string;

  member_id: string;

  address: string;

  expedition: ManualShipmentExpedition;

  packing_price: number;

  shipping_price: number;

  total_amount: number;

  shipping_status: ManualShipmentShippingStatus;

  due_date: string | null;

  created_at: string;

  updated_at: string;

  member?: {
    id: string;
    name: string;
    phone: string;
    type?: string | null;
  } | null;

  items: ManualShipmentItem[];
};

/* =========================================
   INPUT
========================================= */

export type CreateManualShipmentInput = {
  batch_id: string;

  member_id: string;

  recap_ids: string[];

  address: string;

  expedition: ManualShipmentExpedition;

  packing_price?: number;

  shipping_price?: number;

  due_date?: string | null;

  shipping_status?: ManualShipmentShippingStatus;

  payment_status?: ManualShipmentPaymentStatus;
};

export type UpdateManualShipmentInput =
  Partial<
    Omit<
      CreateManualShipmentInput,
      "batch_id"
    >
  > & {
    due_date?: string | null;
  };

/* =========================================
   OPTIONS
========================================= */

export type ManualShipmentOptions = {
  members: {
    id: string;
    name: string;
    phone: string;
  }[];

  items: {
    recap_id: string;

    member_id: string;

    member_name: string;

    detail_barang: string;

    qty: number;

    reference_date: string;

    pelunasan_due_date: string | null;

    batch_id: string;

    batch_name: string;

    batch_country: string;
  }[];
};

/* =========================================
   HELPERS
========================================= */

const ALLOWED_EXPEDITIONS: ManualShipmentExpedition[] =
  [
    "JNE",
    "J&T",
    "Sicepat",
    "Grab/Gojek Instant",
  ];

const ALLOWED_SHIPPING_STATUSES: ManualShipmentShippingStatus[] =
  [
    "Sedang dikemas",
    "Dalam proses pick up",
  ];

const ELIGIBLE_RECAP_BATCH_STATUS =
  "Sudah sampai di Admin";

const MAX_TIMBUN_DAYS = 60;

type PaymentRecord = {
  recap_id: string;

  payment_type:
    | string
    | null;

  status:
    | string
    | null;

};

function isPaid(
  payment:
    | PaymentRecord
    | undefined,
): boolean {
  return (
    String(
      payment?.status ??
        "",
    ).toLowerCase() ===
    "paid"
  );
}

function recapFullyPaid(
  payments: PaymentRecord[],
): boolean {
  const dpPaid =
    payments.some(
      (payment) =>
        String(
          payment.payment_type ??
            "",
        ).toUpperCase() ===
          "DP" &&
        isPaid(payment),
    );

  const pelunasanPaid =
    payments.some(
      (payment) =>
        String(
          payment.payment_type ??
            "",
        ).toUpperCase() ===
          "PELUNASAN" &&
        isPaid(payment),
    );

  return (
    dpPaid &&
    pelunasanPaid
  );
}

function getMaxTimbunDate(
  pelunasanDueDate: string | null | undefined,
): Date | null {
  if (!pelunasanDueDate) {
    return null;
  }

  const date = new Date(
    `${pelunasanDueDate}T00:00:00`,
  );

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setDate(
    date.getDate() +
      MAX_TIMBUN_DAYS,
  );

  return date;
}

function isPastMaxTimbun(
  pelunasanDueDate: string | null | undefined,
): boolean {
  const maxTimbunDate =
    getMaxTimbunDate(
      pelunasanDueDate,
    );

  if (!maxTimbunDate) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    today.getTime() >
    maxTimbunDate.getTime()
  );
}

function validateCommonInput(
  input: {
    member_id: string;
    address: string;
    expedition: ManualShipmentExpedition;
    packing_price: number;
    shipping_price: number;
  },
) {
  if (
    !input.member_id.trim()
  ) {
    throw new Error(
      "ID member wajib diisi.",
    );
  }

  if (
    !input.address.trim()
  ) {
    throw new Error(
      "Alamat lengkap wajib diisi.",
    );
  }

  if (
    !ALLOWED_EXPEDITIONS.includes(
      input.expedition,
    )
  ) {
    throw new Error(
      "Ekspedisi tidak valid.",
    );
  }

  if (
    !Number.isFinite(
      input.packing_price,
    ) ||
    input.packing_price <
      0
  ) {
    throw new Error(
      "Harga packing tidak valid.",
    );
  }

  if (
    !Number.isFinite(
      input.shipping_price,
    ) ||
    input.shipping_price <
      0
  ) {
    throw new Error(
      "Harga ongkos kirim tidak valid.",
    );
  }
}

function validateRecapIds(
  recapIds: string[],
) {
  if (
    !Array.isArray(
      recapIds,
    ) ||
    recapIds.length === 0
  ) {
    throw new Error(
      "Minimal satu barang harus dipilih.",
    );
  }

  const normalizedIds =
    recapIds
      .filter(
        (
          recapId,
        ) =>
          typeof recapId ===
            "string" &&
          recapId.trim(),
      )
      .map(
        (recapId) =>
          recapId.trim(),
      );

  if (
    normalizedIds.length !==
    recapIds.length
  ) {
    throw new Error(
      "ID barang tidak valid.",
    );
  }

  return [
    ...new Set(
      normalizedIds,
    ),
  ];
}

/* =========================================
   CHECK BATCH
========================================= */

async function ensureBatchExists(
  batchId: string,
) {
  const {
    data,
    error,
  } =
    await supabase
      .from("manual_shipping_batches")
      .select("id")
      .eq(
        "id",
        batchId.trim(),
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      `Gagal memeriksa batch: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "Batch tidak ditemukan.",
    );
  }
}

/* =========================================
   CHECK MEMBER
========================================= */

async function ensureMemberExists(
  memberId: string,
) {
  const {
    data,
    error,
  } =
    await supabase
      .from("members")
      .select(
        "id, name, phone",
      )
      .eq(
        "id",
        memberId.trim(),
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      `Gagal memeriksa member: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "Member tidak ditemukan.",
    );
  }

  return data;
}

/* =========================================
   GET RECAPS WITH PAYMENT STATUS
========================================= */

async function getRecapsForShipment(
  recapIds: string[],
) {
  const {
    data: recaps,
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
        sudah_co,
        created_at,
        member:members (
          id,
          name,
          phone,
          type
        )
      `)
      .in(
        "id",
        recapIds,
      );

  if (recapError) {
    throw new Error(
      `Gagal mengambil data barang: ${recapError.message}`,
    );
  }

  if (
    !recaps ||
    recaps.length !==
      recapIds.length
  ) {
    throw new Error(
      "Salah satu barang tidak ditemukan.",
    );
  }

  const {
    data: payments,
    error: paymentError,
  } =
    await supabase
      .from("payments")
      .select(
        "recap_id, payment_type, status",
      )
      .in(
        "recap_id",
        recapIds,
      );

  if (paymentError) {
    throw new Error(
      `Gagal memeriksa status pembayaran: ${paymentError.message}`,
    );
  }

  const paymentsByRecap =
    new Map<
      string,
      PaymentRecord[]
    >();

  for (
    const payment of
      payments ??
    []
  ) {
    const current =
      paymentsByRecap.get(
        payment.recap_id,
      ) ?? [];

    current.push(
      payment as PaymentRecord,
    );

    paymentsByRecap.set(
      payment.recap_id,
      current,
    );
  }

  return {
    recaps,
    paymentsByRecap,
  };
}

async function ensureRecapsAvailableForShipment(
  recapIds: string[],
  memberId: string,
  currentShipmentId?: string,
  enforceShipmentItemEligibility = true,
) {
  const {
    recaps,
    paymentsByRecap,
  } =
    await getRecapsForShipment(
      recapIds,
    );

  if (enforceShipmentItemEligibility) {
    const recapBatchIds =
      Array.from(
        new Set(
          recaps
            .map(
              (recap) =>
                recap.batch_id,
            )
            .filter(
              (batchId): batchId is string =>
                Boolean(batchId?.trim()),
            ),
        ),
      );

    const {
      data: batchData,
      error: batchError,
    } = await supabase
      .from("batches")
      .select("id, status, last_payment_pelunasan")
      .in("id", recapBatchIds);

    if (batchError) {
      throw new Error(
        `Gagal memeriksa status batch: ${batchError.message}`,
      );
    }

    const batchInfoMap =
      new Map(
        (batchData ?? []).map(
          (batch) => [
            batch.id,
            {
              status: batch.status,
              last_payment_pelunasan:
                batch.last_payment_pelunasan ??
                null,
            },
          ],
        ),
      );

    const {
      data: usedManualItems,
      error: usedManualItemsError,
    } = await supabase
      .from("manual_shipment_items")
      .select("recap_id, shipment_id")
      .in("recap_id", recapIds);

    if (usedManualItemsError) {
      throw new Error(
        `Gagal memeriksa riwayat pengiriman: ${usedManualItemsError.message}`,
      );
    }

    const usedByOtherShipmentIds =
      new Set(
        (usedManualItems ?? [])
          .filter(
            (item) =>
              item.shipment_id !==
              currentShipmentId,
          )
          .map(
            (item) =>
              item.recap_id,
          ),
      );

    /* -----------------------------------------
       CEK BARANG YANG SUDAH MASUK MARKETPLACE
    ----------------------------------------- */

    const {
      data: usedMarketplaceItems,
      error: usedMarketplaceItemsError,
    } = await supabase
      .from("marketplace_order_items")
      .select("recap_id")
      .in("recap_id", recapIds);

    if (usedMarketplaceItemsError) {
      throw new Error(
        `Gagal memeriksa pesanan Marketplace: ${usedMarketplaceItemsError.message}`,
      );
    }

    const usedMarketplaceRecapIds =
      new Set(
        (usedMarketplaceItems ?? []).map(
          (item) =>
            item.recap_id,
        ),
      );

    for (const recap of recaps) {
      const batchInfo =
        batchInfoMap.get(
          recap.batch_id,
        );

      if (
        batchInfo?.status !==
        ELIGIBLE_RECAP_BATCH_STATUS
      ) {
        throw new Error(
          `Barang "${recap.detail_barang}" belum sampai di Admin.`,
        );
      }

      if (
        usedByOtherShipmentIds.has(
          recap.id,
        )
      ) {
        throw new Error(
          `Barang "${recap.detail_barang}" sudah pernah dimasukkan ke Pengiriman Manual.`,
        );
      }

      if (
        usedMarketplaceRecapIds.has(
          recap.id,
        )
      ) {
        throw new Error(
          `Barang "${recap.detail_barang}" sudah digunakan pada Pesanan Marketplace.`,
        );
      }

      if (
        isPastMaxTimbun(
          batchInfo?.last_payment_pelunasan,
        )
      ) {
        throw new Error(
          `Barang "${recap.detail_barang}" sudah melewati masa timbun dan tidak dapat dimasukkan ke pengiriman.`,
        );
      }
    }
  }

  for (const recap of recaps) {
    if (
      recap.member_id !==
      memberId
    ) {
      throw new Error(
        "Barang yang dipilih harus milik pembeli yang sama.",
      );
    }

    if (
      !recapFullyPaid(
        paymentsByRecap.get(
          recap.id,
        ) ?? [],
      )
    ) {
      throw new Error(
        `Barang "${recap.detail_barang}" belum lunas.`,
      );
    }

    /*
     * Pengiriman hanya dapat dibuat
     * untuk barang yang BELUM CO.
     *
     * Belum CO = false.
     * Sudah CO = true.
     */
    if (
      recap.sudah_co !==
      false
    ) {
      throw new Error(
        `Barang "${recap.detail_barang}" sudah ditandai sebagai Sudah CO dan tidak dapat dimasukkan ke pengiriman.`,
      );
    }
  }

  return recaps;
}

/* =========================================
   BUILD TOTAL
========================================= */

function calculateTotalPrice(
  packingPrice: number,
  shippingPrice: number,
) {
  return Math.round(
    packingPrice +
      shippingPrice,
  );
}

/* =========================================
   GET SHIPMENTS BY BATCH
========================================= */

export async function getManualShipmentsByBatch(
  batchId: string,
): Promise<ManualShipment[]> {
  if (!batchId.trim()) {
    throw new Error(
      "ID batch wajib diisi.",
    );
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "manual_shipments",
      )
      .select(`
        *,
        member:members (
          id,
          name,
          phone,
          type
        ),
        items:manual_shipment_items (
          id,
          shipment_id,
          recap_id,
          created_at,
          recap:recaps (
            id,
            batch_id,
            member_id,
            detail_barang,
            qty,
            harga_barang,
            total_harga,
            sudah_co,
            created_at,
            member:members (
              id,
              name,
              phone
            )
          )
        )
      `)
      .eq(
        "batch_id",
        batchId.trim(),
      )
      .order(
        "created_at",
        {
          ascending: true,
        },
      );

  if (error) {
    throw new Error(
      `Gagal mengambil data pengiriman: ${error.message}`,
    );
  }

  const normalizedShipments =
    (
      (data ??
        []) as Array<
          Omit<
            ManualShipment,
            "total_price"
          > & {
            total_amount?: number;
            total_price?: number;
          }
        >
    ).map(
      normalizeShipmentResponse,
    );

  return attachRecapBatchInfo(
    normalizedShipments,
  );
}

/* =========================================
   GET SHIPMENT BY ID
========================================= */

function normalizeShipmentResponse(
  shipment: Omit<
    ManualShipment,
    "total_price"
  > & {
    total_amount?: number;
    total_price?: number;
  },
): ManualShipment {
  const totalAmount =
    Number(
      shipment.total_amount ??
        shipment.total_price ??
        0,
    );

  return {
    ...shipment,
    total_price:
      Number.isFinite(totalAmount)
        ? totalAmount
        : 0,
  } as ManualShipment;
}

async function attachRecapBatchInfo(
  shipments: ManualShipment[],
): Promise<ManualShipment[]> {
  const recapBatchIds =
    Array.from(
      new Set(
        shipments
          .flatMap(
            (shipment) =>
              shipment.items?.map(
                (item) =>
                  item.recap?.batch_id ??
                  null,
              ) ?? [],
          )
          .map(
            (batchId) =>
              batchId?.trim() ??
              null,
          )
          .filter(
            (
              batchId,
            ): batchId is string =>
              Boolean(batchId),
          ),
      ),
    );

  if (
    recapBatchIds.length ===
    0
  ) {
    return shipments;
  }

  const {
    data: batchData,
    error: batchError,
  } =
    await supabase
      .from("batches")
      .select(
        "id, name, country",
      )
      .in(
        "id",
        recapBatchIds,
      );

  if (batchError) {
    throw new Error(
      `Gagal mengambil nama Batch Rekapan: ${batchError.message}`,
    );
  }

  const batchMap =
    new Map<
      string,
      {
        id: string;
        name: string;
        country: string;
      }
    >();

  for (
    const batch of
      batchData ?? []
  ) {
    const batchId =
      String(batch.id).trim();

    batchMap.set(
      batchId,
      {
        id: batchId,
        name: batch.name,
        country: batch.country,
      },
    );
  }

  return shipments.map(
    (shipment) => ({
      ...shipment,
      items:
        shipment.items?.map(
          (item) => {
            const batchId =
              item.recap?.batch_id
                ?.trim();

            const batch =
              batchId
                ? batchMap.get(
                    batchId,
                  )
                : undefined;

            return {
              ...item,
              recap: item.recap
                ? {
                    ...item.recap,
                    batch:
                      batch ??
                      null,
                  }
                : null,
            };
          },
        ) ?? [],
    }),
  );
}

export async function getManualShipmentById(
  id: string,
): Promise<ManualShipment> {
  if (!id.trim()) {
    throw new Error(
      "ID pengiriman wajib diisi.",
    );
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "manual_shipments",
      )
      .select(`
        *,
        member:members (
          id,
          name,
          phone,
          type
        ),
        items:manual_shipment_items (
          id,
          shipment_id,
          recap_id,
          created_at,
          recap:recaps (
            id,
            batch_id,
            member_id,
            detail_barang,
            qty,
            harga_barang,
            total_harga,
            sudah_co,
            created_at,
            member:members (
              id,
              name,
              phone
            )
          )
        )
      `)
      .eq(
        "id",
        id.trim(),
      )
      .single();

  if (error || !data) {
    throw new Error(
      "Data pengiriman tidak ditemukan.",
    );
  }

  const normalizedShipment =
    normalizeShipmentResponse(
      data as Omit<
        ManualShipment,
        "total_price"
      > & {
        total_amount?: number;
        total_price?: number;
      },
    );

  const [
    shipmentWithBatch,
  ] =
    await attachRecapBatchInfo([
      normalizedShipment,
    ]);

  return shipmentWithBatch;
}

/* =========================================
   GET OPTIONS FOR ADD SHIPMENT
========================================= */

export async function getManualShipmentOptions(
  _manualShippingBatchId?: string,
): Promise<ManualShipmentOptions> {
  /* =======================================
     STEP 1
     AMBIL SEMUA RECAP
  ======================================== */

  const recapQuery =
    supabase
      .from("recaps")
      .select(`
        id,
        batch_id,
        member_id,
        detail_barang,
        qty,
        created_at,
        sudah_co
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

  const {
    data: recaps,
    error: recapError,
  } = await recapQuery;

  if (recapError) {
    throw new Error(
      `Gagal mengambil pilihan barang: ${recapError.message}`,
    );
  }

  const recapRows =
    recaps ?? [];

  /* =======================================
     STEP 2
     AMBIL MEMBER YANG PERNAH BELI

     Sama seperti Ijin Telat Bayar:
     member berasal dari recap yang
     memiliki member_id.
  ======================================== */

  const memberIds =
    Array.from(
      new Set(
        recapRows
          .map(
            (recap) =>
              recap.member_id,
          )
          .filter(
            (
              memberId,
            ): memberId is string =>
              Boolean(
                memberId?.trim(),
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
      throw new Error(
        `Gagal mengambil data member: ${memberError.message}`,
      );
    }

    members =
      memberData ?? [];
  }

  /* =======================================
     STEP 3
     KALAU TIDAK ADA RECAP
  ======================================== */

  if (
    recapRows.length ===
    0
  ) {
    return {
      members,
      items: [],
    };
  }

  /* =======================================
     STEP 4
     AMBIL STATUS PEMBAYARAN
  ======================================== */

  const recapIds =
    recapRows.map(
      (recap) =>
        recap.id,
    );

  const {
    data: payments,
    error: paymentError,
  } =
    await supabase
      .from("payments")
      .select(
        "recap_id, payment_type, status",
      )
      .in(
        "recap_id",
        recapIds,
      );

  if (paymentError) {
    throw new Error(
      `Gagal mengambil status pembayaran: ${paymentError.message}`,
    );
  }

  const paymentsByRecap =
    new Map<
      string,
      PaymentRecord[]
    >();

  for (
    const payment of
      payments ??
    []
  ) {
    const current =
      paymentsByRecap.get(
        payment.recap_id,
      ) ?? [];

    current.push(
      payment as PaymentRecord,
    );

    paymentsByRecap.set(
      payment.recap_id,
      current,
    );
  }

  /* =======================================
     STEP 5
     AMBIL STATUS BATCH REKAP
  ======================================== */

  const recapBatchIds =
    Array.from(
      new Set(
        recapRows
          .map(
            (recap) =>
              recap.batch_id,
          )
          .filter(
            (
              batchId,
            ): batchId is string =>
              Boolean(
                batchId?.trim(),
              ),
          ),
      ),
    );

  const {
    data: batchData,
    error: batchError,
  } = await supabase
    .from("batches")
    .select(
      "id, name, country, status, last_payment_pelunasan",
    )
    .in(
      "id",
      recapBatchIds,
    );

  if (batchError) {
    throw new Error(
      `Gagal mengambil status batch: ${batchError.message}`,
    );
  }

  const batchInfoMap =
    new Map<
      string,
      {
        name: string;
        country: string;
        status: string;
        last_payment_pelunasan: string | null;
      }
    >();

  for (
    const batch of
      batchData ??
    []
  ) {
    batchInfoMap.set(
      batch.id,
      {
        name: batch.name,
        country: batch.country,
        status: batch.status,
        last_payment_pelunasan:
          batch.last_payment_pelunasan ??
          null,
      },
    );
  }

  /* =======================================
     STEP 6
     AMBIL BARANG YANG SUDAH PERNAH
     MASUK PENGIRIMAN MANUAL
  ======================================== */

  const {
    data: usedManualItems,
    error: usedManualItemsError,
  } = await supabase
    .from("manual_shipment_items")
    .select("recap_id")
    .in(
      "recap_id",
      recapIds,
    );

  if (usedManualItemsError) {
    throw new Error(
      `Gagal memeriksa riwayat pengiriman: ${usedManualItemsError.message}`,
    );
  }

  const usedManualRecapIds =
    new Set(
      (usedManualItems ?? [])
        .map(
          (item) =>
            item.recap_id,
        ),
    );

  /* =======================================
     STEP 6B
     AMBIL BARANG YANG SUDAH PERNAH
     MASUK PESANAN MARKETPLACE
  ======================================== */

  const {
    data: usedMarketplaceItems,
    error: usedMarketplaceItemsError,
  } = await supabase
    .from("marketplace_order_items")
    .select("recap_id")
    .in(
      "recap_id",
      recapIds,
    );

  if (usedMarketplaceItemsError) {
    throw new Error(
      `Gagal memeriksa pesanan Marketplace: ${usedMarketplaceItemsError.message}`,
    );
  }

  const usedMarketplaceRecapIds =
    new Set(
      (usedMarketplaceItems ?? [])
        .map(
          (item) =>
            item.recap_id,
        ),
    );

  /* =======================================
     STEP 7
     BARANG YANG BOLEH DIPILIH

     Syarat:
     - DP sudah paid
     - Pelunasan sudah paid
     - BELUM CO
     - batch "Sudah sampai di Admin"
     - belum pernah masuk shipment manual
     - belum pernah masuk pesanan Marketplace

     Maksimal timbun TIDAK dipakai
     untuk menghilangkan item dari response.
     Item yang sudah lewat tetap dikirim ke FE
     agar ditampilkan sebagai disabled.
  ======================================== */

  const eligibleRecaps =
    recapRows.filter(
      (recap) => {
        const batchInfo =
          batchInfoMap.get(
            recap.batch_id,
          );

        if (
          batchInfo?.status !==
          ELIGIBLE_RECAP_BATCH_STATUS
        ) {
          return false;
        }

        if (
          usedManualRecapIds.has(
            recap.id,
          )
        ) {
          return false;
        }

        if (
          usedMarketplaceRecapIds.has(
            recap.id,
          )
        ) {
          return false;
        }

        const recapPayments =
          paymentsByRecap.get(
            recap.id,
          ) ?? [];

        const dpPaid =
          recapPayments.some(
            (payment) =>
              String(
                payment.payment_type ??
                  "",
              ).toUpperCase() ===
                "DP" &&
              String(
                payment.status ??
                  "",
              ).toLowerCase() ===
                "paid",
          );

        const pelunasanPaid =
          recapPayments.some(
            (payment) =>
              String(
                payment.payment_type ??
                  "",
              ).toUpperCase() ===
                "PELUNASAN" &&
              String(
                payment.status ??
                  "",
              ).toLowerCase() ===
                "paid",
          );

        const belumCO =
          recap.sudah_co ===
          false;

        return (
          dpPaid &&
          pelunasanPaid &&
          belumCO
        );
      },
    );

  /* =======================================
     FINAL RESPONSE
  ======================================== */

  const memberMap =
    new Map(
      members.map(
        (member) => [
          member.id,
          member,
        ],
      ),
    );

  return {
    /*
     * Nama Pembeli:
     * hanya member yang pernah membeli
     * / memiliki recap.
     *
     * Tidak dipengaruhi status:
     * - pembayaran
     * - CO
     * - shipment
     */
    members,

    /*
     * Detail Barang:
     * hanya barang yang memenuhi
     * kriteria Pengiriman Manual.
     */
    items:
      eligibleRecaps.map(
        (recap) => {
          const pelunasanDueDate =
            batchInfoMap.get(
              recap.batch_id,
            )?.last_payment_pelunasan ??
            null;

          return {
            recap_id:
              recap.id,

            member_id:
              recap.member_id,

            member_name:
              memberMap.get(
                recap.member_id,
              )?.name ??
              "Member",

            detail_barang:
              recap.detail_barang,

            qty:
              recap.qty,

            reference_date:
              recap.created_at,

            pelunasan_due_date:
              pelunasanDueDate,

            batch_id:
              recap.batch_id,

            batch_name:
              batchInfoMap.get(
                recap.batch_id,
              )?.name ??
              "Batch tidak diketahui",

            batch_country:
              batchInfoMap.get(
                recap.batch_id,
              )?.country ??
              "Country tidak diketahui",
          };
        },
      ),
  };
}

/* =========================================
   CREATE SHIPMENT
========================================= */

export async function createManualShipment(
  input: CreateManualShipmentInput,
): Promise<ManualShipment> {
  const {
    batch_id,
    member_id,
    recap_ids,
    address,
    expedition,
  } = input;

  const packing_price =
    input.packing_price ?? 0;

  const shipping_price =
    input.shipping_price ?? 0;

  const due_date =
    input.due_date?.trim() || null;

  if (!batch_id.trim()) {
    throw new Error(
      "ID batch wajib diisi.",
    );
  }

  validateCommonInput({
    member_id,
    address,
    expedition,
    packing_price,
    shipping_price,
  });

  const normalizedRecapIds =
    validateRecapIds(
      recap_ids,
    );

  /*
   * batch_id di manual_shipments =
   * ID Batch Pengiriman Manual.
   *
   * Batch Rekapan setiap barang berasal dari
   * recaps.batch_id melalui recap_ids.
   */
  await ensureBatchExists(
    batch_id,
  );

  await ensureMemberExists(
    member_id,
  );

  await ensureRecapsAvailableForShipment(
    normalizedRecapIds,
    member_id.trim(),
  );

  const totalPrice =
    calculateTotalPrice(
      packing_price,
      shipping_price,
    );

  const {
    data: shipment,
    error: shipmentError,
  } =
    await supabase
      .from(
        "manual_shipments",
      )
      .insert({
        batch_id:
          batch_id.trim(),

        member_id:
          member_id.trim(),

        address:
          address.trim(),

        expedition,

        packing_price:
          Math.round(
            packing_price,
          ),

        shipping_price:
          Math.round(
            shipping_price,
          ),

        total_amount:
          totalPrice,

        shipping_status:
          input.shipping_status ??
          "Sedang dikemas",

        due_date,
      })
      .select("id")
      .single();

  if (shipmentError) {
    throw new Error(
      `Gagal membuat pengiriman: ${shipmentError.message}`,
    );
  }

  const {
    error: itemError,
  } =
    await supabase
      .from(
        "manual_shipment_items",
      )
      .insert(
        normalizedRecapIds.map(
          (recapId) => ({
            shipment_id:
              shipment.id,

            recap_id:
              recapId,
          }),
        ),
      );

  if (itemError) {
    await supabase
      .from(
        "manual_shipments",
      )
      .delete()
      .eq(
        "id",
        shipment.id,
      );

    throw new Error(
      `Gagal menyimpan barang pengiriman: ${itemError.message}`,
    );
  }

  return getManualShipmentById(
    shipment.id,
  );
}

/* =========================================
   UPDATE SHIPMENT
========================================= */

export async function updateManualShipment(
  id: string,
  input: UpdateManualShipmentInput,
): Promise<ManualShipment> {
  if (!id.trim()) {
    throw new Error(
      "ID pengiriman wajib diisi.",
    );
  }

  const current =
    await getManualShipmentById(
      id,
    );

  /*
   * Update status pengiriman secara terpisah.
   *
   * Penting:
   * Perubahan dari "Sudah di packing" ->
   * "Sudah di pick up" tidak boleh bergantung
   * pada validasi recap lagi. Barang bisa saja
   * sudah CO setelah shipment dibuat.
   *
   * Dengan jalur khusus ini, status disimpan
   * langsung ke manual_shipments sehingga setelah
   * refresh tetap membaca status terbaru dari DB.
   */
  const isShippingStatusOnlyUpdate =
    input.shipping_status !==
      undefined &&
    input.member_id === undefined &&
    input.recap_ids === undefined &&
    input.address === undefined &&
    input.expedition === undefined &&
    input.packing_price === undefined &&
    input.shipping_price === undefined &&
    input.due_date === undefined;

  const isDueDateOnlyUpdate =
    input.due_date !== undefined &&
    input.member_id === undefined &&
    input.recap_ids === undefined &&
    input.address === undefined &&
    input.expedition === undefined &&
    input.packing_price === undefined &&
    input.shipping_price === undefined &&
    input.shipping_status === undefined &&
    input.payment_status === undefined;

  if (isDueDateOnlyUpdate) {
    const dueDate =
      input.due_date?.trim() || null;

    const {
      error: dueDateError,
    } = await supabase
      .from('manual_shipments')
      .update({
        due_date: dueDate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id.trim());

    if (dueDateError) {
      throw new Error(
        `Gagal memperbarui tanggal jatuh tempo: ${dueDateError.message}`,
      );
    }

    return getManualShipmentById(
      id.trim(),
    );
  }

  if (
    isShippingStatusOnlyUpdate
  ) {
    const shippingStatus =
      input.shipping_status;

    /*
     * Status pengiriman yang sudah "Dalam proses pick up"
     * bersifat final dan tidak boleh diubah kembali.
     *
     * Aturan ini hanya melihat shipping_status.
     */
    if (
      current.shipping_status ===
      "Dalam proses pick up"
    ) {
      throw new Error(
        "Status pengiriman sudah dalam proses pick up dan tidak dapat diubah kembali.",
      );
    }

    if (shippingStatus === undefined) {
      throw new Error(
        "Status pengiriman wajib diisi.",
      );
    }

    if (
      !ALLOWED_SHIPPING_STATUSES.includes(
        shippingStatus,
      )
    ) {
      throw new Error(
        "Status pengiriman tidak valid.",
      );
    }

    /*
     * =========================================
     * UPDATE STATUS PENGIRIMAN
     * =========================================
     */
    const {
      error: shippingStatusError,
    } =
      await supabase
        .from(
          "manual_shipments",
        )
        .update({
          shipping_status:
            input.shipping_status,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          id.trim(),
        );

    if (shippingStatusError) {
      throw new Error(
        `Gagal memperbarui status pengiriman: ${shippingStatusError.message}`,
      );
    }

    /*
     * =========================================
     * OTOMATIS UPDATE STATUS CO
     * =========================================
     *
     * Jika status pengiriman berubah menjadi
     * "Dalam proses pick up", semua recap yang
     * berada di shipment ini otomatis ditandai
     * sebagai sudah CO.
     *
     * recaps.sudah_co:
     * false = Belum CO
     * true  = Sudah CO
     */
    if (
      input.shipping_status ===
      "Dalam proses pick up"
    ) {
      const recapIds =
        current.items
          ?.map(
            (item) => item.recap_id,
          )
          .filter(
            (
              recapId,
            ): recapId is string =>
              Boolean(
                recapId?.trim(),
              ),
          ) ?? [];

      if (recapIds.length > 0) {
        const {
          error: recapUpdateError,
        } =
          await supabase
            .from("recaps")
            .update({
              sudah_co: true,
            })
            .in(
              "id",
              recapIds,
            );

        if (recapUpdateError) {
          throw new Error(
            `Status pengiriman berhasil diubah, tetapi gagal memperbarui status CO: ${recapUpdateError.message}`,
          );
        }
      }
    }

    return getManualShipmentById(
      id.trim(),
    );
  }

  const nextMemberId =
    input.member_id?.trim() ??
    current.member_id;

  const nextAddress =
    input.address?.trim() ??
    current.address;

  const nextExpedition =
    input.expedition ??
    current.expedition;

  const nextPackingPrice =
    input.packing_price ??
    current.packing_price;

  const nextShippingPrice =
    input.shipping_price ??
    current.shipping_price;

  const nextShippingStatus =
    input.shipping_status ??
    current.shipping_status;

  const nextDueDate =
    input.due_date !== undefined
      ? input.due_date?.trim() || null
      : current.due_date;

  const nextRecapIds =
    input.recap_ids
      ? validateRecapIds(
          input.recap_ids,
        )
      : current.items.map(
          (item) =>
            item.recap_id,
        );

  if (!nextDueDate) {
    throw new Error(
      "Tanggal jatuh tempo wajib diisi.",
    );
  }

  validateCommonInput({
    member_id:
      nextMemberId,

    address:
      nextAddress,

    expedition:
      nextExpedition,

    packing_price:
      Number(
        nextPackingPrice,
      ),

    shipping_price:
      Number(
        nextShippingPrice,
      ),
  });

  if (
    !ALLOWED_SHIPPING_STATUSES.includes(
      nextShippingStatus,
    )
  ) {
    throw new Error(
      "Status pengiriman tidak valid.",
    );
  }

  await ensureMemberExists(
    nextMemberId,
  );

  await ensureRecapsAvailableForShipment(
    nextRecapIds,
    nextMemberId,
    id.trim(),
    input.recap_ids !== undefined,
  );

  const totalPrice =
    calculateTotalPrice(
      Number(
        nextPackingPrice,
      ),
      Number(
        nextShippingPrice,
      ),
    );

  const {
    error: shipmentError,
  } =
    await supabase
      .from(
        "manual_shipments",
      )
      .update({
        member_id:
          nextMemberId,

        address:
          nextAddress,

        expedition:
          nextExpedition,

        packing_price:
          Math.round(
            Number(
              nextPackingPrice,
            ),
          ),

        shipping_price:
          Math.round(
            Number(
              nextShippingPrice,
            ),
          ),

        total_amount:
          totalPrice,

        shipping_status:
          nextShippingStatus,

        due_date:
          nextDueDate,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        id.trim(),
      );

  if (shipmentError) {
    throw new Error(
      `Gagal memperbarui pengiriman: ${shipmentError.message}`,
    );
  }

  if (
    input.recap_ids
  ) {
    const {
      error: deleteItemsError,
    } =
      await supabase
        .from(
          "manual_shipment_items",
        )
        .delete()
        .eq(
          "shipment_id",
          id.trim(),
        );

    if (deleteItemsError) {
      throw new Error(
        `Gagal memperbarui barang pengiriman: ${deleteItemsError.message}`,
      );
    }

    const {
      error: insertItemsError,
    } =
      await supabase
        .from(
          "manual_shipment_items",
        )
        .insert(
          nextRecapIds.map(
            (recapId) => ({
              shipment_id:
                id.trim(),

              recap_id:
                recapId,
            }),
          ),
        );

    if (insertItemsError) {
      throw new Error(
        `Gagal menyimpan barang pengiriman: ${insertItemsError.message}`,
      );
    }
  }

  return getManualShipmentById(
    id.trim(),
  );
}

/* =========================================
   DELETE SHIPMENT
========================================= */

export async function deleteManualShipment(
  id: string,
): Promise<void> {
  if (!id.trim()) {
    throw new Error(
      "ID pengiriman wajib diisi.",
    );
  }

  const {
    data: shipment,
    error: findError,
  } =
    await supabase
      .from(
        "manual_shipments",
      )
      .select("id")
      .eq(
        "id",
        id.trim(),
      )
      .maybeSingle();

  if (findError) {
    throw new Error(
      `Gagal mencari pengiriman: ${findError.message}`,
    );
  }

  if (!shipment) {
    throw new Error(
      "Data pengiriman tidak ditemukan.",
    );
  }

  const {
    error,
  } =
    await supabase
      .from(
        "manual_shipments",
      )
      .delete()
      .eq(
        "id",
        id.trim(),
      );

  if (error) {
    throw new Error(
      `Gagal menghapus pengiriman: ${error.message}`,
    );
  }
}