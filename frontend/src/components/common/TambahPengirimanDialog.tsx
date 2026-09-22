import {
  createPortal,
} from "react-dom";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  Check,
  ChevronDown,
  Search,
  X,
} from "lucide-react";

import {
  createManualShipment,
  getManualShipmentOptions,
  type ManualShipment,
  type ManualShipmentExpedition,
  type ManualShipmentOptionItem,
} from "@/services/manualShippingService";
import {
  getMembers,
  type Member,
} from "@/services/memberService";

type FormState = {
  member_id: string;
  recap_ids: string[];
  address: string;
  expedition:
    | ManualShipmentExpedition
    | "";
  due_date: string;
};

type Props = {
  open: boolean;
  batchId: string | null;
  onClose: () => void;
  onSaved?: (
    shipment: ManualShipment,
  ) => void;
  isCustomer?: boolean;
};

const EXPEDITION_OPTIONS: ManualShipmentExpedition[] =
  [
    "JNE",
    "J&T",
    "Sicepat",
    "Grab/Gojek Instant",
  ];

function createDefaultForm(): FormState {
  return {
    member_id: "",
    recap_ids: [],
    address: "",
    expedition: "",
    due_date: "",
  };
}

function formatBatchCountry(
  value: string | null | undefined,
): string {
  if (!value) {
    return "-";
  }

  const normalized =
    value.trim().toLowerCase();

  const countryMap: Record<
    string,
    string
  > = {
    china: "China",
    indonesia: "Indonesia",
    jepang: "Jepang",
    korea: "Korea",
    thailand: "Thailand",
  };

  return (
    countryMap[normalized] ??
    value
  );
}

type DropdownPosition = {
  top: number;
  left: number;
  width: number;
};

type DropdownPortalProps = {
  open: boolean;
  position: DropdownPosition | null;
  children: ReactNode;
  className?: string;
};

