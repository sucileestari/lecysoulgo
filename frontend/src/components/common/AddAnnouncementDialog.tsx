import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ChevronDown,
  X,
} from "lucide-react";

import {
  createAnnouncement,
  type Announcement,
  type AnnouncementCategory,
} from "../../services/announcementService";

type AddAnnouncementDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (
    announcement: Announcement,
  ) => void | Promise<void>;
};

type FormState = {
  title: string;
  category: AnnouncementCategory;
  content: string;
  action_solution: string;
};

const initialFormState: FormState = {
  title: "",
  category: "information",
  content: "",
  action_solution: "",
};

export default function AddAnnouncementDialog({
  open,
  onClose,
  onSuccess,
}: AddAnnouncementDialogProps) {
  const [
    form,
    setForm,
  ] = useState<FormState>(
    initialFormState,
  );

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    isCategoryDropdownOpen,
    setIsCategoryDropdownOpen,
  ] = useState(false);

  const categoryDropdownRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent,
    ) => {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(
          event.target as Node,
        )
      ) {
        setIsCategoryDropdownOpen(false);
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

  if (!open) {
    return null;
  }

  function handleChange(
    field: keyof FormState,
    value: string,
  ) {
    setForm(
      (current) => ({
        ...current,
        [field]:
          value,
      }),
    );
  }

  function handleClose() {
    if (isSubmitting) {
      return;
    }

    setForm(
      initialFormState,
    );

    setError("");
    setIsCategoryDropdownOpen(false);

    onClose();
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    const title =
      form.title.trim();

    const content =
      form.content.trim();

    const actionSolution =
      form.action_solution.trim();

    if (!title) {
      setError(
        "Judul pengumuman wajib diisi.",
      );
      return;
    }

    if (!content) {
      setError(
        "Isi pengumuman wajib diisi.",
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const announcement =
        await createAnnouncement({
          title,
          category:
            form.category,
          content,
          action_solution:
            actionSolution ||
            null,
        });

      await onSuccess(
        announcement,
      );

      setForm(
        initialFormState,
      );

      setError("");
      setIsCategoryDropdownOpen(false);

      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof
          Error
          ? submitError.message
          : "Gagal menambahkan pengumuman.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-4 py-6">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">

        {/* HEADER */}

        <div className="border-b border-[#edf0f6] px-6 py-5">

          <div className="flex items-start justify-between gap-4">

            <div>
              <h2 className="text-xl font-semibold text-[#20366f]">
                Tambah Pengumuman
              </h2>

              <p className="mt-1 text-sm text-[#7a89ad]">
                Menambahkan informasi baru
                untuk member Lecy Soulgo.
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
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#7a89ad] transition hover:bg-[#f5f7fc] hover:text-[#20366f] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Tutup"
            >
              <X className="h-5 w-5" />
            </button>

          </div>
        </div>

        {/* FORM */}

        <form
          onSubmit={
            handleSubmit
          }
        >

          <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-6">

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* JUDUL */}

            <div>

              <label className="mb-2 block text-sm font-medium text-[#20366f]">
                Judul Pengumuman

                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                type="text"
                value={
                  form.title
                }
                onChange={(
                  event,
                ) =>
                  handleChange(
                    "title",
                    event.target
                      .value,
                  )
                }
                placeholder="Masukkan judul pengumuman..."
                disabled={
                  isSubmitting
                }
                className="h-12 w-full rounded-lg border border-[#d9e0ef] bg-white px-4 text-sm text-[#20366f] outline-none transition placeholder:text-[#8a96b4] focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10 disabled:cursor-not-allowed disabled:bg-[#f8faff]"
              />

            </div>

            {/* KATEGORI */}

            <div
              ref={categoryDropdownRef}
              className="relative"
            >

              <label className="mb-2 block text-sm font-medium text-[#20366f]">
                Kategori

                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              {/* SELECT BUTTON */}

              <button
                type="button"
                onClick={() => {
                  setIsCategoryDropdownOpen(
                    (current) => !current,
                  );
                }}
                disabled={isSubmitting}
                className="flex h-12 w-full items-center justify-between rounded-lg border border-[#d8dfec] bg-white px-4 text-left text-sm text-[#20366f] outline-none transition hover:border-[#bfcbe0] focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10 disabled:cursor-not-allowed disabled:bg-[#f8faff]"
              >

                <span className="font-medium text-[#20366f]">
                  {form.category === "important"
                    ? "Penting"
                    : form.category === "attention"
                      ? "Perhatian"
                      : "Informasi"}
                </span>

                <ChevronDown
                  className={[
                    "h-4 w-4 shrink-0 text-[#7a89ad] transition-transform",
                    isCategoryDropdownOpen
                      ? "rotate-180"
                      : "",
                  ].join(" ")}
                />

              </button>

              {/* DROPDOWN */}

              {isCategoryDropdownOpen && (
                <div className="absolute left-0 right-0 top-full z-[100] mt-2 overflow-hidden rounded-lg border border-[#d8dfec] bg-white shadow-lg">

                  <div
                    style={{
                      overflowY: "auto",
                      overscrollBehavior:
                        "contain",
                    }}
                  >

                    {[
                      {
                        value:
                          "important" as AnnouncementCategory,
                        label: "Penting",
                      },
                      {
                        value:
                          "attention" as AnnouncementCategory,
                        label: "Perhatian",
                      },
                      {
                        value:
                          "information" as AnnouncementCategory,
                        label: "Informasi",
                      },
                    ].map((option) => {

                      const isSelected =
                        option.value ===
                        form.category;

                      return (

                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {

                            handleChange(
                              "category",
                              option.value,
                            );

                            setIsCategoryDropdownOpen(
                              false,
                            );

                          }}
                          style={{
                            height: "56px",
                            minHeight: "56px",
                          }}
                          className={[
                            "flex w-full shrink-0 items-center gap-3 px-4 text-left transition",
                            isSelected
                              ? "bg-[#edf3ff]"
                              : "hover:bg-[#f8faff]",
                          ].join(" ")}
                        >

                          <div className="min-w-0 flex-1">

                            <p className="truncate text-sm font-medium leading-5 text-[#20366f]">
                              {option.label}
                            </p>

                          </div>

                          {isSelected && (
                            <span className="shrink-0 text-xs font-medium text-[#1457ff]">
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

            {/* ISI */}

            <div>

              <label className="mb-2 block text-sm font-medium text-[#20366f]">
                Isi Pengumuman

                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <textarea
                value={
                  form.content
                }
                onChange={(
                  event,
                ) =>
                  handleChange(
                    "content",
                    event.target
                      .value,
                  )
                }
                placeholder="Tulis isi pengumuman..."
                rows={7}
                disabled={
                  isSubmitting
                }
                className="w-full resize-y rounded-lg border border-[#d9e0ef] bg-white px-4 py-3 text-sm leading-6 text-[#20366f] outline-none transition placeholder:text-[#8a96b4] focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10 disabled:cursor-not-allowed disabled:bg-[#f8faff]"
              />

            </div>

            {/* TINDAKAN / SOLUSI */}

            <div>

              <label className="mb-2 block text-sm font-medium text-[#20366f]">
                Tindakan / Solusi

                <span className="ml-1 text-xs font-normal text-[#8a96b4]">
                  (opsional)
                </span>
              </label>

              <textarea
                value={
                  form.action_solution
                }
                onChange={(
                  event,
                ) =>
                  handleChange(
                    "action_solution",
                    event.target
                      .value,
                  )
                }
                placeholder="Tulis tindakan atau solusi jika ada..."
                rows={5}
                disabled={
                  isSubmitting
                }
                className="w-full resize-y rounded-lg border border-[#d9e0ef] bg-white px-4 py-3 text-sm leading-6 text-[#20366f] outline-none transition placeholder:text-[#8a96b4] focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10 disabled:cursor-not-allowed disabled:bg-[#f8faff]"
              />

            </div>

          </div>

          {/* FOOTER */}

          <div className="flex flex-col-reverse gap-3 border-t border-[#edf0f6] px-6 py-4 sm:flex-row sm:justify-end">

            <button
              type="button"
              onClick={
                handleClose
              }
              disabled={
                isSubmitting
              }
              className="h-11 rounded-lg border border-[#d9e0ef] px-5 text-sm font-medium text-[#50628e] transition hover:bg-[#f8faff] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={
                isSubmitting
              }
              className="h-11 rounded-lg bg-[#1457ff] px-5 text-sm font-medium text-white transition hover:bg-[#0d4be0] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting
                ? "Menyimpan..."
                : "Simpan"}
            </button>

          </div>

        </form>

      </div>
    </div>
  );
}