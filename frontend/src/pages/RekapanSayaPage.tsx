import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useQuery,
} from "@tanstack/react-query";

import {
  ChevronDown,
  Search,
  Image as ImageIcon,
  X,
} from "lucide-react";

import {
  getCustomerRecaps,
  type CustomerRecap,
} from "@/services/customerRecapService";

import {
  CN,
  ID,
  JP,
  KR,
  TH,
} from "country-flag-icons/react/3x2";

import type {
  FlagComponent,
} from "country-flag-icons/react/3x2";

/* =========================================
   COUNTRY CONFIG
========================================= */

type CustomerRecapWithMaxTimbun = CustomerRecap & {
  max_timbun?: string | null;
};

const countryConfig: Record<
  string,
  {
    name: string;
    flag: FlagComponent;
  }
> = {
  china: {
    name: "China",
    flag: CN,
  },

  indonesia: {
    name: "Indonesia",
    flag: ID,
  },

  jepang: {
    name: "Jepang",
    flag: JP,
  },

  korea: {
    name: "Korea",
    flag: KR,
  },

  thailand: {
    name: "Thailand",
    flag: TH,
  },
};

/* =========================================
   HELPERS
========================================= */

function formatCurrency(
  value: number,
): string {
  return new Intl.NumberFormat(
    "id-ID",
    {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    },
  ).format(value);
}

