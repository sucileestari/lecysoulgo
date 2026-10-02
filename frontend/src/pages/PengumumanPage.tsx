import {
  useState,
} from "react";

import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  Megaphone,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  Send,
} from "lucide-react";

import {
  getAnnouncements,
  deleteAnnouncement,
  publishAnnouncement,
  type Announcement,
  type AnnouncementCategory,
} from "../services/announcementService";

import AddAnnouncementDialog from "../components/common/AddAnnouncementDialog";

import EditAnnouncementDialog from "../components/common/EditAnnouncementDialog";

/* =========================================
   CATEGORY CONFIG
========================================= */

const categoryConfig: Record<
  AnnouncementCategory,
  {
    label: string;
    badgeClass: string;
  }
> = {
  important: {
    label: "Penting",
    badgeClass:
      "bg-red-50 text-red-600 border border-red-100",
  },

  attention: {
    label: "Perhatian",
    badgeClass:
      "bg-amber-50 text-amber-600 border border-amber-100",
  },

  information: {
    label: "Informasi",
    badgeClass:
      "bg-[#edf3ff] text-[#1457ff] border border-[#dce8ff]",
  },
};

/* =========================================
   DATE FORMAT
========================================= */

function formatDate(
  date: string,
): string {
  const parsedDate =
    new Date(date);

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return "-";
  }

  return parsedDate.toLocaleString(
    "id-ID",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

/* =========================================
   PAGE
========================================= */

export default function PengumumanPage() {
  const queryClient =
    useQueryClient();

  /* =======================================
     SEARCH
  ======================================== */

  const [search, setSearch] =
    useState("");

  /* =======================================
     ADD DIALOG
  ======================================== */

  const [
    isAddDialogOpen,
    setIsAddDialogOpen,
  ] = useState(false);

  /* =======================================
     EDIT DIALOG
  ======================================== */

  const [
    isEditDialogOpen,
    setIsEditDialogOpen,
  ] = useState(false);

  const [
    selectedEditAnnouncement,
    setSelectedEditAnnouncement,
  ] =
    useState<Announcement | null>(
      null,
    );

  /* =======================================
     DELETE DIALOG
  ======================================== */

  const [
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
  ] = useState(false);

  const [
    selectedDeleteAnnouncement,
    setSelectedDeleteAnnouncement,
  ] =
    useState<Announcement | null>(
      null,
    );

  /* =======================================
     PUBLISH DIALOG
  ======================================== */

  const [
    isPublishDialogOpen,
    setIsPublishDialogOpen,
  ] = useState(false);

  const [
    selectedPublishAnnouncement,
    setSelectedPublishAnnouncement,
  ] =
    useState<Announcement | null>(
      null,
    );

  /* =======================================
     ACTION STATE
  ======================================== */

  const [
    actionError,
    setActionError,
  ] = useState("");

  const [
    actionSuccess,
    setActionSuccess,
  ] = useState("");

  const [
    isDeleting,
    setIsDeleting,
  ] = useState(false);

  const [
    isPublishing,
    setIsPublishing,
  ] = useState(false);

  /* =======================================
     QUERY
  ======================================== */

  const {
    data: announcements = [],
    isLoading,
    isError,
    error,
  } = useQuery<
    Announcement[],
    Error
  >({
    queryKey: [
      "announcements",
      search,
    ],
    queryFn: () =>
      getAnnouncements(search),
  });

  /* =======================================
     ADD SUCCESS
  ======================================== */

  async function handleAnnouncementCreated(
    _announcement: Announcement,
  ) {
    await queryClient.invalidateQueries(
      {
        queryKey: [
          "announcements",
        ],
      },
    );

    setActionError("");

    setActionSuccess(
      "Pengumuman berhasil dibuat.",
    );
  }

  /* =======================================
     OPEN EDIT
  ======================================== */

  function handleEditAnnouncement(
    announcement: Announcement,
  ) {
    setSelectedEditAnnouncement(
      announcement,
    );

    setActionError("");

    setIsEditDialogOpen(
      true,
    );
  }

  /* =======================================
     CLOSE EDIT
  ======================================== */

  function handleCloseEditDialog() {
    if (isDeleting) {
      return;
    }

    setIsEditDialogOpen(
      false,
    );

    setSelectedEditAnnouncement(
      null,
    );
  }

  /* =======================================
     EDIT SUCCESS
  ======================================== */

  async function handleAnnouncementUpdated(
    _announcement: Announcement,
  ) {
    await queryClient.invalidateQueries(
      {
        queryKey: [
          "announcements",
        ],
      },
    );

    setActionError("");

    setActionSuccess(
      "Pengumuman berhasil diperbarui.",
    );
  }

  /* =======================================
     OPEN DELETE
  ======================================== */

  function handleDeleteAnnouncement(
    announcement: Announcement,
  ) {
    setSelectedDeleteAnnouncement(
      announcement,
    );

    setActionError("");

    setIsDeleteDialogOpen(
      true,
    );
  }

  /* =======================================
     CLOSE DELETE
  ======================================== */

  function handleCloseDeleteDialog() {
    if (isDeleting) {
      return;
    }

    setIsDeleteDialogOpen(
      false,
    );

    setSelectedDeleteAnnouncement(
      null,
    );
  }

  /* =======================================
     CONFIRM DELETE
  ======================================== */

  async function handleConfirmDelete() {
    if (
      !selectedDeleteAnnouncement
    ) {
      return;
    }

    try {
      setIsDeleting(true);
      setActionError("");
      setActionSuccess("");

      await deleteAnnouncement(
        selectedDeleteAnnouncement.id,
      );

      await queryClient.invalidateQueries(
        {
          queryKey: [
            "announcements",
          ],
        },
      );

      handleCloseDeleteDialog();

      setActionSuccess(
        "Pengumuman berhasil dihapus.",
      );
    } catch (deleteError) {
      setActionError(
        deleteError instanceof
          Error
          ? deleteError.message
          : "Gagal menghapus pengumuman.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  /* =======================================
     OPEN PUBLISH
  ======================================== */

  function handlePublishAnnouncement(
    announcement: Announcement,
  ) {
    setSelectedPublishAnnouncement(
      announcement,
    );

    setActionError("");

    setIsPublishDialogOpen(
      true,
    );
  }

  /* =======================================
     CLOSE PUBLISH
  ======================================== */

  function handleClosePublishDialog() {
    if (isPublishing) {
      return;
    }

    setIsPublishDialogOpen(
      false,
    );

    setSelectedPublishAnnouncement(
      null,
    );
  }

  /* =======================================
     CONFIRM PUBLISH
  ======================================== */

  async function handleConfirmPublish() {
    if (
      !selectedPublishAnnouncement
    ) {
      return;
    }

    try {
      setIsPublishing(true);
      setActionError("");
      setActionSuccess("");

      await publishAnnouncement(
        selectedPublishAnnouncement.id,
      );

      await queryClient.invalidateQueries(
        {
          queryKey: [
            "announcements",
          ],
        },
      );

      handleClosePublishDialog();

      setActionSuccess(
        "Pengumuman berhasil dipublikasikan.",
      );
    } catch (publishError) {
      setActionError(
        publishError instanceof
          Error
          ? publishError.message
          : "Gagal mempublikasikan pengumuman.",
      );
    } finally {
      setIsPublishing(false);
    }
  }

  /* =======================================
     RENDER
  ======================================== */

  return (
    <div className="min-h-screen bg-[#f8faff] text-left">
      <div className="w-full px-6 py-8 lg:px-8">

        {/* =================================
            HEADER
        ================================== */}

        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">

          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#10245c]">
              Pengumuman
            </h1>

            <p className="mt-2 text-sm text-[#5d6f9f]">
              Menampilkan semua
              pengumuman untuk
              member Lecy Soulgo.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">

            {/* SEARCH */}

            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7a89ad]" />

              <input
                type="text"
                value={search}
                onChange={(
                  event,
                ) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Cari pengumuman..."
                className="h-12 w-full rounded-lg border border-[#d9e0ef] bg-white pl-11 pr-4 text-sm text-[#20366f] outline-none transition placeholder:text-[#8a96b4] focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10 sm:w-[270px]"
              />
            </div>

            {/* ADD */}

            <button
              type="button"
              onClick={() =>
                setIsAddDialogOpen(
                  true,
                )
              }
              className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#1457ff] px-5 text-sm font-medium text-white shadow-sm transition hover:bg-[#0d4be0] active:scale-[0.99]"
            >
              <Plus className="h-5 w-5" />
              Tambah Pengumuman
            </button>

          </div>

        </div>

        {/* =================================
            SUCCESS
        ================================== */}

        {actionSuccess && (
          <div className="mt-6 flex items-start justify-between gap-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">

            <span>
              {actionSuccess}
            </span>

            <button
              type="button"
              onClick={() =>
                setActionSuccess(
                  "",
                )
              }
              className="shrink-0 text-green-600 hover:text-green-800"
              aria-label="Tutup pesan"
            >
              <X className="h-4 w-4" />
            </button>

          </div>
        )}

        {/* =================================
            LIST
        ================================== */}

        <section className="mt-7">

          {/* LOADING */}

          {isLoading && (
            <div className="rounded-xl border border-[#edf0f6] bg-white px-6 py-20 text-center shadow-sm">
              <p className="text-base text-[#7a89ad]">
                Memuat data
                pengumuman...
              </p>
            </div>
          )}

          {/* ERROR */}

          {isError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center">
              <p className="text-base font-medium text-red-500">
                Gagal mengambil
                data pengumuman.
              </p>

              <p className="mt-2 text-sm text-[#7a89ad]">
                {error.message}
              </p>
            </div>
          )}

          {/* EMPTY */}

          {!isLoading &&
            !isError &&
            announcements.length ===
              0 && (
              <div className="rounded-xl border border-[#edf0f6] bg-white px-6 py-20 text-center shadow-sm">

                <div className="flex flex-col items-center">

                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#edf3ff]">
                    <Megaphone className="h-6 w-6 text-[#1457ff]" />
                  </div>

                  <p className="mt-4 text-base font-medium text-[#20366f]">
                    {search
                      ? "Pengumuman tidak ditemukan"
                      : "Belum ada pengumuman"}
                  </p>

                  <p className="mt-2 text-sm text-[#7a89ad]">
                    {search
                      ? "Coba gunakan kata kunci pencarian lain."
                      : "Data pengumuman akan muncul di sini."}
                  </p>

                </div>

              </div>
            )}

          {/* DESKTOP */}

          {!isLoading &&
            !isError &&
            announcements.length >
              0 && (
              <div className="hidden space-y-4 md:block">

                {announcements.map(
                  (
                    announcement,
                  ) => {
                    const category =
                      categoryConfig[
                        announcement.category
                      ];

                    const isDraft =
                      announcement.status ===
                      "draft";

                    return (
                      <article
                        key={
                          announcement.id
                        }
                        className="rounded-xl border border-[#edf0f6] bg-white p-6 shadow-sm transition hover:shadow-md"
                      >

                        <div className="flex items-start justify-between gap-5">

                          <div className="min-w-0 flex-1">

                            <div className="flex flex-wrap items-center gap-2">

                              <span
                                className={[
                                  "rounded-full px-3 py-1 text-xs font-semibold",
                                  category.badgeClass,
                                ].join(
                                  " ",
                                )}
                              >
                                {
                                  category.label
                                }
                              </span>

                              {isDraft && (
                                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
                                  Draft
                                </span>
                              )}

                            </div>

                            <h2 className="mt-3 text-xl font-semibold text-[#20366f]">
                              {
                                announcement.title
                              }
                            </h2>

                          </div>

                          <div className="flex shrink-0 items-center gap-2">

                            {isDraft && (
                              <button
                                type="button"
                                onClick={() =>
                                  handlePublishAnnouncement(
                                    announcement,
                                  )
                                }
                                title="Publikasikan pengumuman"
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d9e0ef] text-[#1457ff] transition hover:bg-[#edf3ff]"
                              >
                                <Send className="h-4 w-4" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                handleEditAnnouncement(
                                  announcement,
                                )
                              }
                              title="Edit pengumuman"
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d9e0ef] text-[#50628e] transition hover:bg-[#f8faff] hover:text-[#1457ff]"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteAnnouncement(
                                  announcement,
                                )
                              }
                              title="Hapus pengumuman"
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-500 transition hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>

                          </div>

                        </div>

                        {/* CONTENT */}

                        <div className="mt-5">
                          <p className="whitespace-pre-line text-sm leading-7 text-[#4f6088]">
                            {
                              announcement.content
                            }
                          </p>
                        </div>

                        {/* SOLUTION */}

                        {announcement.action_solution && (
                          <div className="mt-5 rounded-xl border border-[#e5ebf8] bg-[#f8faff] p-4">

                            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#6f7fa5]">
                              Tindakan /
                              Solusi
                            </p>

                            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-[#20366f]">
                              {
                                announcement.action_solution
                              }
                            </p>

                          </div>
                        )}

                        {/* FOOTER */}

                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#eef1f6] pt-4">

                          <p className="text-xs text-[#8a96b4]">
                            Terakhir diperbarui{" "}
                            {formatDate(
                              announcement.updated_at,
                            )}
                          </p>

                          {announcement
                            .created_by_user
                            ?.name && (
                            <p className="text-xs text-[#8a96b4]">
                              Dibuat oleh{" "}
                              <span className="font-medium text-[#63739a]">
                                {
                                  announcement
                                    .created_by_user
                                    .name
                                }
                              </span>
                            </p>
                          )}

                        </div>

                      </article>
                    );
                  },
                )}

              </div>
            )}

          {/* MOBILE */}

          {!isLoading &&
            !isError &&
            announcements.length >
              0 && (
              <div className="space-y-3 md:hidden">

                {announcements.map(
                  (
                    announcement,
                  ) => {
                    const category =
                      categoryConfig[
                        announcement.category
                      ];

                    const isDraft =
                      announcement.status ===
                      "draft";

                    return (
                      <article
                        key={
                          announcement.id
                        }
                        className="rounded-xl border border-[#edf0f6] bg-white p-4 shadow-sm"
                      >

                        <div className="flex items-start justify-between gap-3">

                          <div className="min-w-0 flex-1">

                            <div className="flex flex-wrap items-center gap-2">

                              <span
                                className={[
                                  "rounded-full px-3 py-1 text-xs font-semibold",
                                  category.badgeClass,
                                ].join(
                                  " ",
                                )}
                              >
                                {
                                  category.label
                                }
                              </span>

                              {isDraft && (
                                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
                                  Draft
                                </span>
                              )}

                            </div>

                            <h3 className="mt-3 text-base font-semibold leading-6 text-[#20366f]">
                              {
                                announcement.title
                              }
                            </h3>

                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleEditAnnouncement(
                                announcement,
                              )
                            }
                            aria-label="Edit pengumuman"
                            title="Edit pengumuman"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#d9e0ef] text-[#50628e] transition hover:bg-[#f8faff] hover:text-[#1457ff]"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                        </div>

                        <div className="mt-4">
                          <p className="whitespace-pre-line text-sm leading-6 text-[#5d6f9f]">
                            {
                              announcement.content
                            }
                          </p>
                        </div>

                        {announcement.action_solution && (
                          <div className="mt-4 rounded-xl border border-[#e5ebf8] bg-[#f8faff] p-4">

                            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#6f7fa5]">
                              Tindakan /
                              Solusi
                            </p>

                            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#20366f]">
                              {
                                announcement.action_solution
                              }
                            </p>

                          </div>
                        )}

                        <div className="mt-4 border-t border-gray-100 pt-4">

                          <p className="text-xs text-[#8a96b4]">
                            Terakhir diperbarui{" "}
                            {formatDate(
                              announcement.updated_at,
                            )}
                          </p>

                          <div className="mt-3 flex items-center justify-end gap-2">

                            {isDraft && (
                              <button
                                type="button"
                                onClick={() =>
                                  handlePublishAnnouncement(
                                    announcement,
                                  )
                                }
                                className="flex h-10 items-center justify-center gap-2 rounded-lg border border-[#d9e0ef] px-4 text-sm font-medium text-[#1457ff] transition hover:bg-[#edf3ff]"
                              >
                                <Send className="h-4 w-4" />
                                Publish
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                handleEditAnnouncement(
                                  announcement,
                                )
                              }
                              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-[#d9e0ef] px-4 text-sm font-medium text-[#50628e] transition hover:bg-[#f8faff] hover:text-[#1457ff]"
                            >
                              <Pencil className="h-4 w-4" />
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteAnnouncement(
                                  announcement,
                                )
                              }
                              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-medium text-red-500 transition hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              Hapus
                            </button>

                          </div>

                        </div>

                      </article>
                    );
                  },
                )}

              </div>
            )}

        </section>

      </div>

      {/* =====================================
          ADD ANNOUNCEMENT DIALOG
      ====================================== */}

      <AddAnnouncementDialog
        open={
          isAddDialogOpen
        }
        onClose={() =>
          setIsAddDialogOpen(
            false,
          )
        }
        onSuccess={
          handleAnnouncementCreated
        }
      />

      {/* =====================================
          EDIT ANNOUNCEMENT DIALOG
      ====================================== */}

      <EditAnnouncementDialog
        open={
          isEditDialogOpen
        }
        announcement={
          selectedEditAnnouncement
        }
        onClose={
          handleCloseEditDialog
        }
        onSuccess={
          handleAnnouncementUpdated
        }
      />

      {/* =====================================
          DELETE DIALOG
      ====================================== */}

      {isDeleteDialogOpen &&
        selectedDeleteAnnouncement && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 px-4">

            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">

              <div className="flex items-start gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50">
                  <Trash2 className="h-5 w-5 text-red-500" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-[#20366f]">
                    Hapus Pengumuman
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#7a89ad]">
                    Apakah kamu yakin
                    ingin menghapus
                    pengumuman
                    {" "}
                    <span className="font-medium text-[#20366f]">
                      "
                      {
                        selectedDeleteAnnouncement.title
                      }
                      "
                    </span>
                    ?
                  </p>
                </div>

              </div>

              {actionError && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {actionError}
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={
                    handleCloseDeleteDialog
                  }
                  disabled={
                    isDeleting
                  }
                  className="h-11 rounded-lg border border-[#d9e0ef] px-5 text-sm font-medium text-[#50628e] transition hover:bg-[#f8faff] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={
                    handleConfirmDelete
                  }
                  disabled={
                    isDeleting
                  }
                  className="h-11 rounded-lg bg-red-500 px-5 text-sm font-medium text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDeleting
                    ? "Menghapus..."
                    : "Hapus"}
                </button>

              </div>

            </div>

          </div>
        )}

      {/* =====================================
          PUBLISH DIALOG
      ====================================== */}

      {isPublishDialogOpen &&
        selectedPublishAnnouncement && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 px-4">

            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">

              <div className="flex items-start gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#edf3ff]">
                  <Send className="h-5 w-5 text-[#1457ff]" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-[#20366f]">
                    Publikasikan Pengumuman
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#7a89ad]">
                    Pengumuman ini
                    akan muncul
                    di dashboard
                    customer setelah
                    dipublikasikan.
                  </p>
                </div>

              </div>

              <div className="mt-4 rounded-lg bg-[#f8faff] px-4 py-3">
                <p className="text-sm font-medium text-[#20366f]">
                  {
                    selectedPublishAnnouncement.title
                  }
                </p>
              </div>

              {actionError && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {actionError}
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={
                    handleClosePublishDialog
                  }
                  disabled={
                    isPublishing
                  }
                  className="h-11 rounded-lg border border-[#d9e0ef] px-5 text-sm font-medium text-[#50628e] transition hover:bg-[#f8faff] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={
                    handleConfirmPublish
                  }
                  disabled={
                    isPublishing
                  }
                  className="h-11 rounded-lg bg-[#1457ff] px-5 text-sm font-medium text-white transition hover:bg-[#0d4be0] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPublishing
                    ? "Memublikasikan..."
                    : "Publikasikan"}
                </button>

              </div>

            </div>

          </div>
        )}

    </div>
  );
}