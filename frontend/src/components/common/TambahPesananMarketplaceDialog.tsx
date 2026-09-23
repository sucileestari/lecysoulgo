import {
  Check,
  ChevronDown,
  Loader2,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  createMarketplaceOrder,
  getAvailableMarketplaceItems,
  getMarketplaceMemberOptions,
} from "@/services/marketplaceOrderService";

import {
  getMembers,
  type Member,
} from "@/services/memberService";

type MarketplaceAvailableItem = {
  recap_id: string;
  member_id?: string;
  member_name?: string | null;
  member_phone?: string | null;
  detail_barang?: string | null;
  qty?: number | null;
  batch_name?: string | null;
  batch_country?: string | null;
  pelunasan_due_date?: string | null;
  recap?: {
    id?: string;
    detail_barang?: string | null;
    qty?: number | null;
    batch?: {
      name?: string | null;
      country?: string | null;
    } | null;
  } | null;
  batch?: {
    name?: string | null;
    country?: string | null;
  } | null;
};

type CustomerMember = {
  id: string;
  name: string;
  phone: string;
};

interface TambahPesananMarketplaceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}

function getCustomerMember(): CustomerMember | null {
  const raw = localStorage.getItem(
    "customer_member",
  );

  if (!raw) {
    return null;
  }

  try {
    const parsed =
      JSON.parse(raw) as Partial<CustomerMember>;

    if (
      typeof parsed.id !== "string" ||
      typeof parsed.name !== "string" ||
      typeof parsed.phone !== "string"
    ) {
      return null;
    }

    return {
      id: parsed.id,
      name: parsed.name,
      phone: parsed.phone,
    };
  } catch {
    return null;
  }
}



function getItemName(
  item: MarketplaceAvailableItem,
) {
  return (
    item.detail_barang ||
    item.recap?.detail_barang ||
    "-"
  );
}

function getItemQty(
  item: MarketplaceAvailableItem,
) {
  if (
    typeof item.qty ===
    "number"
  ) {
    return item.qty;
  }

  if (
    typeof item.recap?.qty ===
    "number"
  ) {
    return item.recap.qty;
  }

  return 0;
}

function getBatchName(
  item: MarketplaceAvailableItem,
) {
  return (
    item.batch_name ||
    item.recap?.batch?.name ||
    item.batch?.name ||
    "-"
  );
}

function getBatchCountry(
  item: MarketplaceAvailableItem,
) {
  return (
    item.batch_country ||
    item.recap?.batch?.country ||
    item.batch?.country ||
    "-"
  );
}

const MAX_TIMBUN_DAYS = 60;

function getMaxTimbunDate(
  value?: string | null,
): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setDate(date.getDate() + MAX_TIMBUN_DAYS);

  return date;
}

function isPastMaxTimbun(
  item: MarketplaceAvailableItem,
): boolean {
  const maxTimbunDate = getMaxTimbunDate(
    item.pelunasan_due_date,
  );

  if (!maxTimbunDate) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return maxTimbunDate < today;
}

