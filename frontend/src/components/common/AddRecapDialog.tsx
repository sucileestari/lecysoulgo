import {
  Check,
  ChevronDown,
  Loader2,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createRecaps,
} from "@/services/recapService";

import {
  getMembers,
  type Member,
} from "@/services/memberService";

import type {
  Batch,
} from "@/services/batchService";

type AddRecapDialogProps = {
  open: boolean;
  batch: Batch | null;
  onClose: () => void;
  onSuccess: () => void;
};

export default function AddRecapDialog({
  open,
  batch,
  onClose,
  onSuccess,
}: AddRecapDialogProps) {
  /* =========================================
     STATES
  ========================================= */

  const [
    members,
    setMembers,
  ] = useState<Member[]>([]);

  const [
    selectedMemberIds,
    setSelectedMemberIds,
  ] = useState<string[]>([]);

  const [
    detailBarang,
    setDetailBarang,
  ] = useState("");

  const [
    qty,
    setQty,
  ] = useState("");

  const [
    hargaBarang,
    setHargaBarang,
  ] = useState("");

  const [
    persentaseDp,
    setPersentaseDp,
  ] = useState("50");

  const [
    isMemberDropdownOpen,
    setIsMemberDropdownOpen,
  ] = useState(false);

  const [
    memberSearch,
    setMemberSearch,
  ] = useState("");

  const [
    isLoadingMembers,
    setIsLoadingMembers,
  ] = useState(false);

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const dropdownRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  /* =========================================
     LOAD MEMBERS
  ========================================= */

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const loadMembers =
      async () => {
        try {
          setIsLoadingMembers(true);
          setError("");

          const data =
            await getMembers("");

          if (!cancelled) {
            setMembers(data);
          }
        } catch (error) {
          console.error(
            "Load members error:",
            error,
          );

          if (!cancelled) {
            setError(
              error instanceof Error
                ? error.message
                : "Gagal mengambil data anggota.",
            );
          }
        } finally {
          if (!cancelled) {
            setIsLoadingMembers(
              false,
            );
          }
        }
      };

    loadMembers();

    return () => {
      cancelled = true;
    };
  }, [open]);

  /* =========================================
     RESET FORM
  ========================================= */

  useEffect(() => {
    if (!open) {
      setSelectedMemberIds([]);
      setDetailBarang("");
      setQty("");
      setHargaBarang("");
      setPersentaseDp("50");
      setIsMemberDropdownOpen(false);
      setMemberSearch("");
      setError("");
      setIsSaving(false);
    }
  }, [open]);

  /* =========================================
     CLOSE DROPDOWN WHEN CLICK OUTSIDE
  ========================================= */

  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent,
    ) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          event.target as Node,
        )
      ) {
        setIsMemberDropdownOpen(
          false,
        );
      }
    };

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

  /* =========================================
     FILTER MEMBERS
  ========================================= */

  const filteredMembers =
    useMemo(() => {
      const keyword =
        memberSearch
          .trim()
          .toLowerCase();

      if (!keyword) {
        return members;
      }

      return members.filter(
        (member) =>
          member.name
            .toLowerCase()
            .includes(keyword) ||
          member.phone
            ?.toLowerCase()
            .includes(keyword),
      );
    }, [
      members,
      memberSearch,
    ]);

  /* =========================================
     SELECTED MEMBERS
  ========================================= */

  const selectedMembers =
    useMemo(() => {
      return members.filter(
        (member) =>
          selectedMemberIds.includes(
            member.id,
          ),
      );
    }, [
      members,
      selectedMemberIds,
    ]);

  /* =========================================
     CALCULATIONS
  ========================================= */

  const qtyNumber =
    Number(qty) || 0;

  const hargaNumber =
    Number(hargaBarang) || 0;

  const dpNumber =
    Number(persentaseDp) || 0;

  const totalHarga =
    qtyNumber *
    hargaNumber;

  const totalDp =
    totalHarga *
    (dpNumber / 100);

  const sisaPelunasan =
    totalHarga -
    totalDp;

  /* =========================================
     FORMAT CURRENCY
  ========================================= */

  const formatRupiah = (
    value: number,
  ) => {
    return new Intl.NumberFormat(
      "id-ID",
      {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      },
    ).format(value);
  };

  /* =========================================
     TOGGLE MEMBER
  ========================================= */

  const toggleMember = (
    memberId: string,
  ) => {
    setSelectedMemberIds(
      (current) => {
        if (
          current.includes(
            memberId,
          )
        ) {
          return current.filter(
            (id) =>
              id !== memberId,
          );
        }

        return [
          ...current,
          memberId,
        ];
      },
    );
  };

  /* =========================================
     REMOVE SELECTED MEMBER
  ========================================= */

  const removeMember = (
    memberId: string,
  ) => {
    setSelectedMemberIds(
      (current) =>
        current.filter(
          (id) =>
            id !== memberId,
        ),
    );
  };

  /* =========================================
     CLOSE
  ========================================= */

  const handleClose = () => {
    if (isSaving) {
      return;
    }

    onClose();
  };

  /* =========================================
     SUBMIT
  ========================================= */

  const handleSubmit = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();

    if (!batch) {
      setError(
        "Batch tidak ditemukan.",
      );
      return;
    }

    /* -------------------------------------
       Validation
    ------------------------------------- */

    if (
      selectedMemberIds.length ===
      0
    ) {
      setError(
        "Minimal pilih satu pembeli.",
      );
      return;
    }

    if (
      !detailBarang.trim()
    ) {
      setError(
        "Detail barang wajib diisi.",
      );
      return;
    }

    if (
      !Number.isInteger(
        qtyNumber,
      ) ||
      qtyNumber <= 0
    ) {
      setError(
        "Qty harus lebih besar dari 0.",
      );
      return;
    }

    if (
      !Number.isFinite(
        hargaNumber,
      ) ||
      hargaNumber < 0
    ) {
      setError(
        "Harga barang tidak valid.",
      );
      return;
    }

    if (
      !Number.isFinite(
        dpNumber,
      ) ||
      dpNumber < 0 ||
      dpNumber > 100
    ) {
      setError(
        "Persentase DP harus antara 0 sampai 100.",
      );
      return;
    }

    try {
      setError("");
      setIsSaving(true);

      await createRecaps({
        batch_id:
          batch.id,

        member_ids:
          selectedMemberIds,

        detail_barang:
          detailBarang.trim(),

        qty:
          qtyNumber,

        harga_barang:
          hargaNumber,

        persentase_dp:
          dpNumber,
      });

      onSuccess();

      onClose();
    } catch (error) {
      console.error(
        "Create recap error:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "Gagal menambahkan rekapan.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  /* =========================================
     RENDER
  ========================================= */

  if (!open || !batch) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4">

      <div className="flex max-h-[90vh] w-full max-w-[680px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* ===================================
            HEADER
        ==================================== */}

        <div className="flex shrink-0 items-start justify-between border-b border-[#e7ebf3] px-6 py-5">

          <div>
            <h2 className="text-xl font-bold text-[#10245c]">
              Tambah Rekapan
            </h2>

            <p className="mt-1 text-sm text-[#7a89ad]">
              Tambah rekapan untuk batch{" "}
              <span className="font-medium text-[#20366f]">
                {batch.name}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="rounded-lg p-2 text-[#8a96b4] transition hover:bg-[#f5f7fc] hover:text-[#20366f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>

        </div>

        {/* ===================================
            FORM
        ==================================== */}

        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto"
        >

          <div className="space-y-5 px-6 py-6">

            {/* =================================
                NAMA PEMBELI
            ================================== */}

            <div ref={dropdownRef}>

              <label className="mb-2 block text-sm font-medium text-[#20366f]">
                Nama Pembeli{" "}
                <span className="text-[#ff2348]">
                  *
                </span>
              </label>

              <button
                type="button"
                onClick={() =>
                  setIsMemberDropdownOpen(
                    (value) =>
                      !value,
                  )
                }
                className="flex min-h-[48px] w-full items-center justify-between rounded-lg border border-[#d9e0ef] bg-white px-3 text-left text-sm outline-none transition hover:border-[#bfc9dc] focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10"
              >

                <div className="flex flex-1 flex-wrap gap-2">

                  {selectedMembers.length >
                  0 ? (
                    selectedMembers.map(
                      (member) => (
                        <span
                          key={
                            member.id
                          }
                          className="flex items-center gap-1 rounded-md bg-[#edf3ff] px-2 py-1 text-xs font-medium text-[#1457ff]"
                        >
                          {
                            member.name
                          }

                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(
                              event,
                            ) => {
                              event.stopPropagation();

                              removeMember(
                                member.id,
                              );
                            }}
                            onKeyDown={(
                              event,
                            ) => {
                              if (
                                event.key ===
                                "Enter"
                              ) {
                                event.stopPropagation();

                                removeMember(
                                  member.id,
                                );
                              }
                            }}
                            className="cursor-pointer text-[#1457ff] hover:text-[#0d4be0]"
                          >
                            ×
                          </span>
                        </span>
                      ),
                    )
                  ) : (
                    <span className="text-[#8a96b4]">
                      Pilih nama pembeli...
                    </span>
                  )}

                </div>

                <ChevronDown
                  className={`ml-3 h-4 w-4 shrink-0 text-[#7a89ad] transition ${
                    isMemberDropdownOpen
                      ? "rotate-180"
                      : ""
                  }`}
                />

              </button>

              {/* Dropdown */}
              {isMemberDropdownOpen && (
                <div className="relative z-20">

                  <div className="absolute left-0 right-0 top-2 overflow-hidden rounded-lg border border-[#d9e0ef] bg-white shadow-lg">

                    {/* Search */}
                    <div className="border-b border-[#e8ecf4] p-3">

                      <input
                        type="text"
                        value={
                          memberSearch
                        }
                        onChange={(
                          event,
                        ) =>
                          setMemberSearch(
                            event
                              .target
                              .value,
                          )
                        }
                        placeholder="Cari anggota..."
                        className="h-10 w-full rounded-lg border border-[#d9e0ef] px-3 text-sm text-[#20366f] outline-none focus:border-[#1457ff]"
                      />

                    </div>

                    {/* Members */}
                    <div className="max-h-[220px] overflow-y-auto">

                      {isLoadingMembers ? (
                        <div className="px-4 py-8 text-center text-xs text-[#7a89ad]">
                          Memuat anggota...
                        </div>
                      ) : filteredMembers.length ===
                        0 ? (
                        <div className="px-4 py-8 text-center text-xs text-[#7a89ad]">
                          Anggota tidak ditemukan.
                        </div>
                      ) : (
                        filteredMembers.map(
                          (
                            member,
                          ) => {
                            const selected =
                              selectedMemberIds.includes(
                                member.id,
                              );

                            return (
                              <button
                                key={
                                  member.id
                                }
                                type="button"
                                onClick={() =>
                                  toggleMember(
                                    member.id,
                                  )
                                }
                                className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-[#f7f9fd]"
                              >

                                <div>
                                  <p className="text-sm font-medium text-[#20366f]">
                                    {
                                      member.name
                                    }
                                  </p>

                                  <p className="mt-0.5 text-xs text-[#8a96b4]">
                                    {
                                      member.phone
                                    }
                                  </p>
                                </div>

                                {selected && (
                                  <Check className="h-4 w-4 text-[#1457ff]" />
                                )}

                              </button>
                            );
                          },
                        )
                      )}

                    </div>

                  </div>

                </div>
              )}

              <p className="mt-1.5 text-xs text-[#8a96b4]">
                Bisa memilih lebih dari satu
                pembeli.
              </p>

            </div>

            {/* =================================
                DETAIL BARANG
            ================================== */}

            <div>

              <label className="mb-2 block text-sm font-medium text-[#20366f]">
                Detail Barang{" "}
                <span className="text-[#ff2348]">
                  *
                </span>
              </label>

              <input
                type="text"
                value={detailBarang}
                onChange={(
                  event,
                ) =>
                  setDetailBarang(
                    event.target
                      .value,
                  )
                }
                placeholder="Contoh: Photocard Album"
                className="h-11 w-full rounded-lg border border-[#d9e0ef] bg-white px-3 text-sm text-[#20366f] outline-none transition placeholder:text-[#8a96b4] focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10"
              />

            </div>

            {/* =================================
                QTY + HARGA
            ================================== */}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              {/* Qty */}
              <div>

                <label className="mb-2 block text-sm font-medium text-[#20366f]">
                  Qty{" "}
                  <span className="text-[#ff2348]">
                    *
                  </span>
                </label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={qty}
                  onChange={(
                    event,
                  ) =>
                    setQty(
                      event.target
                        .value,
                    )
                  }
                  placeholder="0"
                  className="h-11 w-full rounded-lg border border-[#d9e0ef] bg-white px-3 text-sm text-[#20366f] outline-none transition placeholder:text-[#8a96b4] focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10"
                />

              </div>

              {/* Harga */}
              <div>

                <label className="mb-2 block text-sm font-medium text-[#20366f]">
                  Harga Barang{" "}
                  <span className="text-[#ff2348]">
                    *
                  </span>
                </label>

                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={hargaBarang}
                  onChange={(
                    event,
                  ) =>
                    setHargaBarang(
                      event.target
                        .value,
                    )
                  }
                  placeholder="0"
                  className="h-11 w-full rounded-lg border border-[#d9e0ef] bg-white px-3 text-sm text-[#20366f] outline-none transition placeholder:text-[#8a96b4] focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10"
                />

              </div>

            </div>

            {/* =================================
                TOTAL HARGA
            ================================== */}

            <div>

              <label className="mb-2 block text-sm font-medium text-[#20366f]">
                Total Harga
              </label>

              <input
                type="text"
                value={formatRupiah(
                  totalHarga,
                )}
                disabled
                readOnly
                className="h-11 w-full cursor-not-allowed rounded-lg border border-[#dfe4ed] bg-[#f5f7fa] px-3 text-sm font-semibold text-[#6d7890]"
              />

              <p className="mt-1.5 text-xs text-[#8a96b4]">
                Otomatis dihitung dari
                Qty × Harga Barang.
              </p>

            </div>

            {/* =================================
                DP
            ================================== */}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              {/* Persentase */}
              <div>

                <label className="mb-2 block text-sm font-medium text-[#20366f]">
                  Persentase DP
                </label>

                <select
                  value={
                    persentaseDp
                  }
                  onChange={(
                    event,
                  ) =>
                    setPersentaseDp(
                      event
                        .target
                        .value,
                    )
                  }
                  className="h-11 w-full rounded-lg border border-[#d9e0ef] bg-white px-3 text-sm text-[#20366f] outline-none focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10"
                >
                  <option value="0">
                    0%
                  </option>

                  <option value="25">
                    25%
                  </option>

                  <option value="50">
                    50%
                  </option>

                  <option value="75">
                    75%
                  </option>

                  <option value="100">
                    100%
                  </option>
                </select>

              </div>

              {/* Total DP */}
              <div>

                <label className="mb-2 block text-sm font-medium text-[#20366f]">
                  Total DP
                </label>

                <input
                  type="text"
                  value={formatRupiah(
                    totalDp,
                  )}
                  disabled
                  readOnly
                  className="h-11 w-full cursor-not-allowed rounded-lg border border-[#dfe4ed] bg-[#f5f7fa] px-3 text-sm font-semibold text-[#6d7890]"
                />

              </div>

            </div>

            {/* =================================
                SISA PELUNASAN
            ================================== */}

            <div>

              <label className="mb-2 block text-sm font-medium text-[#20366f]">
                Sisa Pelunasan
              </label>

              <input
                type="text"
                value={formatRupiah(
                  sisaPelunasan,
                )}
                disabled
                readOnly
                className="h-11 w-full cursor-not-allowed rounded-lg border border-[#dfe4ed] bg-[#f5f7fa] px-3 text-sm font-semibold text-[#6d7890]"
              />

              <p className="mt-1.5 text-xs text-[#8a96b4]">
                Otomatis dihitung dari Total
                Harga − Total DP.
              </p>

            </div>

            {/* =================================
                ERROR
            ================================== */}

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

          </div>

          {/* ===================================
              FOOTER
          ==================================== */}

          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-[#e7ebf3] px-6 py-5">

            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="h-11 rounded-lg border border-[#d7dfed] bg-white px-5 text-sm font-medium text-[#20366f] transition hover:bg-[#f5f7fc] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1457ff] px-5 text-sm font-medium text-white transition hover:bg-[#0d4be0] disabled:cursor-not-allowed disabled:opacity-60"
            >

              {isSaving && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}

              {isSaving
                ? "Menyimpan..."
                : "Simpan"}

            </button>

          </div>

        </form>

      </div>

    </div>
  );
}