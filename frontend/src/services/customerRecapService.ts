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

export type CustomerPayment = {
  amount: number;
  status: string;
  paid_at: string | null;
  due_date: string | null;
  penalty_days: number;
  penalty_amount: number;
};

export type CustomerRecap = {
  id: string;
  country: string | null;
  batch_name: string | null;
  product_image: string | null;
  detail_barang: string;
  qty: number;
  total_harga: number;
  sudah_co: boolean;
  member_type:
    | "customer"
    | "employee"
    | "hnr";
  max_timbun: string | null;
  down_payment: CustomerPayment;
  pelunasan: CustomerPayment;
};

export type CustomerRecapsResponse = {
  success: boolean;
  message: string;
  data: {
    recaps: CustomerRecap[];
  };
};

/* =========================================
   GET CUSTOMER RECAPS
========================================= */

export async function getCustomerRecaps(): Promise<
  CustomerRecap[]
> {
  const token =
    localStorage.getItem(
      "customer_token",
    );

  if (!token) {
    throw new Error(
      "Customer belum terautentikasi.",
    );
  }

  const response =
    await fetch(
      buildApiUrl(
        "/customer/recaps",
      ),
      {
        method: "GET",
        headers: {
          Authorization:
            `Bearer ${token}`,
          "Content-Type":
            "application/json",
        },
      },
    );

  const result =
    (await response.json()) as
      | CustomerRecapsResponse
      | {
          success: false;
          message: string;
        };

  if (!response.ok) {
    throw new Error(
      result.message ||
        "Gagal mengambil data rekapan.",
    );
  }

  return (
    result as CustomerRecapsResponse
  ).data.recaps;
}
