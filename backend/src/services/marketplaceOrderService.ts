import { supabase } from "../config/supabase.js";

/* =========================================
   TYPES
========================================= */

export type MarketplaceOrderStatus =
  | "waiting"
  | "processing"
  | "processed";

export type MarketplaceOrderItem = {
  id: string;
  marketplace_order_id: string;
  recap_id: string;
  created_at: string;
};

export type MarketplaceOrder = {
  id: string;
  order_number: string;
  member_id: string;
  member_name: string;
  member_phone: string;
  status: MarketplaceOrderStatus;
  created_at: string;
  updated_at: string;
  items: MarketplaceOrderItem[];
};

export type MarketplaceAvailableItem = {
  recap_id: string;
  member_id: string;
  member_name: string;
  member_phone: string;
  detail_barang: string;
  qty: number;
  total_harga: number;
  reference_date: string;
  batch_id: string;
  batch_name: string;
  batch_country: string;
  batch_status: string;
};

export type CreateMarketplaceOrderInput = {
  member_id: string;
  order_number: string;
  recap_ids: string[];
};

export type MarketplaceMemberOption = {
  id: string;
  name: string;
  phone: string;
};

/* =========================================
   CONSTANT
========================================= */

const ELIGIBLE_BATCH_STATUS =
  "Sudah sampai di Admin";

/* =========================================
   PAYMENT HELPER
========================================= */

function isPaymentPaid(
  payments: Array<{
    payment_type: string;
    status: string;
  }>,
  paymentType: "DP" | "PELUNASAN",
): boolean {
  return payments.some(
    (payment) =>
      payment.payment_type === paymentType &&
      payment.status.toLowerCase() === "paid",
  );
}

/* =========================================
   GET MARKETPLACE ORDERS
========================================= */

/**
 * Mengambil seluruh pesanan Marketplace
 * milik customer yang sedang login.
 *
 * member_id berasal dari JWT customer.
 */
export async function getMarketplaceOrders(
  memberId?: string,
): Promise<MarketplaceOrder[]> {

  let ordersQuery = supabase
    .from("marketplace_orders")
    .select(`
      id,
      order_number,
      member_id,
      status,
      created_at,
      updated_at,
      member:members (
        name,
        phone
      ),
      items:marketplace_order_items (
        id,
        marketplace_order_id,
        recap_id,
        created_at
      )
    `);

  if (memberId) {
    ordersQuery = ordersQuery.eq("member_id", memberId);
  }

  const { data, error } = await ordersQuery
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "getMarketplaceOrders error:",
      error,
    );

    throw new Error(
      `Gagal mengambil pesanan Marketplace: ${error.message}`,
    );
  }

  return (data ?? []).map(
    (order) => {
      const rawMember =
        Array.isArray(order.member)
          ? order.member[0] ?? null
          : order.member ?? null;

      return {
        id: order.id,
        order_number:
          order.order_number,
        member_id:
          order.member_id,
        member_name:
          typeof rawMember?.name ===
          "string"
            ? rawMember.name
            : "",
        member_phone:
          typeof rawMember?.phone ===
          "string"
            ? rawMember.phone
            : "",
        status:
          order.status as MarketplaceOrderStatus,
        created_at:
          order.created_at,
        updated_at:
          order.updated_at,
        items:
          (order.items ?? []).map(
            (item) => ({
              id: item.id,
              marketplace_order_id:
                item.marketplace_order_id,
              recap_id:
                item.recap_id,
              created_at:
                item.created_at,
            }),
          ),
      };
    },
  );
}

/* =========================================
   GET AVAILABLE ITEMS
========================================= */

/**
 * Mengambil barang Rekapan yang eligible
 * untuk Marketplace. Jika member_id diberikan, hasil dibatasi untuk member tersebut.
 *
 * Syarat:
 * - jika member_id diberikan, milik member tersebut
 * - batch "Sudah sampai di Admin"
 * - DP paid
 * - Pelunasan paid
 * - belum CO
 * - belum digunakan Marketplace
 */
