import {

  useMemo,

  type ReactNode,

} from "react";



import {

  useQuery,

} from "@tanstack/react-query";



import {

  AlertCircle,

  Banknote,

  CalendarDays,

  CheckCircle2,

  Clock3,

  PackageCheck,

  RefreshCw,

  ShoppingBag,

} from "lucide-react";



import type {

  PaymentType,

} from "@/services/paymentService";



import {

  getCustomerDashboard,

  type CustomerCheckoutReady,

  type CustomerUpcomingPayment,

} from "@/services/customerDashboardService";



/* =========================================

   HELPERS

========================================= */



function formatCurrency(

  amount: number,

): string {

  return new Intl.NumberFormat(

    "id-ID",

    {

      style: "currency",

      currency: "IDR",

      minimumFractionDigits: 0,

      maximumFractionDigits: 0,

    },

  ).format(amount);

}



function formatDate(

  dateString: string | null,

): string {

  if (!dateString) {

    return "—";

  }



  const date = new Date(

    `${dateString}T00:00:00+07:00`,

  );



  if (Number.isNaN(date.getTime())) {

    return "—";

  }



  return new Intl.DateTimeFormat(

    "id-ID",

    {

      day: "2-digit",

      month: "long",

      year: "numeric",

      timeZone: "Asia/Jakarta",

    },

  ).format(date);

}



function formatCountry(

  country: string | null,

): string {

  switch (

    String(country ?? "").toLowerCase()

  ) {

    case "china":

      return "China";

    case "indonesia":

      return "Indonesia";

    case "jepang":

      return "Jepang";

    case "korea":

      return "Korea";

    case "thailand":

      return "Thailand";

    default:

      return country ?? "-";

  }

}



function getMemberTypeLabel(

  type: string | null,

): string {

  switch (

    String(type ?? "").trim().toLowerCase()

  ) {

    case "hnr":

      return "HNR";

    case "employee":

      return "Employee";

    case "customer":

      return "Customer";

    default:

      return type || "Customer";

  }

}



function getAnnouncementCategoryLabel(

  category: string,

): string {

  switch (

    String(category ?? "").trim().toLowerCase()

  ) {

    case "important":

      return "Penting";

    case "attention":

      return "Perhatian";

    case "information":

      return "Informasi";

    default:

      return "Informasi";

  }

}



function getAnnouncementCategoryStyle(

  category: string,

): {

  border: string;

  background: string;

  iconBackground: string;

  iconText: string;

  badgeBackground: string;

  badgeText: string;

} {

  switch (

    String(category ?? "").trim().toLowerCase()

  ) {

    case "important":

      return {

        border: "border-red-200",

        background: "bg-red-50",

        iconBackground: "bg-white",

        iconText: "text-red-500",

        badgeBackground: "bg-red-100",

        badgeText: "text-red-600",

      };



    case "attention":

      return {

        border: "border-amber-200",

        background: "bg-amber-50",

        iconBackground: "bg-white",

        iconText: "text-amber-500",

        badgeBackground: "bg-amber-100",

        badgeText: "text-amber-700",

      };



    case "information":

    default:

      return {

        border: "border-[#dbe6ff]",

        background: "bg-[#edf3ff]",

        iconBackground: "bg-white",

        iconText: "text-[#1457ff]",

        badgeBackground: "bg-white",

        badgeText: "text-[#1457ff]",

      };

  }

}



function formatAnnouncementDate(

  dateString: string | null,

): string {

  if (!dateString) {

    return "—";

  }



  const date = new Date(dateString);



  if (Number.isNaN(date.getTime())) {

    return "—";

  }



  return new Intl.DateTimeFormat(

    "id-ID",

    {

      day: "2-digit",

      month: "long",

      year: "numeric",

      hour: "2-digit",

      minute: "2-digit",

      timeZone: "Asia/Jakarta",

    },

  ).format(date);

}



function getPaymentTypeLabel(

  paymentType: PaymentType,

): string {

  return paymentType === "PELUNASAN"

    ? "Pelunasan"

    : "DP";

}