export default function TambahPesananMarketplaceDialog({
  isOpen,
  onClose,
  onSuccess,
}: TambahPesananMarketplaceDialogProps) {
  const [
    orderNumber,
    setOrderNumber,
  ] = useState("");

  const [
    availableItems,
    setAvailableItems,
  ] = useState<
    MarketplaceAvailableItem[]
  >([]);

  const [
    selectedRecapIds,
    setSelectedRecapIds,
  ] = useState<string[]>(
    [],
  );

  const [
    isLoadingItems,
    setIsLoadingItems,
  ] = useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    formError,
    setFormError,
  ] = useState("");

  const [
    customer,
    setCustomer,
  ] =
    useState<CustomerMember | null>(
      null,
    );

  const [
    selectedMemberId,
    setSelectedMemberId,
  ] = useState("");

  const [
    isMemberDropdownOpen,
    setIsMemberDropdownOpen,
  ] = useState(false);

  const [
    memberOptions,
    setMemberOptions,
  ] = useState<CustomerMember[]>([]);

  const [
    members,
    setMembers,
  ] = useState<Member[]>([]);

  const [
    isItemDropdownOpen,
    setIsItemDropdownOpen,
  ] = useState(false);

  /* =========================================
     CUSTOMER
  ========================================= */

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const currentCustomer =
      getCustomerMember();

    setCustomer(currentCustomer);
    setSelectedMemberId(
      currentCustomer?.id || "",
    );
    setIsMemberDropdownOpen(false);
  }, [isOpen]);

  /* =========================================
     LOAD MEMBER OPTIONS
  ========================================= */

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let cancelled = false;

    async function loadMemberOptions() {
      try {
        const members =
          await getMarketplaceMemberOptions();

        if (!cancelled) {
          setMemberOptions(members);
        }
      } catch {
        if (!cancelled) {
          setMemberOptions([]);
        }
      }
    }

    if (!getCustomerMember()) {
      void loadMemberOptions();
    } else {
      setMemberOptions([]);
    }

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  /* =========================================
     LOAD MEMBERS
  ========================================= */

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let cancelled = false;

    async function loadMembers() {
      try {
        const data =
          await getMembers();

        if (!cancelled) {
          setMembers(data);
        }
      } catch {
        if (!cancelled) {
          setMembers([]);
        }
      }
    }

    void loadMembers();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  /* =========================================
     LOAD AVAILABLE ITEMS
  ========================================= */

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let cancelled = false;

    async function loadAvailableItems() {
      setIsLoadingItems(true);
      setFormError("");

      try {
        const currentCustomer =
          getCustomerMember();

        const items =
          await getAvailableMarketplaceItems(
            currentCustomer?.id,
          );

        if (!cancelled) {
          setAvailableItems(items);
        }
      } catch (error) {
        if (!cancelled) {
          setAvailableItems([]);

          setFormError(
            error instanceof Error
              ? error.message
              : "Gagal mengambil barang Marketplace.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingItems(false);
        }
      }
    }

    void loadAvailableItems();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  /* =========================================
     SELECTED ITEMS
  ========================================= */

  const selectedItems =
    useMemo(
      () =>
        selectedRecapIds
          .map(
            (recapId) =>
              availableItems.find(
                (item) =>
                  item.recap_id ===
                  recapId,
              ),
          )
          .filter(
            (
              item,
            ): item is MarketplaceAvailableItem =>
              Boolean(item),
          ),
      [
        availableItems,
        selectedRecapIds,
      ],
    );

  const selectedMember =
    useMemo(
      () =>
        customer
          ? customer
          : memberOptions.find(
              (member) =>
                member.id ===
                selectedMemberId,
            ),
      [
        customer,
        memberOptions,
        selectedMemberId,
      ],
    );

  const selectedMemberIsHnr =
    useMemo(() => {
      const member =
        members.find(
          (item) =>
            item.id ===
            selectedMemberId,
        );

      return (
        member?.type
          ?.trim()
          .toLowerCase() ===
        "hnr"
      );
    }, [
      members,
      selectedMemberId,
    ]);

  const selectableItems =
    useMemo(
      () =>
        availableItems.filter(
          (item) =>
            item.member_id ===
            selectedMemberId,
        ),
      [
        availableItems,
        selectedMemberId,
      ],
    );

  /* =========================================
     RESET
  ========================================= */

  function resetForm() {
    setOrderNumber("");
    setSelectedRecapIds(
      [],
    );
    setAvailableItems(
      [],
    );
    setFormError("");
    setSelectedMemberId("");
    setMemberOptions([]);
    setMembers([]);
    setIsMemberDropdownOpen(false);
    setIsItemDropdownOpen(
      false,
    );
  }

  /* =========================================
     CLOSE
  ========================================= */

  function handleClose() {
    if (isSubmitting) {
      return;
    }

    onClose();
    resetForm();
  }

  /* =========================================
     MEMBER CHANGE
  ========================================= */

  function handleMemberChange(
    memberId: string,
  ) {
    setSelectedMemberId(memberId);
    setSelectedRecapIds([]);
    setFormError("");
    setIsItemDropdownOpen(false);
    setIsMemberDropdownOpen(false);
  }

  /* =========================================
     TOGGLE ITEM
  ========================================= */

  function toggleItem(
    recapId: string,
  ) {
    const item = availableItems.find(
      (availableItem) =>
        availableItem.recap_id ===
        recapId,
    );

    if (item && isPastMaxTimbun(item)) {
      return;
    }

    setSelectedRecapIds(
      (current) => {
        const exists =
          current.includes(
            recapId,
          );

        if (exists) {
          return current.filter(
            (id) =>
              id !== recapId,
          );
        }

        return [
          ...current,
          recapId,
        ];
      },
    );

    setFormError("");
  }

  /* =========================================
     SUBMIT
  ========================================= */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setFormError("");

    if (
      !orderNumber.trim()
    ) {
      setFormError(
        "Nomor pesanan wajib diisi.",
      );
      return;
    }

    if (!selectedMemberId) {
      setFormError(
        "Nama pembeli wajib dipilih.",
      );
      return;
    }

    if (
      selectedRecapIds.length ===
      0
    ) {
      setFormError(
        "Minimal satu barang harus dipilih.",
      );
      return;
    }

    try {
      setIsSubmitting(
        true,
      );

      await createMarketplaceOrder({
        member_id:
          selectedMemberId,
        order_number:
          orderNumber.trim(),
        recap_ids:
          selectedRecapIds,
      });

      await onSuccess();

      handleClose();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Gagal membuat pesanan Marketplace.",
      );
    } finally {
      setIsSubmitting(
        false,
      );
    }
  }

  /* =========================================
     NOT OPEN
  ========================================= */

  if (!isOpen) {
    return null;
  }

  /* =========================================
     RENDER
  ========================================= */

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6">

      <div
        className="absolute inset-0"
        onClick={
          handleClose
        }
      />

      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-visible rounded-2xl bg-white shadow-2xl">

        {/* =================================
            HEADER
        ================================== */}

        <div className="flex items-start justify-between border-b border-[#e8ecf4] px-6 py-5">

          <div>
            <h2 className="text-xl font-bold text-[#10245c]">
              Tambah Pesanan Marketplace
            </h2>

            <p className="mt-1 text-sm text-[#7a89ad]">
              Masukkan nomor pesanan dan
              pilih barang yang akan
              diproses.
            </p>
          </div>

          <button
            type="button"
            onClick={
              handleClose
            }
            disabled={
              isSubmitting
            }
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#7a89ad] transition hover:bg-[#f1f4fa] hover:text-[#20366f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>

        </div>

        {/* =================================
            FORM
        ================================== */}

        <form
          onSubmit={
            handleSubmit
          }
          className="flex min-h-0 flex-1 flex-col"
        >

          <div className="min-h-0 flex-1 overflow-visible px-6 py-6">

            {/* ERROR */}

            {formError && (
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {formError}
              </div>
            )}

            {/* NOMOR PESANAN */}

            <div className="mb-5">

              <label
                htmlFor="marketplace-order-number"
                className="mb-2 block text-sm font-semibold text-[#20366f]"
              >
                Nomor Pesanan
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                id="marketplace-order-number"
                type="text"
                value={
                  orderNumber
                }
                onChange={(
                  event,
                ) =>
                  setOrderNumber(
                    event.target
                      .value,
                  )
                }
                placeholder="Contoh: 240908ABC123"
                disabled={
                  selectedMemberIsHnr ||
                  isSubmitting
                }
                className="h-11 w-full rounded-lg border border-[#d9e0ef] bg-white px-3 text-sm text-[#20366f] outline-none transition placeholder:text-[#a0abc0] focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10 disabled:cursor-not-allowed disabled:bg-[#f5f7fb]"
              />

            </div>

            {/* NAMA PEMBELI */}

            <div className="mb-5">

              <label
                htmlFor="marketplace-buyer-name"
                className="mb-2 block text-sm font-semibold text-[#20366f]"
              >
                Nama Pembeli
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <div className="relative z-30">

                <button
                  id="marketplace-buyer-name"
                  type="button"
                  onClick={() =>
                    setIsMemberDropdownOpen(
                      (current) =>
                        !current,
                    )
                  }
                  disabled={
                    Boolean(customer) ||
                    isLoadingItems ||
                    isSubmitting
                  }
                  className="flex min-h-12 w-full items-center justify-between rounded-lg border border-[#d9e0ef] bg-white px-4 py-3 text-left text-sm text-[#20366f] outline-none transition hover:border-slate-300 focus:border-[#1457ff] disabled:cursor-not-allowed disabled:bg-[#f7f9fc]"
                >

                  <span className="min-w-0 truncate">

                    {isLoadingItems &&
                    !selectedMember
                      ? "Memuat pembeli..."
                      : selectedMember
                        ? `${selectedMember.name} - ${selectedMember.phone}`
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

                {isMemberDropdownOpen &&
                  !customer && (

                    <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-64 overflow-y-auto rounded-xl border border-[#d9e0ef] bg-white p-2 shadow-xl">

                      {memberOptions.length ===
                      0 ? (

                        <div className="px-3 py-5 text-center">
                          <p className="text-sm text-[#7a89ad]">
                            Belum ada pembeli yang tersedia.
                          </p>
                        </div>

                      ) : (

                        memberOptions.map(
                          (member) => {

                            const selected =
                              selectedMemberId ===
                              member.id;

                            return (

                              <button
                                key={
                                  member.id
                                }
                                type="button"
                                onClick={() =>
                                  handleMemberChange(
                                    member.id,
                                  )
                                }
                                className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm text-[#20366f] transition hover:bg-[#f7f9ff]"
                              >

                                <div className="min-w-0">

                                  <p className="truncate text-sm font-medium text-[#20366f]">
                                    {
                                      member.name
                                    }
                                  </p>

                                  <p className="mt-0.5 text-xs text-[#7a89ad]">
                                    {
                                      member.phone
                                    }
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
                          },
                        )

                      )}

                    </div>

                  )}

              </div>

            </div>

            {/* BARANG */}

            <div className="mt-5">

              <label className="mb-2 block text-sm font-semibold text-[#20366f]">
                Barang
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              {/* DROPDOWN */}

              <div className="relative">

                <button
                  type="button"
                  onClick={() =>
                    setIsItemDropdownOpen(
                      (current) =>
                        !current,
                    )
                  }
                  disabled={
                    !selectedMemberId ||
                    selectedMemberIsHnr ||
                    isLoadingItems ||
                    isSubmitting
                  }
                  className="flex min-h-12 w-full items-center justify-between rounded-lg border border-[#d9e0ef] bg-white px-4 py-3 text-left text-sm text-[#20366f] outline-none transition hover:border-slate-300 focus:border-[#1457ff] disabled:cursor-not-allowed disabled:bg-[#f7f9fc]"
                >

                  <span className="min-w-0 truncate">

                    {!selectedMemberId
                      ? "Pilih nama pembeli terlebih dahulu"
                      : isLoadingItems
                        ? "Memuat barang..."
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
                    ].join(" ")}
                  />

                </button>

                {isItemDropdownOpen &&
                  selectedMemberId &&
                  !selectedMemberIsHnr && (

                    <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-72 overflow-y-auto rounded-xl border border-[#d9e0ef] bg-white p-2 shadow-xl">

                      {selectableItems.length ===
                      0 ? (

                        <div className="px-3 py-5 text-center">
                          <p className="text-sm text-[#7a89ad]">
                            Tidak ada barang yang memenuhi syarat.
                          </p>
                        </div>

                      ) : (

                        selectableItems.map(
                          (item) => {
                            const checked =
                              selectedRecapIds.includes(
                                item.recap_id,
                              );

                            return (

                              <button
                                key={
                                  item.recap_id
                                }
                                type="button"
                                onClick={() =>
                                  toggleItem(
                                    item.recap_id,
                                  )
                                }
                                disabled={
                                  isPastMaxTimbun(item) ||
                                  isSubmitting
                                }
                                className={[
                                  "flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition",
                                  isPastMaxTimbun(item)
                                    ? "cursor-not-allowed opacity-60"
                                    : "hover:bg-[#f7f9ff]",
                                ].join(" ")}
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
                                    {getItemName(
                                      item,
                                    )}
                                  </span>

                                  {getItemQty(
                                    item,
                                  ) > 0 && (
                                    <span className="mt-1 block text-xs text-[#7a89ad]">
                                      Qty {getItemQty(
                                        item,
                                      )}
                                    </span>
                                  )}

                                  {isPastMaxTimbun(item) && (
                                    <span className="mt-1 block text-xs font-medium text-red-500">
                                      Sudah melewati masa timbun
                                    </span>
                                  )}

                                </span>

                                <span className="ml-3 shrink-0 text-right">
                                  <span className="block truncate text-xs font-medium text-[#5d6f9f]">
                                    {getBatchName(
                                      item,
                                    )}
                                  </span>

                                  <span className="mt-0.5 block truncate text-[11px] text-[#9aa6bf]">
                                    {getBatchCountry(
                                      item,
                                    )}
                                  </span>
                                </span>

                              </button>

                            );
                          },
                        )

                      )}

                    </div>

                  )}

              </div>

              {/* SELECTED ITEMS */}

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
                        {getItemName(item)}

                        <button
                          type="button"
                          onClick={() =>
                            toggleItem(
                              item.recap_id,
                            )
                          }
                          disabled={
                            isSubmitting
                          }
                          className="rounded-full hover:bg-white/70 disabled:cursor-not-allowed"
                          aria-label={`Hapus ${getItemName(item)}`}
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

          </div>

          {/* =================================
              FOOTER
          ================================== */}

          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-[#e8ecf4] bg-white px-6 py-4">

            <button
              type="button"
              onClick={
                handleClose
              }
              disabled={
                isSubmitting
              }
              className="h-11 rounded-lg border border-[#d9e0ef] px-5 text-sm font-semibold text-[#50628e] transition hover:bg-[#f5f7fb] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={
                isSubmitting
              }
              className="inline-flex h-11 min-w-[150px] items-center justify-center gap-2 rounded-lg bg-[#1457ff] px-5 text-sm font-semibold text-white transition hover:bg-[#0f49d8] disabled:cursor-not-allowed disabled:opacity-60"
            >

              {isSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}

              {isSubmitting
                ? "Menyimpan..."
                : "Simpan Pesanan"}

            </button>

          </div>

        </form>

      </div>

    </div>
  );
}