function DropdownPortal({
  open,
  position,
  children,
  className = "",
}: DropdownPortalProps) {
  if (!open || !position) {
    return null;
  }

  return createPortal(
    <div
      className={`fixed z-[2147483647] ${className}`}
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

export default function TambahPengirimanDialog({
  open,
  batchId,
  onClose,
  onSaved,
  isCustomer = false,
}: Props) {
  const queryClient =
    useQueryClient();

  const [
    form,
    setForm,
  ] = useState<FormState>(
    createDefaultForm(),
  );

  const [
    formError,
    setFormError,
  ] = useState("");

  const [
    isItemDropdownOpen,
    setIsItemDropdownOpen,
  ] = useState(false);

  const [
    isMemberDropdownOpen,
    setIsMemberDropdownOpen,
  ] = useState(false);

  const [
    isExpeditionDropdownOpen,
    setIsExpeditionDropdownOpen,
  ] = useState(false);

  const [
    dropdownPosition,
    setDropdownPosition,
  ] = useState<DropdownPosition | null>(null);

  const [
    memberSearch,
    setMemberSearch,
  ] = useState("");

  const memberButtonRef =
    useRef<HTMLButtonElement | null>(null);

  const itemButtonRef =
    useRef<HTMLButtonElement | null>(null);

  const expeditionButtonRef =
    useRef<HTMLButtonElement | null>(null);

  function updateDropdownPosition(
    element: HTMLElement | null,
    estimatedHeight = 300,
  ) {
    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const gap = 8;
    const viewportPadding = 12;

    const availableBelow =
      window.innerHeight - rect.bottom - viewportPadding;

    const availableAbove =
      rect.top - viewportPadding;

    const shouldOpenAbove =
      availableBelow < estimatedHeight &&
      availableAbove > availableBelow;

    const top = shouldOpenAbove
      ? Math.max(
          viewportPadding,
          rect.top - estimatedHeight - gap,
        )
      : rect.bottom + gap;

    setDropdownPosition({
      top,
      left: rect.left,
      width: rect.width,
    });
  }

  useEffect(() => {
    const anyDropdownOpen =
      isMemberDropdownOpen ||
      isItemDropdownOpen ||
      isExpeditionDropdownOpen;

    if (!anyDropdownOpen) {
      return;
    }

    const update = () => {
      if (isMemberDropdownOpen) {
        updateDropdownPosition(
          memberButtonRef.current,
          320,
        );
        return;
      }

      if (isItemDropdownOpen) {
        updateDropdownPosition(
          itemButtonRef.current,
          340,
        );
        return;
      }

      if (isExpeditionDropdownOpen) {
        updateDropdownPosition(
          expeditionButtonRef.current,
          260,
        );
      }
    };

    update();

    window.addEventListener(
      "resize",
      update,
    );
    window.addEventListener(
      "scroll",
      update,
      true,
    );

    return () => {
      window.removeEventListener(
        "resize",
        update,
      );
      window.removeEventListener(
        "scroll",
        update,
        true,
      );
    };
  }, [
    isMemberDropdownOpen,
    isItemDropdownOpen,
    isExpeditionDropdownOpen,
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const customerMember = isCustomer
      ? JSON.parse(
          localStorage.getItem("customer_member") ?? "null",
        )
      : null;

    setForm({
      ...createDefaultForm(),
      member_id: customerMember?.id ?? "",
    });
    setFormError("");
    setIsItemDropdownOpen(false);
    setIsMemberDropdownOpen(false);
    setIsExpeditionDropdownOpen(false);
    setDropdownPosition(null);
    setMemberSearch("");
  }, [
    open,
    batchId,
  ]);

  const membersQuery = useQuery<Member[], Error>({
    queryKey: ["members"],
    queryFn: () => getMembers(),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  /*
   * Ambil options tanpa batchId untuk
   * daftar Nama Pembeli.
   *
   * API ini sudah terbukti mengembalikan:
   * members = member yang pernah membeli.
   */
  const buyerOptionsQuery =
    useQuery({
      queryKey: [
        "manual-shipment-buyers",
      ],
      queryFn: () =>
        getManualShipmentOptions(),
      enabled:
        open,
      staleTime: 30_000,
    });

  /*
   * Ambil item berdasarkan batch yang
   * sedang dibuka.
   */
  console.log(
    "=== BUYER QUERY ===",
    {
      open,
      isLoading:
        buyerOptionsQuery.isLoading,
      isError:
        buyerOptionsQuery.isError,
      error:
        buyerOptionsQuery.error,
      data:
        buyerOptionsQuery.data,
    },
  );

  const optionsQuery =
    useQuery({
      queryKey: [
        "manual-shipment-options",
        batchId,
      ],
      queryFn: () =>
        getManualShipmentOptions(
          batchId ?? undefined,
        ),
      enabled:
        open &&
        Boolean(batchId),
      staleTime: 30_000,
    });

  console.log(
    "=== ITEM QUERY ===",
    {
      open,
      batchId,
      isLoading:
        optionsQuery.isLoading,
      isError:
        optionsQuery.isError,
      error:
        optionsQuery.error,
      data:
        optionsQuery.data,
    },
  );

  const createMutation =
    useMutation({
      mutationFn:
        createManualShipment,

      onSuccess:
        async (
          shipment,
        ) => {
          await queryClient.invalidateQueries(
            {
              queryKey: [
                "manual-shipments",
                batchId,
              ],
            },
          );

          onSaved?.(
            shipment,
          );

          onClose();
        },

      onError:
        (
          error,
        ) => {
          setFormError(
            error instanceof Error
              ? error.message
              : "Gagal menambahkan pengiriman.",
          );
        },
    });

  const availableItems =
    optionsQuery.data?.items ??
    [];

  const availableMembers =
    buyerOptionsQuery.data?.members ??
    [];

  const filteredMembers =
    useMemo(() => {
      const keyword =
        memberSearch.trim().toLowerCase();

      if (!keyword) {
        return availableMembers;
      }

      return availableMembers.filter(
        (member) => {
          const name =
            member.name?.toLowerCase() ?? "";

          const phone =
            member.phone?.toLowerCase() ?? "";

          return (
            name.includes(keyword) ||
            phone.includes(keyword)
          );
        },
      );
    }, [
      availableMembers,
      memberSearch,
    ]);

  console.log(
    "=== AVAILABLE DATA ===",
    {
      availableMembers,
      availableItems,
      memberCount:
        availableMembers.length,
      itemCount:
        availableItems.length,
      selectedMemberId:
        form.member_id,
    },
  );

  const filteredItems =
    useMemo<
      ManualShipmentOptionItem[]
    >(
      () => {
        if (
          !form.member_id
        ) {
          return [];
        }

        return availableItems.filter(
          (item) =>
            item.member_id ===
            form.member_id,
        );
      },
      [
        availableItems,
        form.member_id,
      ],
    );

  console.log(
    "=== FILTERED ITEMS ===",
    {
      selectedMemberId:
        form.member_id,
      filteredItems,
      filteredItemCount:
        filteredItems.length,
    },
  );

  const selectedItems =
    useMemo(
      () =>
        filteredItems.filter(
          (item) =>
            form.recap_ids.includes(
              item.recap_id,
            ),
        ),
      [
        filteredItems,
        form.recap_ids,
      ],
    );

  const selectedMemberFromMembers =
    membersQuery.data?.find(
      (member) => member.id === form.member_id,
    );

  const isHnrCustomer =
    selectedMemberFromMembers?.type === "hnr";



  if (!open) {
    return null;
  }

  function toggleItem(
    recapId: string,
  ) {
    if (isHnrCustomer) {
      return;
    }

    setForm(
      (current) => {
        const exists =
          current.recap_ids.includes(
            recapId,
          );

        return {
          ...current,
          recap_ids: exists
            ? current.recap_ids.filter(
                (
                  id,
                ) =>
                  id !== recapId,
              )
            : [
                ...current.recap_ids,
                recapId,
              ],
        };
      },
    );

    setFormError("");
  }

  function handleMemberChange(
    memberId: string,
  ) {
    console.log(
      "=== MEMBER SELECTED ===",
      {
        memberId,
        availableMembers,
        matchingMember:
          availableMembers.find(
            (member) =>
              member.id ===
              memberId,
          ),
        availableItems,
        matchingItems:
          availableItems.filter(
            (item) =>
              item.member_id ===
              memberId,
          ),
      },
    );
    setForm({
      ...createDefaultForm(),
      member_id: memberId,
    });

    setFormError("");
    setIsItemDropdownOpen(
      false,
    );
    setIsMemberDropdownOpen(false);
    setIsExpeditionDropdownOpen(false);
    setDropdownPosition(null);
    setMemberSearch("");
  }

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setFormError("");

    if (isHnrCustomer) {
      return;
    }

    if (!batchId) {
      setFormError(
        "Batch pengiriman tidak ditemukan.",
      );
      return;
    }

    if (
      !form.member_id
    ) {
      setFormError(
        "Nama pembeli wajib dipilih.",
      );
      return;
    }

    if (
      form.recap_ids.length === 0
    ) {
      setFormError(
        "Minimal satu barang harus dipilih.",
      );
      return;
    }

    if (
      !form.address.trim()
    ) {
      setFormError(
        "Alamat lengkap wajib diisi.",
      );
      return;
    }

    if (
      !form.expedition
    ) {
      setFormError(
        "Ekspedisi wajib dipilih.",
      );
      return;
    }


    createMutation.mutate({
      batch_id:
        batchId,

      member_id:
        form.member_id,

      recap_ids:
        form.recap_ids,

      address:
        form.address.trim(),

      expedition:
        form.expedition,

      due_date:
        form.due_date,
    });
  }

  if (!batchId) {
    return null;
  }

  const selectedMember =
    availableMembers.find(
      (member) =>
        member.id ===
        form.member_id,
    );

  return createPortal(
    <div
      className="fixed flex items-center justify-center bg-slate-900/50 p-4"
      style={{
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 2147483646,
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* HEADER */}

        <div className="flex shrink-0 items-start justify-between border-b border-[#e5eaf4] px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-[#20366f]">
              Tambah Pengiriman
            </h2>

            <p className="mt-1 text-sm text-[#7a89ad]">
              Menambahkan
              pengiriman untuk
              barang yang di
              Checkout.
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            disabled={
              createMutation.isPending
            }
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Tutup"
          >
            <X size={20} />
          </button>
        </div>

        {/* FORM */}

        <form
          onSubmit={
            handleSubmit
          }
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="overflow-y-auto px-6 py-6">
            {formError && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-medium text-red-600">
                  {formError}
                </p>
              </div>
            )}

            {optionsQuery.isError && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-medium text-red-600">
                  Gagal mengambil
                  data pilihan
                  pengiriman.
                </p>

                <p className="mt-1 text-xs text-red-500">
                  {
                    optionsQuery.error
                      ?.message
                  }
                </p>
              </div>
            )}

            {buyerOptionsQuery.isError && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-medium text-red-600">
                  Gagal mengambil
                  data pembeli.
                </p>

                <p className="mt-1 text-xs text-red-500">
                  {
                    buyerOptionsQuery.error
                      ?.message
                  }
                </p>
              </div>
            )}

            {/* NAMA PEMBELI */}

            <div>
              <label
                htmlFor="manual-shipment-member"
                className="mb-2 block text-sm font-medium text-[#405274]"
              >
                Nama Pembeli
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <div className="relative z-20">
                <button
                  ref={memberButtonRef}
                  type="button"
                  onClick={(event) => {
                    const nextState =
                      !isMemberDropdownOpen;

                    setIsMemberDropdownOpen(
                      nextState,
                    );
                    setIsItemDropdownOpen(false);
                    setIsExpeditionDropdownOpen(false);

                    if (nextState) {
                      setMemberSearch("");

                      updateDropdownPosition(
                        event.currentTarget,
                        320,
                      );
                    } else {
                      setDropdownPosition(null);
                    }
                  }}
                  disabled={
                    isCustomer ||
                    buyerOptionsQuery.isLoading ||
                    createMutation.isPending
                  }
                  className="flex min-h-12 w-full items-center justify-between rounded-lg border border-[#d9e0ef] bg-white px-4 py-3 text-left text-sm text-[#20366f] outline-none transition hover:border-slate-300 focus:border-[#1457ff] disabled:cursor-not-allowed disabled:bg-[#f7f9fc]"
                >
                  <span className="min-w-0 truncate">
                    {buyerOptionsQuery.isLoading
                      ? "Memuat pembeli..."
                      : selectedMember
                        ? isCustomer
                          ? `${selectedMember.name} - ${selectedMember.phone}`
                          : selectedMember.name
                        : "Pilih nama pembeli"}
                  </span>

                  <ChevronDown
                    size={18}
                    className={[
                      "shrink-0 text-[#536795] transition-transform",
                      isMemberDropdownOpen
                        ? "rotate-180"
                        : "",
                    ].join(" ")}
                  />
                </button>

                <DropdownPortal
                  open={
                    isMemberDropdownOpen &&
                    !isCustomer
                  }
                  position={dropdownPosition}
                >
                  <div className="overflow-hidden rounded-xl border border-[#d9e0ef] bg-white p-2 shadow-xl">
                    <div className="border-b border-[#edf1f7] pb-2">
                      <div className="relative">
                        <Search
                          size={16}
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa6bf]"
                        />

                        <input
                          type="text"
                          value={memberSearch}
                          onChange={(event) =>
                            setMemberSearch(
                              event.target.value,
                            )
                          }
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                          placeholder="Cari nama atau nomor WA"
                          autoFocus
                          className="h-11 w-full rounded-lg border border-[#d9e0ef] bg-white pl-9 pr-3 text-sm text-[#20366f] outline-none placeholder:text-[#9aa6bf] focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10"
                        />
                      </div>
                    </div>

                    <div className="max-h-56 overflow-y-auto pt-1">
                      {availableMembers.length === 0 ? (
                        <div className="px-3 py-5 text-center">
                          <p className="text-sm text-[#7a89ad]">
                            Belum ada pembeli yang tersedia.
                          </p>
                        </div>
                      ) : filteredMembers.length === 0 ? (
                        <div className="px-3 py-5 text-center">
                          <p className="text-sm text-[#7a89ad]">
                            Pembeli tidak ditemukan.
                          </p>
                        </div>
                      ) : (
                        filteredMembers.map((member) => {
                          const selected =
                            form.member_id === member.id;

                          return (
                            <button
                              key={member.id}
                              type="button"
                              onClick={() => {
                                handleMemberChange(member.id);
                                setIsMemberDropdownOpen(false);
                                setDropdownPosition(null);
                                setMemberSearch("");
                              }}
                              className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm text-[#20366f] transition hover:bg-[#f7f9ff]"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-[#20366f]">
                                  {member.name}
                                </p>
                                <p className="mt-0.5 text-xs text-[#7a89ad]">
                                  {member.phone}
                                </p>
                              </div>

                              {selected && (
                                <Check
                                  size={16}
                                  className="shrink-0 text-[#1457ff]"
                                />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </DropdownPortal>
              </div>
            </div>

            {/* DETAIL BARANG */}

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-[#405274]">
                Detail Barang
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <div className="relative">
                <button
                  ref={itemButtonRef}
                  type="button"
                  onClick={() => {
                    const nextState =
                      !isItemDropdownOpen;

                    setIsItemDropdownOpen(
                      nextState,
                    );
                    setIsMemberDropdownOpen(false);
                    setIsExpeditionDropdownOpen(false);

                    if (nextState) {
                      updateDropdownPosition(
                        itemButtonRef.current,
                        340,
                      );
                    } else {
                      setDropdownPosition(null);
                    }
                  }}
                  disabled={
                    isHnrCustomer ||
                    !form.member_id ||
                    optionsQuery.isLoading ||
                    createMutation.isPending
                  }
                  className="flex min-h-12 w-full items-center justify-between rounded-lg border border-[#d9e0ef] bg-white px-4 py-3 text-left text-sm text-[#20366f] outline-none transition hover:border-slate-300 focus:border-[#1457ff] disabled:cursor-not-allowed disabled:bg-[#f7f9fc]"
                >
                  <span className="min-w-0 truncate">
                    {!form.member_id
                      ? "Pilih nama pembeli terlebih dahulu"
                      : selectedItems.length ===
                          0
                        ? "Pilih barang"
                        : `${selectedItems.length} barang dipilih`}
                  </span>

                  <ChevronDown
                    size={18}
                    className={[
                      "shrink-0 text-[#536795] transition-transform",
                      isItemDropdownOpen
                        ? "rotate-180"
                        : "",
                    ].join(
                      " ",
                    )}
                  />
                </button>

                <DropdownPortal
                  open={
                    isItemDropdownOpen &&
                    Boolean(form.member_id) &&
                    !isHnrCustomer
                  }
                  position={dropdownPosition}
                >
                  <div className="max-h-72 overflow-y-auto rounded-xl border border-[#d9e0ef] bg-white p-2 shadow-xl">
                    {filteredItems.length === 0 ? (
                      <div className="px-3 py-5 text-center">
                        <p className="text-sm text-[#7a89ad]">
                          Tidak ada barang yang memenuhi syarat.
                        </p>
                      </div>
                    ) : (
                      filteredItems.map((item) => {
                        const checked =
                          form.recap_ids.includes(item.recap_id);

                        return (
                          <button
                            key={item.recap_id}
                            type="button"
                            disabled={isHnrCustomer}
                            onClick={() =>
                              toggleItem(item.recap_id)
                            }
                            className="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-[#f7f9ff]"
                          >
                            <span
                              className={[
                                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                                checked
                                  ? "border-[#1457ff] bg-[#1457ff] text-white"
                                  : "border-[#cfd7e8] bg-white",
                              ].join(" ")}
                            >
                              {checked && (
                                <Check
                                  size={14}
                                  strokeWidth={2.5}
                                />
                              )}
                            </span>

                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-[#20366f]">
                                {item.detail_barang}
                              </span>

                              <span className="mt-1 block text-xs text-[#7a89ad]">
                                Qty {item.qty}
                              </span>
                            </span>

                            <span className="ml-3 shrink-0 text-right">
                              <span className="block truncate text-xs font-medium text-[#5d6f9f]">
                                {item.batch_name}
                              </span>

                              <span className="mt-0.5 block truncate text-[11px] text-[#9aa6bf]">
                                {formatBatchCountry(item.batch_country)}
                              </span>
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </DropdownPortal>
              </div>

              {selectedItems.length >
                0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedItems.map(
                    (item) => (
                      <span
                        key={
                          item.recap_id
                        }
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#edf3ff] px-3 py-1.5 text-xs font-medium text-[#1457ff]"
                      >
                        {
                          item.detail_barang
                        }

                        <button
                          type="button"
                          onClick={() =>
                            toggleItem(
                              item.recap_id,
                            )
                          }
                          disabled={isHnrCustomer}
                          className="rounded-full hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Hapus ${item.detail_barang}`}
                        >
                          <X
                            size={13}
                          />
                        </button>
                      </span>
                    ),
                  )}
                </div>
              )}
            </div>

            {/* ALAMAT */}

            <div className="mt-5">
              <label
                htmlFor="manual-shipment-address"
                className="mb-2 block text-sm font-medium text-[#405274]"
              >
                Alamat Lengkap
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <textarea
                id="manual-shipment-address"
                rows={4}
                value={
                  form.address
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,
                      address:
                        event.target
                          .value,
                    }),
                  )
                }
                disabled={
                  isHnrCustomer ||
                  createMutation.isPending
                }
                placeholder="Masukkan alamat lengkap penerima"
                className="w-full resize-none rounded-lg border border-[#d9e0ef] px-4 py-3 text-sm text-[#20366f] outline-none placeholder:text-[#9aa6bf] focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10 disabled:bg-[#f7f9fc]"
              />
            </div>

            {/* EKSPEDISI */}

            <div className="mt-5">
              <label
                htmlFor="manual-shipment-expedition"
                className="mb-2 block text-sm font-medium text-[#405274]"
              >
                Ekspedisi
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <div className="relative z-20">
                <button
                  ref={expeditionButtonRef}
                  type="button"
                  onClick={(event) => {
                    const nextState =
                      !isExpeditionDropdownOpen;

                    setIsExpeditionDropdownOpen(
                      nextState,
                    );
                    setIsMemberDropdownOpen(false);
                    setIsItemDropdownOpen(false);

                    if (nextState) {
                      updateDropdownPosition(
                        event.currentTarget,
                        260,
                      );
                    } else {
                      setDropdownPosition(null);
                    }
                  }}
                  disabled={
                    isHnrCustomer ||
                    createMutation.isPending
                  }
                  className="flex min-h-12 w-full items-center justify-between rounded-lg border border-[#d9e0ef] bg-white px-4 py-3 text-left text-sm text-[#20366f] outline-none transition hover:border-slate-300 focus:border-[#1457ff] disabled:cursor-not-allowed disabled:bg-[#f7f9fc]"
                >
                  <span className="min-w-0 truncate">
                    {form.expedition ||
                      "Pilih ekspedisi"}
                  </span>

                  <ChevronDown
                    size={18}
                    className={[
                      "shrink-0 text-[#536795] transition-transform",
                      isExpeditionDropdownOpen
                        ? "rotate-180"
                        : "",
                    ].join(" ")}
                  />
                </button>

                <DropdownPortal
                  open={
                    isExpeditionDropdownOpen &&
                    !isHnrCustomer
                  }
                  position={dropdownPosition}
                >
                  <div className="overflow-hidden rounded-xl border border-[#d9e0ef] bg-white p-2 shadow-xl">
                    {EXPEDITION_OPTIONS.map((expedition) => {
                      const selected =
                        form.expedition === expedition;

                      return (
                        <button
                          key={expedition}
                          type="button"
                          disabled={isHnrCustomer}
                          onClick={() => {
                            if (isHnrCustomer) {
                              return;
                            }

                            setForm((current) => ({
                              ...current,
                              expedition,
                            }));

                            setFormError("");
                            setIsExpeditionDropdownOpen(false);
                            setDropdownPosition(null);
                          }}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm text-[#20366f] transition hover:bg-[#f7f9ff]"
                        >
                          <span>{expedition}</span>

                          {selected && (
                            <Check
                              size={16}
                              className="shrink-0 text-[#1457ff]"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </DropdownPortal>
              </div>
            </div>

            {selectedMember && (
              <p className="mt-3 text-xs text-[#7a89ad]">
                Pembeli:{" "}
                <span className="font-medium text-[#405274]">
                  {
                    selectedMember.name
                  }
                </span>
              </p>
            )}
          </div>

          {/* FOOTER */}

          <div className="flex shrink-0 justify-end gap-3 border-t border-[#e5eaf4] px-6 py-4">
            <button
              type="button"
              onClick={
                onClose
              }
              disabled={
                createMutation.isPending
              }
              className="rounded-lg border border-[#d9e0ef] bg-white px-5 py-2.5 text-sm font-medium text-[#20366f] transition hover:bg-[#f8faff] disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                isHnrCustomer ||
                createMutation.isPending
              }
              className="rounded-lg bg-[#1457ff] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#0d4be0] disabled:opacity-50"
            >
              {createMutation.isPending
                ? "Menyimpan..."
                : "Save"}
            </button>
          </div>
        </form>
      </div>

    </div>,
    document.body,
  );
}