function getPaymentStatusLabel(

  payment: CustomerUpcomingPayment,

): string {

  switch (

    payment.payment_link_status

      .trim()

      .toLowerCase()

  ) {

    case "sent":

      return "Link WA sudah dikirim";



    case "scheduled":

      return "Link WA sedang diproses";



    case "failed":

      return "Pengiriman WA gagal";



    default:

      return payment.payment_id

        ? "Link WA belum dikirim"

        : "Payment belum dibuat";

  }

}



function sortCheckoutReadyByMaxTimbun(

  items: CustomerCheckoutReady[],

): CustomerCheckoutReady[] {

  return [...items]

    .filter((item) => Boolean(item.max_timbun))

    .sort((a, b) => {

      const aTime = new Date(

        `${a.max_timbun}T00:00:00+07:00`,

      ).getTime();



      const bTime = new Date(

        `${b.max_timbun}T00:00:00+07:00`,

      ).getTime();



      if (

        Number.isNaN(aTime) &&

        Number.isNaN(bTime)

      ) {

        return 0;

      }



      if (Number.isNaN(aTime)) {

        return 1;

      }



      if (Number.isNaN(bTime)) {

        return -1;

      }



      return aTime - bTime;

    });

}



/* =========================================

   PAGE

========================================= */



export default function CustomerDashboardPage() {

  const customerMemberId = useMemo(() => {

    try {

      const storedMember =

        localStorage.getItem(

          "customer_member",

        );



      if (!storedMember) {

        return null;

      }



      const member = JSON.parse(

        storedMember,

      ) as {

        id?: string;

      };



      return member.id ?? null;

    } catch {

      return null;

    }

  }, []);



  const {

    data,

    isLoading,

    isError,

    error,

    refetch,

    isFetching,

  } = useQuery({

    queryKey: [

      "customer",

      "dashboard",

      customerMemberId,

    ],

    queryFn:

      getCustomerDashboard,

    enabled: Boolean(

      customerMemberId,

    ),

    staleTime: 30_000,

    refetchOnWindowFocus: true,

  });



  const upcomingPayments =

    useMemo(() => {

      const upcomingRecapIds =

        new Set(

          (

            data?.upcoming_recaps ??

            []

          ).map(

            (item) => item.recap_id,

          ),

        );



      return (

        data?.upcoming_payments ??

        []

      )

        .filter(

          (payment) =>

            !upcomingRecapIds.has(

              payment.recap_id,

            ),

        )

        .slice(0, 6);

    }, [

      data?.upcoming_payments,

      data?.upcoming_recaps,

    ]);



  const leftPayments =

    upcomingPayments.slice(0, 3);



  const rightPayments =

    upcomingPayments.slice(3, 6);



  /* =======================================

     LOADING

  ======================================== */



  if (isLoading) {

    return (

      <div className="min-h-screen bg-[#f8faff] text-left">

        <div className="w-full px-6 py-8 lg:px-8">

          <div className="animate-pulse space-y-5">

            <div className="h-28 rounded-2xl bg-white" />



            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

              {Array.from({

                length: 4,

              }).map((_, index) => (

                <div

                  key={index}

                  className="h-32 rounded-2xl bg-white"

                />

              ))}

            </div>



            <div className="h-72 rounded-2xl bg-white" />

          </div>

        </div>

      </div>

    );

  }



  /* =======================================

     ERROR

  ======================================== */



  if (isError || !data) {

    return (

      <div className="min-h-screen bg-[#f8faff] text-left">

        <div className="w-full px-6 py-8 lg:px-8">

          <div className="flex min-h-[70vh] items-center justify-center">

            <div className="w-full rounded-2xl border border-[#e5eaf4] bg-white p-8 text-center shadow-sm">

              <AlertCircle className="mx-auto h-10 w-10 text-red-500" />



              <h1 className="mt-4 text-lg font-semibold text-[#20366f]">

                Dashboard belum dapat dimuat

              </h1>



              <p className="mt-2 text-sm text-[#7a89ad]">

                {error?.message ??

                  "Terjadi kesalahan saat mengambil data dashboard."}

              </p>



              <button

                type="button"

                onClick={() => {

                  void refetch();

                }}

                className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#1457ff] px-4 text-sm font-semibold text-white transition hover:bg-[#0d4be0]"

              >

                <RefreshCw className="h-4 w-4" />

                Coba Lagi

              </button>

            </div>

          </div>

        </div>

      </div>

    );

  }



  const {

    member,

    summary,

    upcoming_recaps,

    checkout_ready,

    announcements,

  } = data;



  const memberTypeLabel =

    getMemberTypeLabel(

      member.type,

    );



  const nearestCheckoutItems =

    sortCheckoutReadyByMaxTimbun(

      checkout_ready,

    ).slice(0, 3);



  return (

    <div className="min-h-screen bg-[#f8faff] text-left">

      <div className="w-full px-6 py-8 lg:px-8 space-y-6">

        {/* =====================================

            HEADER

        ====================================== */}



        <section className="rounded-2xl border border-[#e5eaf4] bg-white px-5 py-5 shadow-sm sm:px-7 sm:py-6">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#142968] sm:text-3xl">

                Halo, {member.name} 👋

              </h1>



              <p className="mt-2 text-sm text-[#7a89ad] sm:text-[15px]">

                Berikut ringkasan pesanan dan pembayaran kamu.

              </p>

            </div>



            <div className="w-fit rounded-xl border border-[#f0d8df] bg-[#fff5f7] px-4 py-3">

              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9a6a78]">

                Status Member

              </p>



              <p className="mt-1 text-sm font-bold text-[#e14f69]">

                {memberTypeLabel}

              </p>

            </div>

          </div>

        </section>



        {/* =====================================

            PENGUMUMAN

        ====================================== */}



        <section className="rounded-2xl border border-[#e5eaf4] bg-white shadow-sm">

          <div className="border-b border-[#edf0f5] px-5 py-4 sm:px-6">

            <div className="flex items-start gap-3">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#edf3ff] text-[#1457ff]">

                <AlertCircle className="h-5 w-5" />

              </div>



              <div className="min-w-0">

                <h2 className="text-base font-bold text-[#20366f] sm:text-lg">

                  Pengumuman

                </h2>



                <p className="mt-1 text-xs text-[#7a89ad] sm:text-sm">

                  Informasi terbaru dari Lecy Soulgo untuk kamu.

                </p>

              </div>

            </div>

          </div>



          <div className="space-y-3 p-4 sm:p-6">

            {announcements.length === 0 ? (

              <EmptyState

                icon={AlertCircle}

                title="Belum ada pengumuman"

                description="Belum ada pengumuman terbaru untuk kamu saat ini."

              />

            ) : (

              announcements.map(

                (announcement) => {

                  const categoryStyle =

                    getAnnouncementCategoryStyle(

                      announcement.category,

                    );



                  return (

                    <article

                      key={

                        announcement.id

                      }

                      className={[

                        "rounded-xl border p-4 sm:p-5",

                        categoryStyle.border,

                        categoryStyle.background,

                      ].join(" ")}

                    >

                      <div className="flex items-start gap-3">

                        <div

                          className={[

                            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm",

                            categoryStyle.iconBackground,

                            categoryStyle.iconText,

                          ].join(" ")}

                        >

                          <AlertCircle className="h-5 w-5" />

                        </div>



                        <div className="min-w-0 flex-1">

                          <div className="flex flex-wrap items-center gap-2">

                            <span

                              className={[

                                "rounded-md px-2 py-1 text-[10px] font-semibold",

                                categoryStyle.badgeBackground,

                                categoryStyle.badgeText,

                              ].join(" ")}

                            >

                              {getAnnouncementCategoryLabel(

                                announcement.category,

                              )}

                            </span>



                            <span className="text-[10px] font-medium text-[#7a89ad]">

                              {formatAnnouncementDate(

                                announcement.published_at,

                              )}

                            </span>

                          </div>



                          <h3 className="mt-3 text-sm font-bold text-[#20366f] sm:text-base">

                            {announcement.title}

                          </h3>



                          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#50628e]">

                            {announcement.content}

                          </p>



                          {announcement.action_solution && (

                            <div className="mt-4 rounded-lg border border-white/80 bg-white/70 px-3 py-3">

                              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#7a89ad]">

                                Tindakan / Solusi

                              </p>



                              <p className="mt-1 whitespace-pre-line text-xs leading-5 text-[#20366f] sm:text-sm">

                                {

                                  announcement.action_solution

                                }

                              </p>

                            </div>

                          )}

                        </div>

                      </div>

                    </article>

                  );

                },

              )

            )}

          </div>

        </section>



        {/* =====================================

            SUMMARY

        ====================================== */}



        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <SummaryCard

            icon={ShoppingBag}

            label="Total Rekapan"

            value={summary.total_recaps}

            helper="Semua rekapan kamu"

          />



          <SummaryCard

            icon={AlertCircle}

            label="Belum Lunas"

            value={summary.unpaid_recaps}

            helper="Masih ada pembayaran"

          />



          <SummaryCard

            icon={Clock3}

            label="Menunggu Pembayaran"

            value={summary.pending_payments}

            helper="Payment berstatus pending"

          />



          <SummaryCard

            icon={CheckCircle2}

            label="Sudah Checkout"

            value={summary.checked_out}

            helper="Barang sudah CO"

          />

        </section>



        {/* =====================================

            UPCOMING PAYMENT

        ====================================== */}



        <section className="rounded-2xl border border-[#e5eaf4] bg-white shadow-sm">

          <div className="flex items-center justify-between gap-4 border-b border-[#edf0f5] px-5 py-4 sm:px-6">

            <div className="flex items-start gap-3">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#edf3ff] text-[#1457ff]">

                <Banknote className="h-5 w-5" />

              </div>



              <div>

                <h2 className="text-base font-bold text-[#20366f] sm:text-lg">

                  Pembayaran Terdekat

                </h2>



                <p className="mt-1 text-xs text-[#7a89ad] sm:text-sm">

                  Maksimal 6 pembayaran yang perlu kamu perhatikan.

                </p>

              </div>

            </div>



            <button

              type="button"

              onClick={() => {

                void refetch();

              }}

              disabled={isFetching}

              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#dfe5f1] bg-white text-[#50628e] transition hover:bg-[#f5f7fc] disabled:cursor-not-allowed disabled:opacity-60"

              title="Refresh dashboard"

              aria-label="Refresh dashboard"

            >

              <RefreshCw

                className={[

                  "h-4 w-4",

                  isFetching

                    ? "animate-spin"

                    : "",

                ].join(" ")}

              />

            </button>

          </div>



          <div className="p-4 sm:p-6">

            {upcomingPayments.length === 0 ? (

              <EmptyState

                icon={CheckCircle2}

                title="Belum ada pembayaran yang menunggu"

                description="Semua pembayaran yang perlu diperhatikan sudah selesai atau belum tersedia."

              />

            ) : (

              <div className="grid gap-4 lg:grid-cols-2">

                {[

                  leftPayments,

                  rightPayments,

                ].map(

                  (

                    payments,

                    columnIndex,

                  ) => (

                    <div

                      key={`payment-column-${columnIndex}`}

                      className="space-y-3"

                    >

                      {payments.map(

                        (payment) => {

                          const paymentKey = `${payment.recap_id}:${payment.payment_type}`;



                          return (

                            <div

                              key={paymentKey}

                              className="rounded-xl border border-[#e7ebf3] bg-[#fbfcff] p-4 sm:p-5"

                            >

                              <div className="flex flex-col gap-4">

                                <div className="min-w-0">

                                  <div className="flex flex-wrap items-center gap-2">

                                    <span className="rounded-md bg-[#edf3ff] px-2 py-1 text-[11px] font-semibold text-[#1457ff]">

                                      {formatCountry(

                                        payment.country,

                                      )}

                                    </span>



                                    <span className="rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-[#50628e] ring-1 ring-[#e5eaf4]">

                                      {getPaymentTypeLabel(

                                        payment.payment_type,

                                      )}

                                    </span>

                                  </div>



                                  <h3 className="mt-3 text-sm font-bold text-[#20366f] sm:text-base">

                                    {payment.batch_name ??

                                      "Batch tidak diketahui"}

                                  </h3>



                                  <p className="mt-1 text-sm text-[#50628e]">

                                    {

                                      payment.detail_barang

                                    }{" "}

                                    <span className="font-medium text-[#7a89ad]">

                                      ×{" "}

                                      {

                                        payment.qty

                                      }

                                    </span>

                                  </p>



                                  <div className="mt-4 grid gap-3 sm:grid-cols-3">

                                    <InfoItem

                                      label="Nominal"

                                      value={formatCurrency(

                                        payment.amount,

                                      )}

                                    />



                                    <InfoItem

                                      label="Jatuh Tempo"

                                      value={formatDate(

                                        payment.due_date,

                                      )}

                                    />



                                    <InfoItem

                                      label="Status Payment Link"

                                      value={getPaymentStatusLabel(

                                        payment,

                                      )}

                                    />

                                  </div>



                                  {payment.penalty_days >

                                    0 && (

                                    <p className="mt-3 text-xs font-medium text-red-500">

                                      Terlambat{" "}

                                      {

                                        payment.penalty_days

                                      }{" "}

                                      hari • Denda{" "}

                                      {formatCurrency(

                                        payment.penalty_amount,

                                      )}

                                    </p>

                                  )}

                                </div>

                              </div>

                            </div>

                          );

                        },

                      )}

                    </div>

                  ),

                )}

              </div>

            )}

          </div>

        </section>



        {/* =====================================

            TWO COLUMN CONTENT

        ====================================== */}



        <div className="grid gap-6 xl:grid-cols-2">

          {/* UPCOMING RECAPS */}



          <DashboardListSection

            icon={CalendarDays}

            title="Rekapan Terbaru"

            subtitle="Batch yang masih akan di-order."

          >

            {upcoming_recaps.length === 0 ? (

              <EmptyState

                icon={CalendarDays}

                title="Belum ada rekapan yang akan di-order"

                description="Belum ada rekapan kamu yang masuk ke batch dengan status Akan di Order."

              />

            ) : (

              <div className="space-y-3">

                {upcoming_recaps.map(

                  (item) => (

                    <DashboardItem

                      key={

                        item.recap_id

                      }

                      badge={formatCountry(

                        item.country,

                      )}

                      title={

                        item.batch_name ??

                        "Batch tidak diketahui"

                      }

                      detail={`${item.detail_barang} × ${item.qty}`}

                    />

                  ),

                )}

              </div>

            )}

          </DashboardListSection>



          {/* CHECKOUT READY */}



          <DashboardListSection

            icon={PackageCheck}

            title="Barang yang Sudah Bisa di Checkout"

            subtitle="Barang yang memenuhi syarat checkout saat ini."

          >

            {nearestCheckoutItems.length ===

            0 ? (

              <EmptyState

                icon={PackageCheck}

                title="Belum ada barang yang siap checkout"

                description="Barang akan muncul di sini setelah memenuhi seluruh syarat checkout."

              />

            ) : (

              <div className="space-y-3">

                {nearestCheckoutItems.map(

                  (item) => (

                    <DashboardItem

                      key={

                        item.recap_id

                      }

                      badge={formatCountry(

                        item.country,

                      )}

                      title={

                        item.batch_name ??

                        "Batch tidak diketahui"

                      }

                      detail={`${item.detail_barang} × ${item.qty}`}

                      trailing={

                        <span className="inline-flex items-center gap-1 rounded-md bg-[#ecfdf3] px-2 py-1 text-[10px] font-semibold text-[#12834f]">

                          <CheckCircle2 className="h-3 w-3" />

                          Siap Checkout

                        </span>

                      }

                    />

                  ),

                )}

              </div>

            )}

          </DashboardListSection>

        </div>

      </div>

    </div>

  );

}



