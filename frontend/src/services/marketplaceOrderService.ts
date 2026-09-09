const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim();

if (!API_BASE_URL) {
  throw new Error(
    "VITE_API_BASE_URL belum diatur di environment variables.",
  );
}

/* =========================================
   TYPES
========================================= */

export type MarketplaceOrderStatus =
  | "waiting"
  | "processing"
  | "processed";

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

export type MarketplaceMemberOption = {
  id: string;
  name: string;
  phone: string;
};

/* =========================================
   CREATE INPUT
========================================= */

export type CreateMarketplaceOrderInput = {
  member_id: string;
  order_number: string;
  recap_ids: string[];
};

/* =========================================
   ORDER ITEM
========================================= */

export type MarketplaceOrderItem = {
  id: string;
  marketplace_order_id: string;
  recap_id: string;
  created_at: string;
};

/* =========================================
   ORDER
========================================= */

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

/* =========================================
   API RESPONSE
========================================= */

type ApiSuccess<T> = {
  success: true;
  data: T;
  message?: string;
};

type ApiError = {
  success: false;
  message?: string;
};

type ApiResponse<T> =
  | ApiSuccess<T>
  | ApiError;

/* =========================================
   AUTH HELPER
========================================= */

function getSessionToken(): string {
  const customerToken =
    localStorage.getItem("customer_token");

  if (customerToken) {
    return customerToken;
  }

  const adminToken =
    localStorage.getItem("auth_token");

  if (adminToken) {
    return adminToken;
  }

  throw new Error(
    "Sesi pengguna tidak ditemukan.",
  );
}

function getCustomerMemberId(): string | undefined {
  const token =
    localStorage.getItem("customer_token");

  if (!token) {
    return undefined;
  }

  const raw =
    localStorage.getItem("customer_member");

  if (!raw) {
    return undefined;
  }

  try {
    const member = JSON.parse(raw) as {
      id?: unknown;
    };

    return typeof member.id === "string" && member.id.trim()
      ? member.id.trim()
      : undefined;
  } catch {
    return undefined;
  }
}

function isCustomerSession(): boolean {
  return Boolean(
    localStorage.getItem("customer_token"),
  );
}

/* =========================================
   RESPONSE PARSER
========================================= */

async function parseResponse<T>(
  response: Response,
): Promise<T> {
  let result: ApiResponse<T>;

  try {
    result = await response.json();
  } catch {
    throw new Error(
      `Server mengembalikan response tidak valid (${response.status}).`,
    );
  }

  if (!response.ok) {
    throw new Error(
      !result.success
        ? result.message ||
            `Request gagal (${response.status}).`
        : `Request gagal (${response.status}).`,
    );
  }

  if (!result.success) {
    throw new Error(
      result.message ||
        "Request gagal.",
    );
  }

  return result.data;
}

/* =========================================
   GET MEMBER OPTIONS
========================================= */

export async function getMarketplaceMemberOptions(): Promise<
  MarketplaceMemberOption[]
> {
  const token = getSessionToken();

  const response = await fetch(
    `${API_BASE_URL}/api/marketplace-orders/member-options`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return parseResponse<MarketplaceMemberOption[]>(
    response,
  );
}

/* =========================================
   GET AVAILABLE ITEMS
========================================= */

export async function getAvailableMarketplaceItems(
  memberId?: string,
): Promise<MarketplaceAvailableItem[]> {
  const token = getSessionToken();
  const params = new URLSearchParams();

  if (memberId?.trim()) {
    params.set("member_id", memberId.trim());
  }

  const query = params.toString();
  const url = `${API_BASE_URL}/api/marketplace-orders/available-items${query ? `?${query}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<MarketplaceAvailableItem[]>(
    response,
  );
}

/* =========================================
   CREATE MARKETPLACE ORDER
========================================= */

export async function createMarketplaceOrder(
  input: CreateMarketplaceOrderInput,
): Promise<MarketplaceOrder> {
  if (!input.member_id?.trim()) {
    throw new Error(
      "Pembeli wajib dipilih.",
    );
  }

  if (!input.order_number?.trim()) {
    throw new Error(
      "Nomor pesanan wajib diisi.",
    );
  }

  if (
    !Array.isArray(input.recap_ids) ||
    input.recap_ids.length === 0
  ) {
    throw new Error(
      "Minimal pilih satu barang.",
    );
  }

  const token = getSessionToken();

  const response = await fetch(
    `${API_BASE_URL}/api/marketplace-orders`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        member_id: input.member_id.trim(),
        order_number: input.order_number.trim(),
        recap_ids: input.recap_ids.map(
          (recapId) => recapId.trim(),
        ),
      }),
    },
  );

  return parseResponse<MarketplaceOrder>(
    response,
  );
}

/* =========================================
   GET MARKETPLACE ORDERS
========================================= */

export async function getMarketplaceOrders(): Promise<
  MarketplaceOrder[]
> {
  const token = getSessionToken();
  const customerMemberId =
    getCustomerMemberId();

  const params = new URLSearchParams();

  if (isCustomerSession() && customerMemberId) {
    params.set(
      "member_id",
      customerMemberId,
    );
  }

  const query = params.toString();
  const url = `${API_BASE_URL}/api/marketplace-orders${query ? `?${query}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<MarketplaceOrder[]>(
    response,
  );
}