export async function getAvailableMarketplaceItems(
  memberId?: string,
): Promise<MarketplaceAvailableItem[]> {

  /* -----------------------------------------
     GET RECAPS
  ----------------------------------------- */

  let recapsQuery = supabase
    .from("recaps")
    .select(`
      id,
      member_id,
      detail_barang,
      qty,
      total_harga,
      created_at,
      sudah_co,
      batch:batches (
        id,
        name,
        country,
        status
      ),
      member:members (
        name,
        phone
      )
    `)
    .eq("sudah_co", false);

  if (memberId) {
    recapsQuery = recapsQuery.eq("member_id", memberId);
  }

  const { data: recaps, error: recapsError } = await recapsQuery;

  if (recapsError) {
    console.error(
      "getAvailableMarketplaceItems recaps error:",
      recapsError,
    );

    throw new Error(
      `Gagal mengambil data Rekapan: ${recapsError.message}`,
    );
  }

  if (!recaps || recaps.length === 0) {
    return [];
  }

  const recapIds =
    recaps.map(
      (recap) => recap.id,
    );

  /* -----------------------------------------
     GET PAYMENTS
  ----------------------------------------- */

  const {
    data: payments,
    error: paymentsError,
  } = await supabase
    .from("payments")
    .select(`
      recap_id,
      payment_type,
      status
    `)
    .in("recap_id", recapIds);

  if (paymentsError) {
    console.error(
      "getAvailableMarketplaceItems payments error:",
      paymentsError,
    );

    throw new Error(
      `Gagal mengambil data pembayaran: ${paymentsError.message}`,
    );
  }

  /* -----------------------------------------
     GROUP PAYMENTS
  ----------------------------------------- */

  const paymentsByRecap =
    new Map<
      string,
      Array<{
        payment_type: string;
        status: string;
      }>
    >();

  for (const payment of
    payments ?? []) {
    const current =
      paymentsByRecap.get(
        payment.recap_id,
      ) ?? [];

    current.push({
      payment_type:
        payment.payment_type,
      status:
        payment.status,
    });

    paymentsByRecap.set(
      payment.recap_id,
      current,
    );
  }

  /* -----------------------------------------
     GET USED RECAPS
  ----------------------------------------- */

  const {
    data: usedItems,
    error: usedItemsError,
  } = await supabase
    .from("marketplace_order_items")
    .select("recap_id")
    .in(
      "recap_id",
      recapIds,
    );

  if (usedItemsError) {
    console.error(
      "getAvailableMarketplaceItems used items error:",
      usedItemsError,
    );

    throw new Error(
      `Gagal memeriksa barang Marketplace: ${usedItemsError.message}`,
    );
  }

  const usedRecapIds =
    new Set(
      (usedItems ?? []).map(
        (item) =>
          item.recap_id,
      ),
    );

  /* -----------------------------------------
     FILTER ELIGIBLE ITEMS
  ----------------------------------------- */

  return recaps
    .filter((recap) => {
      const rawBatch =
        Array.isArray(recap.batch)
          ? recap.batch[0] ?? null
          : recap.batch ?? null;

      if (!rawBatch) {
        return false;
      }

      if (
        rawBatch.status !==
        ELIGIBLE_BATCH_STATUS
      ) {
        return false;
      }

      if (
        usedRecapIds.has(
          recap.id,
        )
      ) {
        return false;
      }

      const recapPayments =
        paymentsByRecap.get(
          recap.id,
        ) ?? [];

      if (
        !isPaymentPaid(
          recapPayments,
          "DP",
        )
      ) {
        return false;
      }

      if (
        !isPaymentPaid(
          recapPayments,
          "PELUNASAN",
        )
      ) {
        return false;
      }

      return true;
    })
    .map((recap) => {
      const rawBatch =
        Array.isArray(recap.batch)
          ? recap.batch[0] ?? null
          : recap.batch ?? null;

      const rawMember =
        Array.isArray(recap.member)
          ? recap.member[0] ?? null
          : recap.member ?? null;

      return {
        recap_id:
          recap.id,
        member_id:
          recap.member_id,
        member_name:
          typeof rawMember?.name ===
          "string"
            ? rawMember.name
            : "",
        member_phone:
          typeof rawMember?.phone ===
          "string"
            ? rawMember.phone
            : "",
        detail_barang:
          recap.detail_barang,
        qty:
          Number(recap.qty),
        total_harga:
          Number(recap.total_harga),
        reference_date:
          recap.created_at,
        batch_id:
          rawBatch?.id ?? "",
        batch_name:
          rawBatch?.name ?? "",
        batch_country:
          rawBatch?.country ?? "",
        batch_status:
          rawBatch?.status ?? "",
      };
    });
}

/* =========================================
   GET MEMBER OPTIONS
========================================= */

/**
 * Mengambil seluruh member yang pernah muncul di Rekapan.
 */
