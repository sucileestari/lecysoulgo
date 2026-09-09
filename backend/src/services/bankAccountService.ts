import { supabase } from "../config/supabase.js";

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
   GET ALL BANK ACCOUNTS
========================================= */

export async function getBankAccounts(): Promise<
  BankAccount[]
> {
  const { data, error } =
    await supabase
      .from("bank_accounts")
      .select("*")
      .order("name", {
        ascending: true,
      });

  if (error) {
    console.error(
      "getBankAccounts error:",
      error,
    );

    throw new Error(
      "Gagal mengambil data rekening.",
    );
  }

  return (data ?? []) as BankAccount[];
}

/* =========================================
   GET ACTIVE BANK ACCOUNTS
========================================= */

export async function getActiveBankAccounts(): Promise<
  BankAccount[]
> {
  const { data, error } =
    await supabase
      .from("bank_accounts")
      .select("*")
      .eq("is_active", true)
      .order("name", {
        ascending: true,
      });

  if (error) {
    console.error(
      "getActiveBankAccounts error:",
      error,
    );

    throw new Error(
      "Gagal mengambil data rekening aktif.",
    );
  }

  return (data ?? []) as BankAccount[];
}