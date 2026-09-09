const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim();

if (!API_BASE_URL) {
  throw new Error(
    "VITE_API_BASE_URL belum diatur.",
  );
}

/* =========================================
   TYPES
========================================= */

export type BankAccount = {
  id: string;
  name: string;
  account_number: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/* =========================================
   GET ACTIVE BANK ACCOUNTS
========================================= */

export async function getActiveBankAccounts(): Promise<
  BankAccount[]
> {
  const token = localStorage.getItem("auth_token");

  const response = await fetch(
    `${API_BASE_URL}/api/bank-accounts/active`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
      },
    },
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result?.message ||
        "Gagal mengambil data rekening aktif.",
    );
  }

  return (result?.data ?? []) as BankAccount[];
}