export async function getMarketplaceMemberOptions(): Promise<MarketplaceMemberOption[]> {
  const { data: recaps, error: recapsError } = await supabase
    .from("recaps")
    .select("member_id");

  if (recapsError) {
    throw new Error(
      `Gagal mengambil data pembeli Marketplace: ${recapsError.message}`,
    );
  }

  const memberIds = Array.from(
    new Set(
      (recaps ?? [])
        .map((recap) => recap.member_id)
        .filter((memberId): memberId is string => typeof memberId === "string" && Boolean(memberId)),
    ),
  );

  if (memberIds.length === 0) {
    return [];
  }

  const { data: members, error: membersError } = await supabase
    .from("members")
    .select("id, name, phone")
    .in("id", memberIds)
    .order("name", { ascending: true });

  if (membersError) {
    throw new Error(
      `Gagal mengambil data pembeli Marketplace: ${membersError.message}`,
    );
  }

  return (members ?? []).map((member) => ({
    id: member.id,
    name: member.name,
    phone: member.phone,
  }));
}

/* =========================================
   VALIDATE RECAPS
========================================= */

async function validateMarketplaceRecaps(
  memberId: string,
  recapIds: string[],
): Promise<void> {
  const uniqueRecapIds =
    Array.from(
      new Set(
        recapIds
          .filter(
            (recapId) =>
              typeof recapId ===
              "string",
          )
          .map(
            (recapId) =>
              recapId.trim(),
          )
          .filter(Boolean),
      ),
    );

  if (
    uniqueRecapIds.length ===
    0
  ) {
    throw new Error(
      "Minimal pilih satu barang.",
    );
  }

  const {
    data: recaps,
    error: recapsError,
  } = await supabase
    .from("recaps")
    .select(`
      id,
      member_id,
      sudah_co,
      batch:batches (
        id,
        status
      )
    `)
    .in(
      "id",
      uniqueRecapIds,
    );

  if (recapsError) {
    throw new Error(
      `Gagal memvalidasi barang: ${recapsError.message}`,
    );
  }

  if (
    !recaps ||
    recaps.length !==
      uniqueRecapIds.length
  ) {
    throw new Error(
      "Salah satu barang yang dipilih tidak ditemukan.",
    );
  }

  for (const recap of recaps) {
    if (
      recap.member_id !==
      memberId
    ) {
      throw new Error(
        "Barang yang dipilih bukan milik pembeli yang dipilih.",
      );
    }

    if (recap.sudah_co) {
      throw new Error(
        "Salah satu barang yang dipilih sudah CO.",
      );
    }

    const rawBatch =
      Array.isArray(recap.batch)
        ? recap.batch[0] ?? null
        : recap.batch ?? null;

    if (
      !rawBatch ||
      rawBatch.status !==
        ELIGIBLE_BATCH_STATUS
    ) {
      throw new Error(
        "Salah satu barang yang dipilih belum sampai di Admin.",
      );
    }
  }

  /* -----------------------------------------
     PAYMENTS
  ----------------------------------------- */

  const {
    data: payments,
    error: paymentsError,
  } = await supabase
    .from("payments")
    .select(`
      recap_id,
      payment_type,
      status
    `)
    .in(
      "recap_id",
      uniqueRecapIds,
    );

  if (paymentsError) {
    throw new Error(
      `Gagal memvalidasi pembayaran: ${paymentsError.message}`,
    );
  }

  for (const recapId of
    uniqueRecapIds) {
    const recapPayments =
      (payments ?? [])
        .filter(
          (payment) =>
            payment.recap_id ===
            recapId,
        );

    if (
      !isPaymentPaid(
        recapPayments,
        "DP",
      )
    ) {
      throw new Error(
        "Salah satu barang yang dipilih belum memiliki DP yang dibayar.",
      );
    }

    if (
      !isPaymentPaid(
        recapPayments,
        "PELUNASAN",
      )
    ) {
      throw new Error(
        "Salah satu barang yang dipilih belum memiliki pelunasan yang dibayar.",
      );
    }
  }

  /* -----------------------------------------
     MARKETPLACE DUPLICATE
  ----------------------------------------- */

  const {
    data: existingItems,
    error: existingItemsError,
  } = await supabase
    .from("marketplace_order_items")
    .select("recap_id")
    .in(
      "recap_id",
      uniqueRecapIds,
    );

  if (existingItemsError) {
    throw new Error(
      `Gagal memeriksa pesanan Marketplace: ${existingItemsError.message}`,
    );
  }

  if (
    existingItems &&
    existingItems.length >
      0
  ) {
    throw new Error(
      "Salah satu barang yang dipilih sudah digunakan pada pesanan Marketplace lain.",
    );
  }
}

