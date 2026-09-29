const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim();

if (!API_BASE_URL) {
  throw new Error(
    "VITE_API_BASE_URL belum diatur di environment variables.",
  );
}

function buildApiUrl(path: string): string {
  return `${API_BASE_URL.replace(/\/$/, "")}/api${path}`;
}

/* =========================================
   TYPES
========================================= */

export type CustomerMemberType =
  | "customer"
  | "employee"
  | "hnr"
  | string;

export type CustomerDashboardMember = {
  id: string;
  name: string;
  phone: string;
  type: CustomerMemberType | null;
};

export type CustomerDashboardSummary = {
  total_recaps: number;
  unpaid_recaps: number;
  pending_payments: number;
  checked_out: number;
};

export type CustomerUpcomingPayment = {
  recap_id: string;
  batch_id: string;
  batch_name: string | null;
  country: string | null;
  product_image: string | null;
  detail_barang: string;
  qty: number;
  payment_type: "DP" | "PELUNASAN";
  amount: number;
  base_amount: number;
  penalty_days: number;
  penalty_amount: number;
  due_date: string | null;
  payment_id: string | null;
  payment_status: string;
  payment_url: string | null;
  payment_link_status:
    | "not_sent"
    | "scheduled"
    | "sent"
    | "failed"
    | string;
  payment_link_sent_at: string | null;
};

export type CustomerUpcomingRecap = {
  recap_id: string;
  batch_id: string;
  batch_name: string | null;
  country: string | null;
  product_image: string | null;
  detail_barang: string;
  qty: number;
  created_at: string;
};

export type CustomerCheckoutReady = {
  recap_id: string;
  batch_id: string;
  batch_name: string | null;
  country: string | null;
  product_image: string | null;
  detail_barang: string;
  qty: number;
  status_barang: string | null;
  max_timbun: string | null;
  created_at: string;
};

export type CustomerDashboardData = {
  member: CustomerDashboardMember;
  summary: CustomerDashboardSummary;
  upcoming_payments: CustomerUpcomingPayment[];
  upcoming_recaps: CustomerUpcomingRecap[];
  checkout_ready: CustomerCheckoutReady[];
};

export type CustomerDashboardResponse = {
  success: boolean;
  message: string;
  data: CustomerDashboardData;
};

/* =========================================
   GET CUSTOMER DASHBOARD
========================================= */

export async function getCustomerDashboard(): Promise<
  CustomerDashboardData
> {
  const token = localStorage.getItem(
    "customer_token",
  );

  if (!token) {
    throw new Error(
      "Customer belum terautentikasi.",
    );
  }

  const response = await fetch(
    buildApiUrl("/customer/dashboard"),
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    },
  );

  let result:
    | CustomerDashboardResponse
    | {
        success: false;
        message?: string;
      };

  try {
    result = (await response.json()) as
      | CustomerDashboardResponse
      | {
          success: false;
          message?: string;
        };
  } catch {
    throw new Error(
      `Server mengembalikan response tidak valid (${response.status}).`,
    );
  }

  if (!response.ok) {
    throw new Error(
      result.message ??
        "Gagal mengambil dashboard customer.",
    );
  }

  if (!result.success) {
    throw new Error(
      result.message ??
        "Gagal mengambil dashboard customer.",
    );
  }

  return result.data;
}