function formatPaymentDate(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

function formatDueDate(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}

function formatMaxTimbun(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}

function isRecapPaid(
  recap: CustomerRecap,
): boolean {
  return (
    recap.down_payment.status === "paid" &&
    recap.pelunasan.status === "paid"
  );
}

function getCountryInfo(
  country: string | null | undefined,
): {
  name: string;
  flag: FlagComponent | null;
} {
  if (!country) {
    return {
      name: "-",
      flag: null,
    };
  }

  const key =
    country
      .trim()
      .toLowerCase();

  return (
    countryConfig[key] ?? {
      name: country,
      flag: null,
    }
  );
}

/* =========================================
   PAYMENT STATUS
========================================= */

function PaymentInfo({
  payment,
  showDueDate = true,
}: {
  payment: CustomerRecap["down_payment"];
  showDueDate?: boolean;
}) {
  const isPaid =
    payment.status ===
    "paid";

  const paidAt =
    formatPaymentDate(
      payment.paid_at,
    );

  const dueDate =
    formatDueDate(
      payment.due_date,
    );

  return (
    <div className="space-y-1">
      <div className="font-semibold text-gray-900">
        {formatCurrency(
          payment.amount,
        )}
      </div>

      <div
        className={
          isPaid
            ? "text-sm font-medium text-green-600"
            : "text-sm font-medium text-red-500"
        }
      >
        {isPaid
          ? "● Paid"
          : "● Unpaid"}
      </div>

      {showDueDate &&
        dueDate && (
          <div className="text-xs text-gray-500">
            Maks. pembayaran:{" "}
            {dueDate}
          </div>
        )}

      {!isPaid &&
        Number(payment.penalty_days ?? 0) > 0 && (
          <div className="text-xs leading-5">
            <p className="text-red-500">
              Terlambat{" "}
              {payment.penalty_days}{" "}
              hari
            </p>
            <p className="text-gray-900">
              Denda +{" "}
              {formatCurrency(
                Number(
                  payment.penalty_amount ??
                    0,
                ),
              )}
            </p>
          </div>
        )}

      {isPaid &&
        paidAt && (
          <div className="text-xs text-gray-500">
            {paidAt}
          </div>
        )}
    </div>
  );
}

/* =========================================
   CHECKED OUT STATUS
========================================= */

function CheckoutStatus({
  checkedOut,
}: {
  checkedOut: boolean;
}) {
  return (
    <span
      className={
        checkedOut
          ? "inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-600"
          : "inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-500"
      }
    >
      {checkedOut
        ? "✓ Sudah CO"
        : "— Belum CO"}
    </span>
  );
}

/* =========================================
   COUNTRY DISPLAY
========================================= */

function CountryDisplay({
  country,
}: {
  country: string | null | undefined;
}) {
  const info =
    getCountryInfo(country);

  const Flag =
    info.flag;

  return (
    <div className="flex items-center gap-2">
      {Flag ? (
        <Flag
          title={info.name}
          className="h-5 w-7 shrink-0"
        />
      ) : (
        <div className="h-5 w-7 shrink-0 rounded bg-gray-100" />
      )}

      <span className="text-sm font-medium text-gray-800">
        {info.name}
      </span>
    </div>
  );
}

/* =========================================
   PRODUCT IMAGE
========================================= */

function ProductImage({
  recap,
  onPreview,
  disabled = false,
}: {
  recap: CustomerRecap;
  onPreview: (
    image: string,
    title: string,
  ) => void;
  disabled?: boolean;
}) {
  if (!recap.product_image) {
    return (
      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
        <ImageIcon
          size={22}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() =>
        onPreview(
          recap.product_image!,
          recap.batch_name ??
            "Produk",
        )
      }
      className={[
        "group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100 transition",
        disabled
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer",
      ].join(" ")}
    >
      <img
        src={recap.product_image}
        alt={
          recap.batch_name ??
          "Produk"
        }
        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
      />
    </button>
  );
}

/* =========================================
   MAIN PAGE
========================================= */

export default function RekapanSaya() {
  const [search, setSearch] =
    useState("");

  const [
    selectedCountry,
    setSelectedCountry,
  ] = useState("all");

  const [
    paymentFilter,
    setPaymentFilter,
  ] = useState<"all" | "paid" | "unpaid">(
    "all",
  );

  const [
    isCountryDropdownOpen,
    setIsCountryDropdownOpen,
  ] = useState(false);

  const [
    isPaymentDropdownOpen,
    setIsPaymentDropdownOpen,
  ] = useState(false);

  const countryDropdownRef =
    useRef<HTMLDivElement>(null);

  const paymentDropdownRef =
    useRef<HTMLDivElement>(null);

  const [
    preview,
    setPreview,
  ] = useState<{
    image: string;
    title: string;
  } | null>(null);

  const {
    data: recaps = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [
      "customer",
      "recaps",
    ],
    queryFn:
      getCustomerRecaps,
  });

  const isHnr =
    recaps.some(
      (recap) =>
        recap.member_type ===
        "hnr",
    );

  /* -------------------------------------
     FILTER
  ------------------------------------- */

  const filteredRecaps =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      const filtered = recaps.filter(
        (recap) => {
          const matchesSearch =
            !keyword ||
            recap.batch_name
              ?.toLowerCase()
              .includes(
                keyword,
              ) ||
            recap.detail_barang
              ?.toLowerCase()
              .includes(
                keyword,
              );

          const matchesCountry =
            selectedCountry ===
              "all" ||
            recap.country
              ?.toLowerCase() ===
              selectedCountry;

          const recapIsPaid =
            isRecapPaid(recap);

          const matchesPaymentStatus =
            paymentFilter === "all" ||
            (paymentFilter === "paid" &&
              recapIsPaid) ||
            (paymentFilter === "unpaid" &&
              !recapIsPaid);

          return (
            matchesSearch &&
            matchesCountry &&
            matchesPaymentStatus
          );
        },
      );

      if (paymentFilter !== "unpaid") {
        return filtered;
      }

      return filtered.sort(
        (a, b) => {
          const aPendingPayments = [
            {
              status:
                a.down_payment.status,
              dueDate:
                a.down_payment.due_date,
            },
            {
              status:
                a.pelunasan.status,
              dueDate:
                a.pelunasan.due_date,
            },
          ].filter(
            (payment) =>
              payment.status !== "paid" &&
              payment.dueDate,
          );

          const bPendingPayments = [
            {
              status:
                b.down_payment.status,
              dueDate:
                b.down_payment.due_date,
            },
            {
              status:
                b.pelunasan.status,
              dueDate:
                b.pelunasan.due_date,
            },
          ].filter(
            (payment) =>
              payment.status !== "paid" &&
              payment.dueDate,
          );

          const aNearestDueDate =
            aPendingPayments.length > 0
              ? Math.min(
                  ...aPendingPayments.map(
                    (payment) =>
                      new Date(
                        payment.dueDate!,
                      ).getTime(),
                  ),
                )
              : Number.POSITIVE_INFINITY;

          const bNearestDueDate =
            bPendingPayments.length > 0
              ? Math.min(
                  ...bPendingPayments.map(
                    (payment) =>
                      new Date(
                        payment.dueDate!,
                      ).getTime(),
                  ),
                )
              : Number.POSITIVE_INFINITY;

          return (
            aNearestDueDate -
            bNearestDueDate
          );
        },
      );
    }, [
      recaps,
      search,
      selectedCountry,
      paymentFilter,
    ]);

  /* -------------------------------------
     COUNTRIES
  ------------------------------------- */

  const countries =
    useMemo(() => {
      const unique =
        new Set(
          recaps
            .map(
              (recap) =>
                recap.country
                  ?.trim()
                  .toLowerCase(),
            )
            .filter(
              (
                country,
              ): country is string =>
                Boolean(country),
            ),
        );

      return Array.from(
        unique,
      );
    }, [recaps]);

  /* -------------------------------------
     CLOSE FILTER DROPDOWNS
  ------------------------------------- */

  useEffect(() => {
    function handleClickOutside(
      event: MouseEvent,
    ) {
      const target = event.target as Node;

      if (
        countryDropdownRef.current &&
        !countryDropdownRef.current.contains(
          target,
        )
      ) {
        setIsCountryDropdownOpen(
          false,
        );
      }

      if (
        paymentDropdownRef.current &&
        !paymentDropdownRef.current.contains(
          target,
        )
      ) {
        setIsPaymentDropdownOpen(
          false,
        );
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
    };
  }, []);

  /* -------------------------------------
     LOADING
  ------------------------------------- */

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />

          <div className="h-12 rounded bg-gray-200" />

          <div className="h-32 rounded bg-gray-200" />

          <div className="h-32 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  /* -------------------------------------
     ERROR
  ------------------------------------- */

  if (isError) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-600">
          {error instanceof Error
            ? error.message
            : "Gagal mengambil data rekapan."}
        </div>
      </div>
    );
  }

  /* -------------------------------------
     RENDER
  ------------------------------------- */

  return (
    <>
      <div className="space-y-6 p-6">

        {/* HEADER */}

        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Rekapan Saya
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Berikut adalah seluruh
            rekapan pembelian kamu.
          </p>

          {isHnr && (
            <div className="mt-3 inline-flex items-center rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600">
              Status Member: HNR
            </div>
          )}
        </div>

        {/* FILTER */}

        <div className="flex flex-col gap-3 md:flex-row">

          {/* SEARCH */}

          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Cari nama batch..."
              className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-gray-400"
            />
          </div>

          {/* COUNTRY */}

          <div
            ref={countryDropdownRef}
            className="relative w-full md:w-[220px]"
          >
            <button
              type="button"
              onClick={() =>
                setIsCountryDropdownOpen(
                  (current) => !current,
                )
              }
              className="flex h-11 w-full items-center justify-between rounded-lg border border-[#d8dfec] bg-white px-3 text-left text-sm text-[#20366f] outline-none transition hover:border-[#bfcbe0] focus:border-[#1457ff]"
            >
              <div className="flex min-w-0 items-center gap-2">
                {selectedCountry ===
                "all" ? (
                  <span className="truncate font-medium text-[#20366f]">
                    Semua Negara
                  </span>
                ) : (
                  (() => {
                    const info =
                      getCountryInfo(
                        selectedCountry,
                      );
                    const Flag =
                      info.flag;

                    return (
                      <>
                        {Flag ? (
                          <Flag
                            title={
                              info.name
                            }
                            className="h-5 w-7 shrink-0"
                          />
                        ) : null}

                        <span className="truncate font-medium text-[#20366f]">
                          {info.name}
                        </span>
                      </>
                    );
                  })()
                )}
              </div>

              <ChevronDown
                className={[
                  "h-4 w-4 shrink-0 text-[#7a89ad] transition-transform",
                  isCountryDropdownOpen
                    ? "rotate-180"
                    : "",
                ].join(" ")}
              />
            </button>

            {isCountryDropdownOpen && (
              <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-lg border border-[#d8dfec] bg-white shadow-lg">
                <div className="max-h-56 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCountry(
                        "all",
                      );
                      setIsCountryDropdownOpen(
                        false,
                      );
                    }}
                    className={[
                      "flex h-11 w-full items-center px-4 text-left text-sm transition",
                      selectedCountry ===
                      "all"
                        ? "bg-[#edf3ff] text-[#1457ff]"
                        : "text-[#20366f] hover:bg-[#f8faff]",
                    ].join(" ")}
                  >
                    Semua Negara
                  </button>

                  {countries.map(
                    (country) => {
                      const info =
                        getCountryInfo(
                          country,
                        );
                      const Flag =
                        info.flag;
                      const isSelected =
                        country ===
                        selectedCountry;

                      return (
                        <button
                          key={country}
                          type="button"
                          onClick={() => {
                            setSelectedCountry(
                              country,
                            );
                            setIsCountryDropdownOpen(
                              false,
                            );
                          }}
                          className={[
                            "flex h-12 w-full items-center gap-3 px-4 text-left transition",
                            isSelected
                              ? "bg-[#edf3ff]"
                              : "hover:bg-[#f8faff]",
                          ].join(" ")}
                        >
                          {Flag ? (
                            <Flag
                              title={
                                info.name
                              }
                              className="h-5 w-7 shrink-0"
                            />
                          ) : (
                            <div className="h-5 w-7 shrink-0 rounded bg-gray-100" />
                          )}

                          <span
                            className={[
                              "text-sm",
                              isSelected
                                ? "font-medium text-[#1457ff]"
                                : "text-[#20366f]",
                            ].join(" ")}
                          >
                            {info.name}
                          </span>

                          {isSelected && (
                            <span className="ml-auto text-xs font-medium text-[#1457ff]">
                              Dipilih
                            </span>
                          )}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>
            )}
          </div>

          {/* PAYMENT STATUS */}

          <div
            ref={paymentDropdownRef}
            className="relative w-full md:w-[220px]"
          >
            <button
              type="button"
              onClick={() =>
                setIsPaymentDropdownOpen(
                  (current) => !current,
                )
              }
              className="flex h-11 w-full items-center justify-between rounded-lg border border-[#d8dfec] bg-white px-3 text-left text-sm text-[#20366f] outline-none transition hover:border-[#bfcbe0] focus:border-[#1457ff]"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate font-medium text-[#20366f]">
                  {paymentFilter === "all"
                    ? "Semua Pembayaran"
                    : paymentFilter === "paid"
                      ? "Paid"
                      : "Unpaid"}
                </span>
              </div>

              <ChevronDown
                className={[
                  "h-4 w-4 shrink-0 text-[#7a89ad] transition-transform",
                  isPaymentDropdownOpen
                    ? "rotate-180"
                    : "",
                ].join(" ")}
              />
            </button>

            {isPaymentDropdownOpen && (
              <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-lg border border-[#d8dfec] bg-white shadow-lg">
                <div className="max-h-56 overflow-y-auto">
                  {[
                    {
                      value: "all" as const,
                      label: "Semua Pembayaran",
                    },
                    {
                      value: "paid" as const,
                      label: "Paid",
                    },
                    {
                      value: "unpaid" as const,
                      label: "Unpaid",
                    },
                  ].map((option) => {
                    const isSelected =
                      paymentFilter ===
                      option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setPaymentFilter(
                            option.value,
                          );
                          setIsPaymentDropdownOpen(
                            false,
                          );
                        }}
                        className={[
                          "flex h-12 w-full items-center px-4 text-left transition",
                          isSelected
                            ? "bg-[#edf3ff] text-[#1457ff]"
                            : "text-[#20366f] hover:bg-[#f8faff]",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "text-sm",
                            isSelected
                              ? "font-medium text-[#1457ff]"
                              : "text-[#20366f]",
                          ].join(" ")}
                        >
                          {option.label}
                        </span>

                        {isSelected && (
                          <span className="ml-auto text-xs font-medium text-[#1457ff]">
                            Dipilih
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* EMPTY */}

        {recaps.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <ImageIcon
                size={24}
              />
            </div>

            <h2 className="mt-4 text-base font-semibold text-gray-900">
              Belum Ada Rekapan
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Saat ini belum ada
              rekapan pembelian
              yang tersedia untuk
              kamu.
            </p>
          </div>
        )}

        {/* NO FILTER RESULT */}

        {recaps.length > 0 &&
          filteredRecaps.length ===
            0 && (
            <div className="rounded-xl border border-gray-200 bg-white py-12 text-center">
              <p className="text-sm text-gray-500">
                Rekapan tidak
                ditemukan.
              </p>
            </div>
          )}

        {/* DESKTOP TABLE */}

        {filteredRecaps.length >
          0 && (
          <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white md:block">
            <table className="w-full min-w-[1100px]">

              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Negara
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Nama Batch
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Gambar Produk
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Total
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Maksimal DP
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Down Payment
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Maksimal Pelunasan
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Pelunasan
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Maksimal Timbun
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Sudah CO?
                  </th>

                </tr>
              </thead>

              <tbody>
                {filteredRecaps.map(
                  (recap) => {
                    return (
                      <tr
                        key={
                          recap.id
                        }
                        className={[
                          "border-b border-gray-100 last:border-b-0 transition",
                          recap.member_type === "hnr"
                            ? "bg-gray-50 opacity-60"
                            : "bg-white",
                        ].join(" ")}
                      >

                        {/* COUNTRY */}

                        <td className="px-5 py-5">
                          <CountryDisplay
                            country={
                              recap.country
                            }
                          />
                        </td>

                        {/* BATCH */}

                        <td className="px-5 py-5">
                          <div className="max-w-[180px]">

                            <div className="flex items-center gap-2">
                              <div className="font-semibold text-gray-900">
                                {
                                  recap.batch_name
                                }
                              </div>

                              {recap.member_type === "hnr" && (
                                <span className="rounded-md bg-red-50 px-2 py-1 text-[10px] font-bold text-red-600">
                                  HNR
                                </span>
                              )}
                            </div>

                            <div className="mt-1 text-xs text-gray-500">
                              {
                                recap.detail_barang
                              }
                            </div>

                          </div>
                        </td>

                        {/* PRODUCT IMAGE */}

                        <td className="px-5 py-5">
                          <ProductImage
                            recap={
                              recap
                            }
                            disabled={
                              recap.member_type ===
                              "hnr"
                            }
                            onPreview={(
                              image,
                              title,
                            ) =>
                              setPreview(
                                {
                                  image,
                                  title,
                                },
                              )
                            }
                          />
                        </td>

                        {/* TOTAL */}

                        <td className="px-5 py-5">
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(
                              recap.total_harga,
                            )}
                          </span>
                        </td>

                        {/* MAKSIMAL DP */}

                        <td className="px-5 py-5">
                          <div className="text-sm font-medium text-gray-800">
                            {formatDueDate(
                              recap.down_payment.due_date,
                            ) ?? "—"}
                          </div>
                        </td>

                        {/* DOWN PAYMENT */}

                        <td className="px-5 py-5">
                          <PaymentInfo
                            payment={
                              recap.down_payment
                            }
                            showDueDate={false}
                          />
                        </td>

                        {/* MAKSIMAL PELUNASAN */}

                        <td className="px-5 py-5">
                          <div className="text-sm font-medium text-gray-800">
                            {formatDueDate(
                              recap.pelunasan.due_date,
                            ) ?? "—"}
                          </div>
                        </td>

                        {/* PELUNASAN */}

                        <td className="px-5 py-5">
                          <PaymentInfo
                            payment={
                              recap.pelunasan
                            }
                            showDueDate={false}
                          />
                        </td>

                        {/* MAKSIMAL TIMBUN */}

                        <td className="px-5 py-5">
                          <div className="text-sm font-medium text-gray-800">
                            {formatMaxTimbun(
                              (recap as CustomerRecapWithMaxTimbun)
                                .max_timbun,
                            ) ?? "—"}
                          </div>
                        </td>

                        {/* CHECKOUT */}

                        <td className="px-5 py-5">
                          <CheckoutStatus
                            checkedOut={
                              recap.sudah_co
                            }
                          />
                        </td>

                      </tr>
                    );
                  },
                )}
              </tbody>

            </table>
          </div>
        )}

        {/* MOBILE */}

        {filteredRecaps.length >
          0 && (
          <div className="space-y-4 md:hidden">

            {filteredRecaps.map(
              (recap) => {
                return (
                  <div
                    key={
                      recap.id
                    }
                    className={[
                      "rounded-xl border border-gray-200 p-4 transition",
                      recap.member_type === "hnr"
                        ? "bg-gray-50 opacity-60"
                        : "bg-white",
                    ].join(" ")}
                  >

                    {/* COUNTRY */}

                    <div className="flex items-center justify-between">

                      <CountryDisplay
                        country={
                          recap.country
                        }
                      />

                      <CheckoutStatus
                        checkedOut={
                          recap.sudah_co
                        }
                      />

                    </div>

                    {/* BATCH + IMAGE */}

                    <div className="mt-4 flex gap-3">

                      <ProductImage
                        recap={
                          recap
                        }
                        disabled={
                          recap.member_type ===
                          "hnr"
                        }
                        onPreview={(
                          image,
                          title,
                        ) =>
                          setPreview(
                            {
                              image,
                              title,
                            },
                          )
                        }
                      />

                      <div className="min-w-0">

                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">
                            {
                              recap.batch_name
                            }
                          </h3>

                          {recap.member_type === "hnr" && (
                            <span className="rounded-md bg-red-50 px-2 py-1 text-[10px] font-bold text-red-600">
                              HNR
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-sm text-gray-500">
                          {
                            recap.detail_barang
                          }
                        </p>

                      </div>

                    </div>

                    {/* TOTAL */}

                    <div className="mt-5 border-t border-gray-100 pt-4">

                      <div className="text-xs text-gray-500">
                        Total
                      </div>

                      <div className="mt-1 text-base font-bold text-gray-900">
                        {formatCurrency(
                          recap.total_harga,
                        )}
                      </div>

                    </div>

                    {/* PAYMENT */}

                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">

                      <div>

                        <div className="mb-1 text-xs font-medium text-gray-500">
                          Down Payment
                        </div>

                        <PaymentInfo
                          payment={
                            recap.down_payment
                          }
                        />

                      </div>

                      <div>

                        <div className="mb-1 text-xs font-medium text-gray-500">
                          Pelunasan
                        </div>

                        <PaymentInfo
                          payment={
                            recap.pelunasan
                          }
                        />

                      </div>

                      <div>

                        <div className="mb-1 text-xs font-medium text-gray-500">
                          Maksimal Timbun
                        </div>

                        <div className="text-sm font-medium text-gray-800">
                          {formatMaxTimbun(
                            (recap as CustomerRecapWithMaxTimbun)
                              .max_timbun,
                          ) ?? "—"}
                        </div>

                      </div>

                    </div>

                  </div>
                );
              },
            )}

          </div>
        )}

      </div>

      {/* IMAGE PREVIEW MODAL */}

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() =>
            setPreview(null)
          }
        >

          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <button
              type="button"
              onClick={() =>
                setPreview(null)
              }
              className="absolute -right-3 -top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 shadow"
            >
              <X size={18} />
            </button>

            <img
              src={preview.image}
              alt={preview.title}
              className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain"
            />

            <div className="mt-3 text-center text-sm font-medium text-white">
              {preview.title}
            </div>

          </div>

        </div>
      )}

    </>
  );
}