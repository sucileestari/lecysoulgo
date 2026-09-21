import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getManualShipmentOptions,
  updateManualShipment,
  type ManualShipment,
  type ManualShipmentExpedition,
  type ManualShipmentOptions,
} from "@/services/manualShippingService";

type Props = {
  open: boolean;
  shipment: ManualShipment | null;
  onClose: () => void;
  onSaved?: (shipment: ManualShipment) => void;
  isCustomer?: boolean;
};

type FormState = {
  member_id: string;
  recap_ids: string[];
  address: string;
  expedition: ManualShipmentExpedition | "";
};

const EXPEDITIONS: ManualShipmentExpedition[] = [
  "JNE",
  "J&T",
  "Sicepat",
  "Grab/Gojek Instant",
];

function formatCountry(value?: string | null) {
  if (!value) return "-";
  const map: Record<string, string> = {
    china: "China",
    indonesia: "Indonesia",
    jepang: "Jepang",
    korea: "Korea",
    thailand: "Thailand",
  };
  return map[value.trim().toLowerCase()] ?? value;
}

function getShippingStatusValue(value: string): string {
  if (
    value === "Sudah di pick up" ||
    value === "Dalam proses pick up" ||
    value === "dalam_proses_pick_up"
  ) {
    return "Dalam proses pick up";
  }

  return "Sedang dikemas";
}