/* =========================================

   SUMMARY CARD

========================================= */



function SummaryCard({

  icon: Icon,

  label,

  value,

  helper,

}: {

  icon: typeof ShoppingBag;

  label: string;

  value: number;

  helper: string;

}) {

  return (

    <div className="rounded-2xl border border-[#e5eaf4] bg-white p-5 shadow-sm">

      <div className="flex items-start justify-between gap-3">

        <div className="min-w-0">

          <p className="text-xs font-medium text-[#7a89ad]">

            {label}

          </p>



          <p className="mt-2 text-2xl font-bold text-[#142968]">

            {value}

          </p>

        </div>



        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf3ff] text-[#1457ff]">

          <Icon className="h-5 w-5" />

        </div>

      </div>



      <p className="mt-3 text-[11px] text-[#9aa4bb]">

        {helper}

      </p>

    </div>

  );

}



/* =========================================

   INFO ITEM

========================================= */



function InfoItem({

  label,

  value,

}: {

  label: string;

  value: string;

}) {

  return (

    <div className="rounded-lg border border-[#e7ebf3] bg-white px-3 py-3">

      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9aa4bb]">

        {label}

      </p>



      <p className="mt-1 text-xs font-semibold text-[#20366f]">

        {value}

      </p>

    </div>

  );

}



