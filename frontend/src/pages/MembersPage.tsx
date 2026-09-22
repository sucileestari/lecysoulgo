import { useState } from "react";
import {
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import DeleteMemberDialog from "../components/common/DeleteMemberDialog";
import EditMemberDialog from "../components/common/EditMemberDialog";
import AddMemberDialog from "../components/common/AddMemberDialog";

import {
  getMembers,
  type Member,
} from "../services/memberService";

import {
  hasPermission,
} from "../utils/permissions";

export default function MembersPage() {
  const queryClient = useQueryClient();

  // ==============================
  // State
  // ==============================

  const [search, setSearch] = useState("");

  const [isAddDialogOpen, setIsAddDialogOpen] =
    useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] =
    useState(false);

  const [selectedMember, setSelectedMember] =
    useState<Member | null>(null);

  const [isEditDialogOpen, setIsEditDialogOpen] =
    useState(false);

  const [selectedEditMember, setSelectedEditMember] =
    useState<Member | null>(null);

  // ==============================
  // Query
  // ==============================

  const {
    data: members = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<Member[], Error>({
    queryKey: ["members", search],
    queryFn: () => getMembers(search),
  });

  // ==============================
  // Add Member
  // ==============================

  const handleMemberCreated = async (
    _member: Member,
  ) => {
    await refetch();
  };

  // ==============================
  // Edit Member
  // ==============================

  const handleEditMember = (member: Member) => {
    setSelectedEditMember(member);
    setIsEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setSelectedEditMember(null);
  };

  // ==============================
  // Delete Member
  // ==============================

  const handleDeleteMember = (member: Member) => {
    setSelectedMember(member);
    setIsDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSelectedMember(null);
  };

  // ==============================
  // Format Date
  // ==============================

  const formatUpdatedAt = (date: string) => {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "-";
    }

    return parsedDate.toLocaleString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-[#f8faff] text-left">
      <div className="w-full px-6 py-8 lg:px-8">

        {/* =========================
            HEADER
        ========================== */}
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          {/* Title */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#10245c]">
              Daftar Anggota
            </h1>

            <p className="mt-2 text-sm text-[#5d6f9f]">
              Menampilkan semua anggota
            </p>
          </div>

          {/* Header Actions */}
          <div className="flex flex-col gap-3 sm:flex-row">

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7a89ad]" />

              <input
                type="text"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                }}
                placeholder="Cari anggota..."
                className="h-12 w-full rounded-lg border border-[#d9e0ef] bg-white pl-11 pr-4 text-sm text-[#20366f] outline-none transition placeholder:text-[#8a96b4] focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10 sm:w-[250px]"
              />
            </div>

            {/* Add Button */}
            {hasPermission("members.create") && (
              <button
                type="button"
                onClick={() => setIsAddDialogOpen(true)}
                className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#1457ff] px-5 text-sm font-medium text-white shadow-sm transition hover:bg-[#0d4be0] active:scale-[0.99]"
              >
                <Plus className="h-5 w-5" />
                Tambah Anggota
              </button>
            )}
          </div>
        </div>

        {/* =========================
            TABLE
        ========================== */}
        <section className="mt-7 overflow-hidden rounded-xl border border-[#edf0f6] bg-white shadow-sm">
          <div className="overflow-x-auto">

            <table className="w-full min-w-[900px] table-fixed border-collapse">

              {/* Column Width */}
              <colgroup>
                <col className="w-[8%]" />
                <col className="w-[23%]" />
                <col className="w-[20%]" />
                <col className="w-[17%]" />
                <col className="w-[20%]" />
                <col className="w-[12%]" />
              </colgroup>

              {/* =========================
                  TABLE HEADER
              ========================== */}
              <thead>
                <tr className="border-b border-[#e8ecf4]">
                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#17285d]">
                    No
                  </th>

                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#17285d]">
                    Nama Lengkap
                  </th>

                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#17285d]">
                    No. Telepon
                  </th>

                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#17285d]">
                    Tipe Anggota
                  </th>

                  <th className="px-6 py-5 text-left text-sm font-semibold text-[#17285d]">
                    Last Update
                  </th>

                  <th className="px-6 py-5 pr-12 text-center text-sm font-semibold text-[#17285d]">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody>

                {/* =========================
                    LOADING
                ========================== */}
                {isLoading && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-20 text-center"
                    >
                      <p className="text-base text-[#7a89ad]">
                        Memuat data anggota...
                      </p>
                    </td>
                  </tr>
                )}

                {/* =========================
                    ERROR
                ========================== */}
                {isError && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-20 text-center"
                    >
                      <p className="text-base font-medium text-red-500">
                        Gagal mengambil data anggota.
                      </p>

                      <p className="mt-2 text-sm text-[#7a89ad]">
                        {error.message}
                      </p>
                    </td>
                  </tr>
                )}

                {/* =========================
                    EMPTY
                ========================== */}
                {!isLoading &&
                  !isError &&
                  members.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-20 text-center"
                      >
                        <div className="flex flex-col items-center">
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#edf3ff]">
                            <Users className="h-6 w-6 text-[#1457ff]" />
                          </div>

                          <p className="mt-4 text-base font-medium text-[#20366f]">
                            {search
                              ? "Anggota tidak ditemukan"
                              : "Belum ada anggota"}
                          </p>

                          <p className="mt-2 text-sm text-[#7a89ad]">
                            {search
                              ? "Coba gunakan kata kunci pencarian lain."
                              : "Data anggota akan muncul di sini."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}

                {/* =========================
                    MEMBER DATA
                ========================== */}
                {!isLoading &&
                  !isError &&
                  members.map((member, index) => (
                    <tr
                      key={member.id}
                      className="border-b border-[#eef1f6] last:border-b-0 transition-colors hover:bg-[#fbfcff]"
                    >
                      {/* No */}
                      <td className="px-6 py-6 text-base text-[#23376e]">
                        {index + 1}
                      </td>

                      {/* Nama */}
                      <td className="px-6 py-6 text-base font-medium text-[#20366f]">
                        {member.name}
                      </td>

                      {/* Phone */}
                      <td className="px-6 py-6 text-base text-[#20366f]">
                        {member.phone}
                      </td>

                      {/* Tipe Anggota */}
                      <td className="px-6 py-6 text-base text-[#20366f]">
                        {member.type === "employee"
                          ? "Karyawan"
                          : member.type === "hnr"
                            ? "HNR"
                            : "Customer"}
                      </td>

                      {/* Last Update */}
                      <td className="px-6 py-6 text-base text-[#20366f]">
                        {formatUpdatedAt(
                          member.updated_at,
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="px-6 py-6 pr-12">
                        <div className="flex items-center justify-center gap-2">
                          {member.type !== "hnr" && (
                            <>
                              {/* Edit */}
                              {hasPermission("members.edit") && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleEditMember(member)
                                  }
                                  aria-label={`Edit ${member.name}`}
                                  title="Edit anggota"
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d9e0ef] text-[#50628e] transition hover:bg-[#f8faff] hover:text-[#1457ff]"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                              )}

                              {/* Delete */}
                              {hasPermission("members.delete") && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteMember(member)
                                  }
                                  aria-label={`Hapus ${member.name}`}
                                  title="Hapus anggota"
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-500 transition hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* =========================
          ADD MEMBER DIALOG
      ========================== */}
      <AddMemberDialog
        open={isAddDialogOpen}
        onClose={() =>
          setIsAddDialogOpen(false)
        }
        onSuccess={handleMemberCreated}
      />

      {/* =========================
          DELETE MEMBER DIALOG
      ========================== */}
      <DeleteMemberDialog
        open={isDeleteDialogOpen}
        member={selectedMember}
        onClose={handleCloseDeleteDialog}
        onSuccess={async () => {
          await refetch();
        }}
      />

      {/* =========================
          EDIT MEMBER DIALOG
      ========================== */}
      <EditMemberDialog
        open={isEditDialogOpen}
        member={selectedEditMember}
        onClose={handleCloseEditDialog}
        onSuccess={async () => {
          await queryClient.invalidateQueries({
            queryKey: ["members"],
          });

          await queryClient.invalidateQueries({
            queryKey: ["recaps"],
          });

          await queryClient.invalidateQueries({
            queryKey: [
              "customer",
              "recaps",
              "member-type",
            ],
          });

          await queryClient.invalidateQueries({
            queryKey: ["manual-shipment-buyers"],
          });

          await queryClient.invalidateQueries({
            queryKey: ["manual-shipment-options"],
          });

          await refetch();
        }}
      />
    </div>
  );
}