export default function EditPengirimanDialog({
  open,
  shipment,
  onClose,
  onSaved,
  isCustomer = false,
}: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState("");
  const [memberOpen, setMemberOpen] = useState(false);
  const [itemsOpen, setItemsOpen] = useState(false);
  const [expeditionOpen, setExpeditionOpen] = useState(false);
  const [expeditionDropdownPosition, setExpeditionDropdownPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const expeditionButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open || !shipment) return;

    setForm({
      member_id: shipment.member_id,
      recap_ids: shipment.items?.map((item) => item.recap_id) ?? [],
      address: shipment.address ?? "",
      expedition: shipment.expedition ?? "",
    });
    setError("");
    setMemberOpen(false);
    setItemsOpen(false);
    setExpeditionOpen(false);
  }, [open, shipment]);

  const optionsQuery = useQuery<ManualShipmentOptions, Error>({
    queryKey: ["manual-shipment-options", "edit"],
    queryFn: () => getManualShipmentOptions(),
    enabled: open && Boolean(shipment),
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: () => {
      if (!shipment || !form) {
        throw new Error("Data pengiriman tidak ditemukan.");
      }

      return updateManualShipment(shipment.id, {
        member_id: form.member_id,
        recap_ids: form.recap_ids,
        address: form.address.trim(),
        expedition: form.expedition as ManualShipmentExpedition,
      });
    },
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({
        queryKey: ["manual-shipments", updated.batch_id],
      });
      onSaved?.(updated);
      onClose();
    },
    onError: (err) => {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memperbarui pengiriman.",
      );
    },
  });

  const members = optionsQuery.data?.members ?? [];
  const allItems = optionsQuery.data?.items ?? [];

  const filteredItems = useMemo(() => {
    if (!form) return [];
    return allItems.filter((item) => item.member_id === form.member_id);
  }, [allItems, form]);

  const selectedItems = useMemo(() => {
    if (!form) return [];
    const map = new Map(
      allItems.map((item) => [item.recap_id, item]),
    );
    return form.recap_ids
      .map((id) => map.get(id))
      .filter((item): item is (typeof allItems)[number] => Boolean(item));
  }, [allItems, form]);

  useEffect(() => {
    if (!expeditionOpen) {
      return;
    }

    const updatePosition = () => {
      const button = expeditionButtonRef.current;

      if (!button) {
        return;
      }

      const rect = button.getBoundingClientRect();
      const menuHeight = EXPEDITIONS.length * 48 + 16;
      const gap = 8;
      const viewportPadding = 12;
      const availableBelow = window.innerHeight - rect.bottom - viewportPadding;
      const availableAbove = rect.top - viewportPadding;
      const shouldOpenAbove =
        availableBelow < menuHeight && availableAbove > availableBelow;

      setExpeditionDropdownPosition({
        top: shouldOpenAbove
          ? Math.max(viewportPadding, rect.top - menuHeight - gap)
          : rect.bottom + gap,
        left: rect.left,
        width: rect.width,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [expeditionOpen]);

  if (!open || !shipment || !form) return null;

  const isPickup =
    getShippingStatusValue(shipment.shipping_status) ===
    "Dalam proses pick up";
  function toggleItem(id: string) {
    setForm((current) => {
      if (!current) return current;
      return {
        ...current,
        recap_ids: current.recap_ids.includes(id)
          ? current.recap_ids.filter((itemId) => itemId !== id)
          : [...current.recap_ids, id],
      };
    });
    setError("");
  }

  function openExpeditionDropdown() {
    const button = expeditionButtonRef.current;

    if (!button || mutation.isPending) {
      return;
    }

    const rect = button.getBoundingClientRect();
    const menuHeight = EXPEDITIONS.length * 48 + 16;
    const gap = 8;
    const viewportPadding = 12;
    const availableBelow = window.innerHeight - rect.bottom - viewportPadding;
    const availableAbove = rect.top - viewportPadding;
    const shouldOpenAbove =
      availableBelow < menuHeight && availableAbove > availableBelow;

    const top = shouldOpenAbove
      ? Math.max(viewportPadding, rect.top - menuHeight - gap)
      : rect.bottom + gap;

    setExpeditionDropdownPosition({
      top,
      left: rect.left,
      width: rect.width,
    });
    setExpeditionOpen(true);
  }

  function closeExpeditionDropdown() {
    setExpeditionOpen(false);
    setExpeditionDropdownPosition(null);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (isPickup) {
      setError("Pengiriman yang sudah di pick up tidak dapat diedit.");
      return;
    }
    if (!form) return;
    if (!form.member_id) {
      setError("Nama pembeli wajib dipilih.");
      return;
    }
    if (!form.recap_ids.length) {
      setError("Minimal satu barang harus dipilih.");
      return;
    }
    if (!form.address.trim()) {
      setError("Alamat lengkap wajib diisi.");
      return;
    }
    if (!form.expedition) {
      setError("Ekspedisi wajib dipilih.");
      return;
    }

    mutation.mutate();
  }

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-slate-900/50 p-4"
      style={{ zIndex: 2147483646 }}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between border-b border-[#e5eaf4] px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-[#20366f]">
              Edit Pengiriman
            </h2>
            <p className="mt-1 text-sm text-[#7a89ad]">
              Mengubah data pengiriman.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
            aria-label="Tutup"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="overflow-y-auto px-6 py-6">
            {error && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-medium text-red-600">{error}</p>
              </div>
            )}

            {optionsQuery.isError && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-medium text-red-600">
                  Gagal mengambil data pilihan pengiriman.
                </p>
                <p className="mt-1 text-xs text-red-500">
                  {optionsQuery.error.message}
                </p>
              </div>
            )}

            <label className="mb-2 block text-sm font-medium text-[#405274]">
              Nama Pembeli <span className="text-red-500">*</span>
            </label>
            <div className="relative z-30">
              <button
                type="button"
                onClick={() => setMemberOpen((v) => !v)}
                disabled={true}
                className="flex min-h-12 w-full items-center justify-between rounded-lg border border-[#d9e0ef] bg-white px-4 py-3 text-left text-sm text-[#20366f] disabled:bg-[#f7f9fc]"
              >
                <span className="truncate">
                  {members.find((m) => m.id === form.member_id)?.name ??
                    shipment.member?.name ??
                    "Pilih nama pembeli"}
                </span>
                <ChevronDown size={18} />
              </button>

              {memberOpen && (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] max-h-64 overflow-y-auto rounded-xl border border-[#d9e0ef] bg-white p-2 shadow-xl">
                  {members.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => {
                        setForm((current) =>
                          current
                            ? { ...current, member_id: member.id, recap_ids: [] }
                            : current,
                        );
                        setMemberOpen(false);
                        setError("");
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm text-[#20366f] hover:bg-[#f7f9ff]"
                    >
                      <span>
                        <span className="block font-medium">{member.name}</span>
                        <span className="mt-0.5 block text-xs text-[#7a89ad]">
                          {member.phone}
                        </span>
                      </span>
                      {form.member_id === member.id && (
                        <Check size={16} className="text-[#1457ff]" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-[#405274]">
                Detail Barang <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setItemsOpen((v) => !v)}
                  disabled={true}
                  className="flex min-h-12 w-full items-center justify-between rounded-lg border border-[#d9e0ef] bg-white px-4 py-3 text-left text-sm text-[#20366f] disabled:bg-[#f7f9fc]"
                >
                  <span className="truncate">
                    {selectedItems.length
                      ? `${selectedItems.length} barang dipilih`
                      : "Pilih barang"}
                  </span>
                  <ChevronDown size={18} />
                </button>

                {itemsOpen && (
                  <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-72 overflow-y-auto rounded-xl border border-[#d9e0ef] bg-white p-2 shadow-xl">
                    {filteredItems.length === 0 ? (
                      <p className="px-3 py-5 text-center text-sm text-[#7a89ad]">
                        Tidak ada barang yang memenuhi syarat.
                      </p>
                    ) : (
                      filteredItems.map((item) => {
                        const checked = form.recap_ids.includes(item.recap_id);
                        return (
                          <button
                            key={item.recap_id}
                            type="button"
                            onClick={() => toggleItem(item.recap_id)}
                            className="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left hover:bg-[#f7f9ff]"
                          >
                            <span
                              className={[
                                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                                checked
                                  ? "border-[#1457ff] bg-[#1457ff] text-white"
                                  : "border-[#cfd7e8] bg-white",
                              ].join(" ")}
                            >
                              {checked && <Check size={14} />}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-[#20366f]">
                                {item.detail_barang}
                              </span>
                              <span className="mt-1 block text-xs text-[#7a89ad]">
                                Qty {item.qty}
                              </span>
                            </span>
                            <span className="ml-auto shrink-0 text-right">
                              <span className="block text-xs text-[#5d6f9f]">
                                {item.batch_name}
                              </span>
                              <span className="block text-[11px] text-[#9aa6bf]">
                                {formatCountry(item.batch_country)}
                              </span>
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {selectedItems.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedItems.map((item) => (
                    <span
                      key={item.recap_id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#edf3ff] px-3 py-1.5 text-xs font-medium text-[#1457ff]"
                    >
                      {item.detail_barang}
                      <button
                        type="button"
                        onClick={() => toggleItem(item.recap_id)}
                        disabled={true}
                        aria-label={`Hapus ${item.detail_barang}`}
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-[#405274]">
                Alamat Lengkap <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                value={form.address}
                onChange={(e) =>
                  setForm((current) =>
                    current ? { ...current, address: e.target.value } : current,
                  )
                }
                disabled={mutation.isPending}
                className="w-full resize-none rounded-lg border border-[#d9e0ef] px-4 py-3 text-sm text-[#20366f] outline-none focus:border-[#1457ff]"
                placeholder="Masukkan alamat lengkap penerima"
              />
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-[#405274]">
                Ekspedisi <span className="text-red-500">*</span>
              </label>
              <div className="relative z-20">
                <button
                  ref={expeditionButtonRef}
                  type="button"
                  onClick={() =>
                    expeditionOpen
                      ? closeExpeditionDropdown()
                      : openExpeditionDropdown()
                  }
                  disabled={mutation.isPending}
                  className="flex min-h-12 w-full items-center justify-between rounded-lg border border-[#d9e0ef] bg-white px-4 py-3 text-left text-sm text-[#20366f]"
                >
                  <span>{form.expedition || "Pilih ekspedisi"}</span>
                  <ChevronDown
                    size={18}
                    className={[
                      "transition-transform",
                      expeditionOpen ? "rotate-180" : "",
                    ].join(" ")}
                  />
                </button>
              </div>
            </div>

            {expeditionOpen && expeditionDropdownPosition &&
              createPortal(
                <div
                  className="fixed z-[2147483647] overflow-hidden rounded-xl border border-[#d9e0ef] bg-white p-2 shadow-xl"
                  style={{
                    top: expeditionDropdownPosition.top,
                    left: expeditionDropdownPosition.left,
                    width: expeditionDropdownPosition.width,
                  }}
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  {EXPEDITIONS.map((expedition) => (
                    <button
                      key={expedition}
                      type="button"
                      onClick={() => {
                        setForm((current) =>
                          current ? { ...current, expedition } : current,
                        );
                        closeExpeditionDropdown();
                        setError("");
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm text-[#20366f] hover:bg-[#f7f9ff]"
                    >
                      {expedition}
                      {form.expedition === expedition && (
                        <Check size={16} className="text-[#1457ff]" />
                      )}
                    </button>
                  ))}
                </div>,
                document.body,
              )}

          </div>

          <div className="flex shrink-0 justify-end gap-3 border-t border-[#e5eaf4] px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={mutation.isPending}
              className="rounded-lg border border-[#d9e0ef] bg-white px-5 py-2.5 text-sm font-medium text-[#20366f]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || isPickup}
              className="rounded-lg bg-[#1457ff] px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mutation.isPending ? "Menyimpan..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