/* =========================================
   CREATE MARKETPLACE ORDER
========================================= */

export async function createMarketplaceOrder(
  input: CreateMarketplaceOrderInput,
): Promise<MarketplaceOrder> {
  const memberId =
    input.member_id.trim();

  const orderNumber =
    input.order_number.trim();

  const recapIds =
    Array.from(
      new Set(
        input.recap_ids
          .filter(
            (recapId) =>
              typeof recapId ===
              "string",
          )
          .map(
            (recapId) =>
              recapId.trim(),
          )
          .filter(Boolean),
      ),
    );

  if (!orderNumber) {
    throw new Error(
      "Nomor pesanan wajib diisi.",
    );
  }

  if (
    recapIds.length ===
    0
  ) {
    throw new Error(
      "Minimal pilih satu barang.",
    );
  }

  /* -----------------------------------------
     VALIDATE MEMBER
  ----------------------------------------- */

  const {
    data: member,
    error: memberError,
  } = await supabase
    .from("members")
    .select(`
      id,
      name,
      phone,
      type
    `)
    .eq("id", memberId)
    .maybeSingle();

  if (memberError) {
    throw new Error(
      `Gagal mengambil data member: ${memberError.message}`,
    );
  }

  if (!member) {
    throw new Error(
      "Member tidak ditemukan.",
    );
  }

  /* -----------------------------------------
     VALIDATE RECAPS
  ----------------------------------------- */

  await validateMarketplaceRecaps(
    memberId,
    recapIds,
  );

  /* -----------------------------------------
     CHECK ORDER NUMBER
  ----------------------------------------- */

  const {
    data: existingOrder,
    error: existingOrderError,
  } = await supabase
    .from("marketplace_orders")
    .select("id")
    .eq(
      "order_number",
      orderNumber,
    )
    .maybeSingle();

  if (existingOrderError) {
    throw new Error(
      `Gagal memeriksa nomor pesanan: ${existingOrderError.message}`,
    );
  }

  if (existingOrder) {
    throw new Error(
      "Nomor pesanan Marketplace sudah digunakan.",
    );
  }

  /* -----------------------------------------
     CREATE ORDER
  ----------------------------------------- */

  const {
    data: createdOrder,
    error: createOrderError,
  } = await supabase
    .from("marketplace_orders")
    .insert({
      order_number:
        orderNumber,
      member_id:
        memberId,
      status:
        "waiting",
    })
    .select(`
      id,
      order_number,
      member_id,
      status,
      created_at,
      updated_at
    `)
    .single();

  if (
    createOrderError ||
    !createdOrder
  ) {
    throw new Error(
      createOrderError?.message ??
        "Gagal membuat pesanan Marketplace.",
    );
  }

  /* -----------------------------------------
     CREATE ORDER ITEMS
  ----------------------------------------- */

  const {
    data: createdItems,
    error: createItemsError,
  } = await supabase
    .from(
      "marketplace_order_items",
    )
    .insert(
      recapIds.map(
        (recapId) => ({
          marketplace_order_id:
            createdOrder.id,
          recap_id:
            recapId,
        }),
      ),
    )
    .select(`
      id,
      marketplace_order_id,
      recap_id,
      created_at
    `);

  if (
    createItemsError ||
    !createdItems
  ) {
    /*
     * Rollback sederhana apabila
     * insert item gagal.
     */
    await supabase
      .from(
        "marketplace_orders",
      )
      .delete()
      .eq(
        "id",
        createdOrder.id,
      );

    throw new Error(
      createItemsError?.message ??
        "Gagal menyimpan barang pesanan Marketplace.",
    );
  }

  return {
    id:
      createdOrder.id,
    order_number:
      createdOrder.order_number,
    member_id:
      createdOrder.member_id,
    member_name:
      member.name,
    member_phone:
      member.phone,
    status:
      createdOrder.status as MarketplaceOrderStatus,
    created_at:
      createdOrder.created_at,
    updated_at:
      createdOrder.updated_at,
    items:
      createdItems.map(
        (item) => ({
          id: item.id,
          marketplace_order_id:
            item.marketplace_order_id,
          recap_id:
            item.recap_id,
          created_at:
            item.created_at,
        }),
      ),
  };
}