/* =========================================

   DASHBOARD LIST SECTION

========================================= */



function DashboardListSection({

  icon: Icon,

  title,

  subtitle,

  children,

}: {

  icon: typeof ShoppingBag;

  title: string;

  subtitle: string;

  children: ReactNode;

}) {

  return (

    <section className="rounded-2xl border border-[#e5eaf4] bg-white shadow-sm">

      <div className="border-b border-[#edf0f5] px-5 py-4 sm:px-6">

        <div className="flex items-start gap-3">

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#edf3ff] text-[#1457ff]">

            <Icon className="h-5 w-5" />

          </div>



          <div className="min-w-0">

            <h2 className="text-base font-bold text-[#20366f]">

              {title}

            </h2>



            <p className="mt-1 text-xs text-[#7a89ad] sm:text-sm">

              {subtitle}

            </p>

          </div>

        </div>

      </div>



      <div className="p-4 sm:p-6">

        {children}

      </div>

    </section>

  );

}



/* =========================================

   DASHBOARD ITEM

========================================= */



function DashboardItem({

  badge,

  title,

  detail,

  trailing,

}: {

  badge: string;

  title: string;

  detail: string;

  trailing?: ReactNode;

}) {

  return (

    <div className="flex items-center gap-3 rounded-xl border border-[#e7ebf3] bg-[#fbfcff] px-4 py-3">

      <div className="min-w-0 flex-1">

        <div className="flex flex-wrap items-center gap-2">

          <span className="rounded-md bg-[#edf3ff] px-2 py-1 text-[10px] font-semibold text-[#1457ff]">

            {badge}

          </span>



          <p className="truncate text-sm font-semibold text-[#20366f]">

            {title}

          </p>

        </div>



        <p className="mt-1 truncate text-xs text-[#7a89ad]">

          {detail}

        </p>

      </div>



      {trailing}

    </div>

  );

}



/* =========================================

   EMPTY STATE

========================================= */



function EmptyState({

  icon: Icon,

  title,

  description,

}: {

  icon: typeof ShoppingBag;

  title: string;

  description: string;

}) {

  return (

    <div className="rounded-xl border border-dashed border-[#dfe5f1] bg-[#fbfcff] px-5 py-10 text-center">

      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#9aa4bb] shadow-sm ring-1 ring-[#e7ebf3]">

        <Icon className="h-5 w-5" />

      </div>



      <p className="mt-3 text-sm font-semibold text-[#20366f]">

        {title}

      </p>



      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[#7a89ad]">

        {description}

      </p>

    </div>

  );

}