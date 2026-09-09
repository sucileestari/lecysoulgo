import { z } from "zod";

export const memberSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama lengkap wajib diisi")
    .max(100, "Nama maksimal 100 karakter"),

  phone: z
    .string()
    .trim()
    .min(8, "Nomor telepon minimal 8 karakter")
    .max(20, "Nomor telepon maksimal 20 karakter"),

  type: z.enum(
    ["customer", "employee"],
    {
      message: "Tipe anggota wajib dipilih",
    },
  ),
});

export type MemberFormData =
  z.infer<typeof memberSchema>;