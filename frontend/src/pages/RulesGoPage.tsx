import { useState } from "react";
import {
  CreditCard,
  Gavel,
  Info,
  ListChecks,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import {
  getMembers,
  type Member,
} from "../services/memberService";

type RuleCategory =
  | "general"
  | "behavior"
  | "payment"
  | "shipping"
  | "information"
  | "hnr";

type StandardRule = {
  description: string;
  items: string[];
};

type BehaviorRule = {
  description: string;
  allowed: string[];
  prohibited: string[];
};

type InformationRule = {
  description: string;
  contactPersons: {
    role: string;
    name: string;
    description: string;
  }[];
  paymentMethods: {
    method: string;
    detail: string;
  }[];
};

type RulesData = {
  general: StandardRule;
  behavior: BehaviorRule;
  payment: StandardRule;
  shipping: StandardRule;
  information: InformationRule;
  hnr: StandardRule;
};

const ruleCategories = [
  {
    id: "general" as const,
    label: "Aturan Umum",
    icon: Gavel,
  },
  {
    id: "behavior" as const,
    label: "Perilaku Pengguna",
    icon: UserRound,
  },
  {
    id: "payment" as const,
    label: "Pembayaran",
    icon: CreditCard,
  },
  {
    id: "shipping" as const,
    label: "Pengiriman",
    icon: Truck,
  },
  {
    id: "information" as const,
    label: "Informasi Penting",
    icon: Info,
  },
  {
    id: "hnr" as const,
    label: "HNR",
    icon: UserRound,
  },
];

const rules: RulesData = {
  general: {
    description:
      "Selamat datang di Lecy Soulgo. Dengan bergabung menjadi anggota dan membeli dari Lecy Soulgo, maka anda menyetujui untuk mematuhi aturan dan ketentuan berikut:",
    items: [
      "MEMBELI = SABAR Pengiriman barang dari luar negeri estimasi 2-4 minggu untuk pengiriman reguler, 1 bulan untuk pengiriman udara, dan 2-3 bulan untuk pengiriman laut.",
      "Dilarang cancel barang yang sudah dibeli, jika ingin cancel maka cari penggantinya sendiri.",
      "Damage dari pengiriman seller ke WH BUKAN tanggung jawab Admin.",
      "Damage dari pengiriman WH ke Indonesia BUKAN tanggung jawab Admin.",
      "Jika terjadi scam di karenakan kesalahan admin/owner maka akan di refund 100%. (Kecuali link personal order).",
      "Tidak diperbolehkan untuk mengambil barang untuk orang lain misal teman atau keluarga atau siapapun jika orangnya tidak ada didalam GO, kecuali pada saat WAR dengan tujuan membantu agar barang bisa didapatkan.",
      "Pada point diatas, jika sudah dilakukan, maka WAJIB memasukkan teman atau keluarga atau siapapun tersebut ke GO untuk menghindari cuci tangan jika ada kendala dalam pembayaran barang.",
      "Batas timbun barang 2 bulan dari tanggal pelunasan. Lebih dr 2 bulan maka barang akan di claim GO.",
      "Pada point sebelumnya, jika pada masa batas timbun ternyata ada kerusakan barang karena lembab atau hal-hal lainnya yang diluar kendali Admin (seperti bencana alam banjir, gempa, kebakaran, dll), maka admin tidak akan bertanggung jawab.",
      "HNR = KICK + SPILL + BLACKLIST.",
    ],
  },

  behavior: {
    description:
      "Setiap member dan customer diharapkan menjaga komunikasi dan mengikuti ketentuan berikut:",
    allowed: [
      "Bertanya dengan sopan mengenai order, pembayaran, shipping, atau update GO.",
      "Mengingatkan admin jika ada informasi yang belum jelas.",
      "Memberikan kritik/saran dengan bahasa yang baik.",
      "Menghubungi admin secara pribadi jika masalah bersifat pribadi atau membutuhkan data sensitif.",
      "Berdiskusi dengan sesama member selama masih relevan dengan GO.",
      "Memberitahu admin jika ada member yang tidak mematuhi aturan GO.",
    ],
    prohibited: [
      "Berkata kasar, menghina, merendahkan, atau menyerang member/admin.",
      "Memancing keributan, drama, atau konflik di group.",
      "Membawa masalah pribadi ke dalam group.",
      "Menyindir atau menyebut nama member lain dengan tujuan mempermalukan.",
      "Spam chat, sticker, mention, atau pesan yang tidak berkaitan dengan GO.",
      "Mengirim konten SARA, pornografi, perjudian, atau konten ilegal.",
      "Menyebarkan data pribadi member lain tanpa izin.",
      "Membuat tuduhan/fitnah terhadap admin atau member tanpa bukti.",
    ],
  },

  payment: {
    description:
      "Segala bank untuk transfer dan pembayaran tagihan atas nama Suci Lestari dan hanya ada 2 metode pembayaran yaitu QRIS dan Transfer ke rekening BCA dan Blu BCA. Jika ada perubahan bank pasti akan diinfokan oleh admin",
    items: [
      "Pembelian barang dari luar negeri akan memiliki tagihan DP dengan maksimal pembayaran 7 hari dan pelunasan dengan maksimal pembayaran 3 hari",
      "Bukti transfer diupload ke web atau dikirimkan ke GC payment sesuai dengan arahan ketika tagihan dibuat",
      "Pembayaran lewat dari tanggal yang ditentukan maka dikenakan denda sebanyak 2K/hari tanpa alasan apapun",
      "Dapat ijin telat bayar dengan maksimal pemberitahuan di H-2 hari tanggal maksimal bayar. Jika lewat dari situ maka tetap harus bayar maksimal di tanggal yang sudah ditentukan",
      "Jika pembayaran sudah menyentuh angka 500K maka mohon untuk dibayarkan terlebih dahulu dan tidak menunda-nunda pembayaran",
      "Dilarang melakukan pembayaran atas barang orang lain, kecuali sudah ijin dengan admin. Hal ini untuk menghindari kebingungan dari admin rekap ketika melakukan rekap barang dan pembayaran",
    ],
  },

  shipping: {
    description:
      "Setiap member dapat melakukan CO untuk barang-barang yang sudah ada atau sudah sampai di admin dengan ketentuan sebagai berikut:",
    items: [
      "Pembeli sudah melakukan pelunasan untuk barang yang di CO",
      "Admin membuka CO untuk event dan Non Event (setiap minggu) sesuai dengan ketersediaan admin untuk melakukan packing",
      "Slot CO untuk setiap minggu nya adalah 10 sudah digabung Shopee dan Manual, akan lebih jika admin mempunyai waktu tambahan untuk melakukan packing",
      "Jika barang yang di CO diatas 200K, maka admin menyarankan untuk melakukan CO secara manual, demi menghindari hal-hal yang tidak diinginkan",
      "Paket diusahakan untuk di drop di hari sabtu sampai hari Senin setiap minggunya, dan mungkin bisa lebih jika ada kendala. Jadi dimohonkan untuk mengerti tentang hal ini dikarenakan admin juga memiliki pekerjaan lain",
      "Jika dalam pengiriman ada kendala seperti rusak yang disebabkan oleh packing admin yang kurang, maka admin melakukan refund 100% dengan catatan barang dikembalikan kepada admin",
      "Jika dalam pengiriman ada kendala seperti rusak, hilang, dll yang disebabkan oleh ekspedisi, maka bukan tanggung jawab admin. Tetapi admin akan membantu pembeli untuk melakukan follow up ke ekspedisi",
      "Dilarang melakukan CO untuk barang atas nama orang lain, kecuali sudah memberitahukan kepada admin terlebih dahulu",
      "Jika point sebelumnya dilakukan dan ketahuan admin, maka akan di Spill serta diblacklist dari GO dan barang yang tersisa tidak dikirimkan",
    ],
  },

  information: {
    description:
      "Beberapa informasi penting yang perlu diketahui oleh member",
    contactPersons: [
      {
        role: "Owner GO",
        name: "Suci Lestari - 081280077024",
        description:
          "Jika ada pertanyaan mengenai Barang dan Pembayaran",
      },
      {
        role: "Admin Rekap",
        name: "Nisrin - 085774874178",
        description:
          "Jika ada pertanyaan mengenai Tagihan dan Rekapan",
      },
    ],
    paymentMethods: [
      {
        method: "QRIS",
        detail:
          "Ditampilkan setiap ingin upload bukti pembayaran",
      },
      {
        method: "BCA",
        detail:
          "7550506585 atas nama Suci Lestari",
      },
      {
        method: "Blu BCA",
        detail:
          "005786054201 atas nama Suci Lestari",
      },
    ],
  },

  hnr: {
    description:
      "Daftar member yang saat ini memiliki status HNR di Lecy Soulgo.",
    items: [],
  },
};

export default function RulesGoPage() {
  const [activeCategory, setActiveCategory] =
    useState<RuleCategory>("general");

  const {
    data: members = [],
    isLoading: isMembersLoading,
    isError: isMembersError,
    error: membersError,
  } = useQuery<Member[], Error>({
    queryKey: ["members"],
    queryFn: () => getMembers(),
    staleTime: 5 * 60 * 1000,
  });

  const hnrMembers = members.filter(
    (member) => member.type === "hnr",
  );

  const activeRules = rules[activeCategory];

  return (
    <div className="min-h-screen bg-[#f8faff] text-left">
      <div className="w-full px-6 py-8 lg:px-8">
        {/* =========================
            HEADER
        ========================== */}
        <section className="text-left">
          <h1 className="text-3xl font-bold tracking-tight text-[#10245c]">
            Peraturan & Ketentuan
          </h1>

          <p className="mt-3 max-w-4xl text-sm leading-7 text-[#20366f]">
            Panduan komprehensif untuk member atau customer Lecy Soulgo.
            <br />
            Harap baca dengan seksama untuk memastikan kepatuhan dan keamanan.
          </p>
        </section>

        {/* =========================
            CATEGORY TABS
        ========================== */}
        <section className="mt-8 grid gap-2 text-left sm:grid-cols-2 lg:grid-cols-6">
          {ruleCategories.map((category) => {
            const Icon = category.icon;
            const isActive =
              activeCategory === category.id;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() =>
                  setActiveCategory(category.id)
                }
                className={[
                  "flex min-h-[60px] items-center gap-3 rounded-xl border bg-white px-4 text-left text-sm font-medium shadow-sm transition-all",
                  isActive
                    ? "border-transparent text-[#1457ff] shadow-md ring-1 ring-[#1457ff]/10"
                    : "border-transparent text-[#1c2f65] hover:bg-[#f3f6ff]",
                ].join(" ")}
              >
                <Icon
                  className={[
                    "h-5 w-5 shrink-0",
                    isActive
                      ? "text-[#1457ff]"
                      : "text-[#243b7a]",
                  ].join(" ")}
                />

                <span>{category.label}</span>
              </button>
            );
          })}
        </section>

        {/* =========================
            ACTIVE TAB UNDERLINE
        ========================== */}
        <div className="mt-0 hidden lg:grid lg:grid-cols-6 lg:gap-2">
          {ruleCategories.map((category) => (
            <div
              key={category.id}
              className={[
                "h-1 rounded-b-full transition-all",
                activeCategory === category.id
                  ? "bg-[#1457ff]"
                  : "bg-transparent",
              ].join(" ")}
            />
          ))}
        </div>

        {/* =========================
            CONTENT
        ========================== */}
        <section className="mt-4 rounded-xl bg-white px-7 py-5 shadow-sm ring-1 ring-black/5 lg:px-8 lg:py-6">
          {/* =========================
              GENERAL / PAYMENT / SHIPPING
          ========================== */}
          {activeCategory !== "behavior" &&
          activeCategory !== "information" &&
          activeCategory !== "hnr" &&
          "items" in activeRules ? (
            <>
              <p className="text-sm leading-7 text-[#20366f]">
                {activeRules.description}
              </p>

              <ul className="mt-4 space-y-4">
                {activeRules.items.map(
                  (item, index) => (
                    <li
                      key={`${activeCategory}-${index}`}
                      className="flex items-start gap-4 text-sm leading-7 text-[#20366f]"
                    >
                      <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1457ff]" />

                      <span>{item}</span>
                    </li>
                  ),
                )}
              </ul>
            </>
          ) : null}

          {/* =========================
              BEHAVIOR
          ========================== */}
          {activeCategory === "behavior" ? (
            <>
              <p className="text-sm leading-7 text-[#20366f]">
                {rules.behavior.description}
              </p>

              <div className="mt-6 space-y-8">
                {/* Allowed */}
                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <ListChecks className="h-6 w-6 text-green-600" />

                    <h3 className="text-lg font-semibold text-[#10245c]">
                      Tindakan yang Diperbolehkan
                    </h3>
                  </div>

                  <ul className="space-y-4">
                    {rules.behavior.allowed.map(
                      (item, index) => (
                        <li
                          key={`allowed-${index}`}
                          className="flex items-start gap-3 text-sm leading-7 text-[#20366f]"
                        >
                          <ListChecks className="mt-1.5 h-5 w-5 shrink-0 text-green-600" />

                          <span>{item}</span>
                        </li>
                      ),
                    )}
                  </ul>
                </section>

                {/* Prohibited */}
                <section>
                  <div className="mb-4 flex items-center gap-2">
                    <X className="h-6 w-6 text-red-500" />

                    <h3 className="text-lg font-semibold text-[#10245c]">
                      Tindakan yang Dilarang
                    </h3>
                  </div>

                  <ul className="space-y-4">
                    {rules.behavior.prohibited.map(
                      (item, index) => (
                        <li
                          key={`prohibited-${index}`}
                          className="flex items-start gap-3 text-sm leading-7 text-[#20366f]"
                        >
                          <X className="mt-1.5 h-5 w-5 shrink-0 text-red-500" />

                          <span>{item}</span>
                        </li>
                      ),
                    )}
                  </ul>
                </section>
              </div>
            </>
          ) : null}

          {/* =========================
              INFORMATION
          ========================== */}
          {activeCategory === "information" ? (
            <>
              <p className="text-sm leading-7 text-[#20366f]">
                {rules.information.description}
              </p>

              <div className="mt-5 space-y-5">
                {/* Contact Person */}
                <section className="rounded-xl border border-[#dfe6f5] bg-[#fbfcff] px-6 py-5">
                  <h3 className="text-lg font-semibold text-[#10245c]">
                    Contact Person
                  </h3>

                  <div className="mt-4 space-y-4">
                    {rules.information.contactPersons.map(
                      (person) => (
                        <div
                          key={person.role}
                          className="rounded-lg bg-white px-5 py-4"
                        >
                          <h4 className="text-base font-semibold text-[#10245c]">
                            {person.role}
                          </h4>

                          <p className="mt-1.5 text-sm font-medium text-[#20366f]">
                            {person.name}
                          </p>

                          <p className="mt-1.5 text-sm leading-6 text-[#20366f]">
                            {person.description}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </section>

                {/* Metode Pembayaran */}
                <section className="rounded-xl border border-[#dfe6f5] bg-[#fbfcff] px-6 py-5">
                  <h3 className="text-lg font-semibold text-[#10245c]">
                    Metode Pembayaran
                  </h3>

                  <div className="mt-4 space-y-4">
                    {rules.information.paymentMethods.map(
                      (payment) => (
                        <div
                          key={payment.method}
                          className="rounded-lg bg-white px-5 py-4"
                        >
                          <p className="text-base font-semibold text-[#10245c]">
                            {payment.method}
                          </p>

                          <p className="mt-1.5 text-sm leading-6 text-[#20366f]">
                            {payment.detail}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </section>
              </div>
            </>
          ) : null}

          {/* =========================
              HNR
          ========================== */}
          {activeCategory === "hnr" ? (
            <>
              <p className="text-sm leading-7 text-[#20366f]">
                {rules.hnr.description}
              </p>

              {isMembersLoading ? (
                <div className="mt-6 rounded-xl border border-[#dfe6f5] bg-[#fbfcff] px-6 py-8 text-center">
                  <p className="text-sm text-[#7a89ad]">
                    Memuat daftar HNR...
                  </p>
                </div>
              ) : isMembersError ? (
                <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-6 py-5">
                  <p className="text-sm font-medium text-red-500">
                    Gagal mengambil daftar HNR.
                  </p>

                  <p className="mt-1 text-sm text-red-400">
                    {membersError.message}
                  </p>
                </div>
              ) : hnrMembers.length === 0 ? (
                <div className="mt-6 rounded-xl border border-[#dfe6f5] bg-[#fbfcff] px-6 py-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#edf3ff]">
                    <UserRound className="h-5 w-5 text-[#1457ff]" />
                  </div>

                  <p className="mt-3 text-sm font-medium text-[#20366f]">
                    Belum ada member HNR.
                  </p>
                </div>
              ) : (
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {hnrMembers.map((member) => (
                    <div
                      key={member.id}
                      className="rounded-xl border border-[#dfe6f5] bg-[#fbfcff] px-5 py-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#edf3ff]">
                          <UserRound className="h-5 w-5 text-[#1457ff]" />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#10245c]">
                            {member.name}
                          </p>

                          <p className="mt-0.5 text-xs text-[#7a89ad]">
                            HNR
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}