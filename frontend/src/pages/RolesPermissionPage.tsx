import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Check,
  ChevronDown,
  ChevronRight,
  Edit,
  Eye,
  KeyRound,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";

import {
  createRole,
  deleteRole,
  getPermissions,
  getRolePermissions,
  getRoles,
  updateRolePermissions,
  updateRole,
  type Permission,
  type Role,
} from "../services/rolePermissionService";

import {
  canAccessPermission,
} from "../utils/permissions";

/* =========================================
   TYPES
========================================= */

type PermissionItem = Permission & {
  code?: string;
  module: string;
  action: string;
};

type RoleForm = {
  name: string;
  description: string;
};

type PermissionResultItem = {
  id?: string;
};

function extractPermissionItems(
  result: unknown,
): PermissionResultItem[] {
  if (Array.isArray(result)) {
    return result as PermissionResultItem[];
  }

  if (
    result &&
    typeof result === "object"
  ) {
    const permissions = (
      result as {
        permissions?: unknown;
      }
    ).permissions;

    if (Array.isArray(permissions)) {
      return permissions as PermissionResultItem[];
    }
  }

  return [];
}

/* =========================================
   CONSTANTS
========================================= */

const ACTION_LABELS: Record<string, string> = {
  view: "Lihat",
  create: "Tambah",
  edit: "Edit",
  delete: "Hapus",
  manage: "Kelola",
};

const ACTION_ALIASES: Record<string, string> = {
  view: "view",
  lihat: "view",

  create: "create",
  tambah: "create",

  edit: "edit",
  update: "edit",
  ubah: "edit",

  delete: "delete",
  hapus: "delete",
  remove: "delete",

  manage: "manage",
  kelola: "manage",
};

/*
 * Urutan kolom permission.
 *
 * PENTING:
 * "manage" harus ada di sini supaya
 * roles.manage bisa ditampilkan
 * pada kolom Kelola.
 */
const ACTION_ORDER = [
  "view",
  "create",
  "edit",
  "delete",
  "manage",
];

/* =========================================
   ROLE NAME
========================================= */

function formatRoleName(name: string): string {
  return name
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

/* =========================================
   NORMALIZE ROLE NAME
========================================= */

function normalizeRoleName(
  name: string | null | undefined
): string {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

/* =========================================
   CHECK SUPER ADMIN
========================================= */

function isSuperAdminRole(
  role: Role | null
): boolean {
  if (!role) {
    return false;
  }

  return (
    normalizeRoleName(role.name) ===
    "super_admin"
  );
}

/* =========================================
   MODULE LABEL
========================================= */

function getModuleLabel(
  moduleName: string
): string {
  const normalized = moduleName
    .trim()
    .toLowerCase();

  /*
   * Semua permission yang diawali
   * "recaps." tetap masuk ke module Rekapan.
   *
   * Contoh:
   * recaps.view
   * recaps.create
   * recaps.delete
   * recaps.china.view
   * recaps.indonesia.view
   * recaps.jepang.view
   * recaps.korea.view
   * recaps.thailand.view
   */
  if (
    normalized === "recaps" ||
    normalized.startsWith("recaps.")
  ) {
    return "Rekapan";
  }

  const labels: Record<string, string> = {
    dashboard: "Dashboard",

    member: "Member",
    members: "Member",

    batch: "Batch",
    batches: "Batch",

    rekap: "Rekapan",
    recaps: "Rekapan",

    pembayaran: "Pembayaran",
    payment: "Pembayaran",
    payments: "Pembayaran",

    "izin pembayaran": "Ijin Telat Bayar",
    "ijin pembayaran": "Ijin Telat Bayar",
    "ijin telat bayar": "Ijin Telat Bayar",

    late_payment_permissions:
      "Ijin Telat Bayar",

    notification_log:
      "Notification Log",

    pengiriman: "Pengiriman",
    shipping: "Pengiriman",

    role: "Role & Permission",
    roles: "Role & Permission",

    permission: "Permission",
    permissions: "Permission",
  };

  return (
    labels[normalized] ??
    formatRoleName(
      normalized.replace(/-/g, "_")
    )
  );
}

/* =========================================
   ACTION NORMALIZATION
========================================= */

function normalizeAction(
  action: string
): string {
  const normalized = action
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  return (
    ACTION_ALIASES[normalized] ??
    normalized
  );
}

/* =========================================
   PARSE PERMISSION
========================================= */

/**
 * Mendukung:
 *
 * members.view
 * members.create
 * members.edit
 * members.delete
 * roles.manage
 *
 * maupun:
 *
 * Lihat Member
 * Tambah Member
 * Edit Member
 * Hapus Member
 * Kelola Permission
 */

function parsePermissionName(
  permissionName: string
): {
  module: string;
  action: string;
} {
  const name = permissionName.trim();

  /* =====================================
     FORMAT:
     members.edit
  ===================================== */

  if (name.includes(".")) {
    const parts = name.split(".");

    const actionPart = parts.pop() ?? "";

    const modulePart =
      parts.join(".") || "Lainnya";

    return {
      module: getModuleLabel(modulePart),
      action: normalizeAction(actionPart),
    };
  }

  /* =====================================
     FORMAT:
     Edit Member
     Kelola Permission
  ===================================== */

  const words = name.split(/\s+/);

  if (words.length >= 2) {
    const actionWord = words[0] ?? "";

    const action =
      normalizeAction(actionWord);

    if (
      ACTION_ORDER.includes(action) ||
      action === "manage"
    ) {
      return {
        module: getModuleLabel(
          words.slice(1).join(" ")
        ),
        action,
      };
    }
  }

  /* =====================================
     FALLBACK
  ===================================== */

  return {
    module: getModuleLabel(name),
    action: "",
  };
}

/* =========================================
   PERMISSION DISPLAY LABEL
========================================= */

function getPermissionDisplayLabel(
  permission: PermissionItem,
  moduleName: string
): string {
  const code = String(
    permission.code ?? ""
  )
    .trim()
    .toLowerCase();

  /* =====================================
     VIEW / MENU
  ===================================== */

  if (permission.action === "view") {
    const recapCountryLabels: Record<
      string,
      string
    > = {
      china: "China",
      indonesia: "Indonesia",
      jepang: "Jepang",
      korea: "Korea",
      thailand: "Thailand",
    };

    for (const [
      countryCode,
      countryLabel,
    ] of Object.entries(
      recapCountryLabels
    )) {
      if (
        code ===
        `recaps.${countryCode}.view`
      ) {
        return `Rekapan ${countryLabel} Menu`;
      }
    }

    return `${moduleName} Menu`;
  }

  /* =====================================
     BUTTON
  ===================================== */

  if (permission.action === "manage") {
    return `${permission.name} Button`;
  }

  const actionLabel =
    ACTION_LABELS[permission.action] ??
    permission.name;

  return `${actionLabel} ${moduleName} Button`;
}

/* =========================================
   COMPONENT
========================================= */

export default function RolesPermissionPage() {
  /* =========================================
     ROLE STATE
  ========================================= */

  const [roles, setRoles] =
    useState<Role[]>([]);

  /* =========================================
     PERMISSION STATE
  ========================================= */

  const [permissions, setPermissions] =
    useState<Permission[]>([]);

  /* =========================================
     ROLE PERMISSION COUNTS
  ========================================= */

  const [
    rolePermissionCounts,
    setRolePermissionCounts,
  ] = useState<Record<string, number>>({});

  /* =========================================
     SELECTED ROLE
  ========================================= */

  const [
    selectedRoleId,
    setSelectedRoleId,
  ] = useState<string>("");

  /* =========================================
     SELECTED PERMISSIONS
  ========================================= */

  const [
    selectedPermissionIds,
    setSelectedPermissionIds,
  ] = useState<string[]>([]);

  /* =========================================
     SEARCH
  ========================================= */

  const [search, setSearch] =
    useState("");

  /* =========================================
     LOADING
  ========================================= */

  const [loading, setLoading] =
    useState(true);

  const [
    loadingPermissions,
    setLoadingPermissions,
  ] = useState(false);

  const [saving, setSaving] =
    useState(false);

  /* =========================================
     MESSAGE
  ========================================= */

  const [error, setError] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  /* =========================================
     ROLE MODAL
  ========================================= */

  const [
    showRoleModal,
    setShowRoleModal,
  ] = useState(false);

  const [
    editingRole,
    setEditingRole,
  ] = useState<Role | null>(null);

  const [roleForm, setRoleForm] =
    useState<RoleForm>({
      name: "",
      description: "",
    });

  const [
    roleModalLoading,
    setRoleModalLoading,
  ] = useState(false);

  /* =========================================
     EXPANDED MODULES
     
     DEFAULT:
     SEMUA MODULE TERTUTUP
  ========================================= */

  const [
    expandedModules,
    setExpandedModules,
  ] = useState<Record<string, boolean>>({});

  /* =========================================
     LOAD PERMISSION COUNTS
  ========================================= */

  async function loadRolePermissionCounts(
    roleList: Role[],
    totalPermissionCount: number,
  ) {
    if (roleList.length === 0) {
      setRolePermissionCounts({});
      return;
    }

    const entries =
      await Promise.all(
        roleList.map(
          async (role) => {
            /*
             * Super Admin otomatis mempunyai
             * seluruh permission.
             */
            if (
              isSuperAdminRole(role)
            ) {
              return [
                role.id,
                totalPermissionCount,
              ] as const;
            }

            try {
              const result =
                await getRolePermissions(
                  role.id,
                );

              const rolePermissions =
                extractPermissionItems(
                  result,
                );

              return [
                role.id,
                rolePermissions.length,
              ] as const;
            } catch (err) {
              console.error(
                `Gagal mengambil jumlah permission untuk role ${role.name}:`,
                err,
              );

              return [
                role.id,
                0,
              ] as const;
            }
          },
        ),
      );

    setRolePermissionCounts(
      Object.fromEntries(entries),
    );
  }

  /* =========================================
     INITIAL LOAD
  ========================================= */

  useEffect(() => {
    void loadInitialData();
  }, []);

  async function loadInitialData(
    preferredRoleId?: string
  ) {
    try {
      setLoading(true);
      setError("");

      const [
        rolesData,
        permissionsData,
      ] = await Promise.all([
        getRoles(),
        getPermissions(),
      ]);

      /*
       * Pastikan response API memang array.
       */
      const safeRoles =
        Array.isArray(rolesData)
          ? rolesData
          : [];

      const safePermissions =
        Array.isArray(permissionsData)
          ? permissionsData
          : [];

      setRoles(safeRoles);

      setPermissions(
        safePermissions
      );

      /*
       * Ambil jumlah permission untuk
       * setiap role supaya kolom Permission
       * selalu menampilkan data masing-masing
       * role, bukan hanya role yang dipilih.
       */
      await loadRolePermissionCounts(
        safeRoles,
        safePermissions.length,
      );

      /* =====================================
         SELECT ROLE
      ===================================== */

      const preferredRole =
        preferredRoleId
          ? safeRoles.find(
              (role) =>
                role.id ===
                preferredRoleId
            )
          : null;

      const nextRole =
        preferredRole ??
        safeRoles[0] ??
        null;

      setSelectedRoleId(
        nextRole?.id ?? ""
      );

      /* =====================================
         RESET EXPAND STATE
         
         Semua module kembali tertutup.
      ===================================== */

      setExpandedModules({});
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengambil data role dan permission."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================================
     LOAD ROLE PERMISSIONS
  ========================================= */

  useEffect(() => {
    if (!selectedRoleId) {
      setSelectedPermissionIds([]);

      return;
    }

    void loadSelectedRolePermissions(
      selectedRoleId
    );
  }, [selectedRoleId]);

  async function loadSelectedRolePermissions(
    roleId: string
  ) {
    try {
      setLoadingPermissions(true);

      setError("");
      setSuccessMessage("");

      const result =
        await getRolePermissions(
          roleId
        );

      const rolePermissions =
        extractPermissionItems(
          result,
        );

      const permissionIds =
        rolePermissions
          .map(
            (permission) =>
              permission.id
          )
          .filter(
            (
              id
            ): id is string =>
              Boolean(id)
          );

      setSelectedPermissionIds(
        permissionIds
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengambil permission role."
      );

      setSelectedPermissionIds([]);
    } finally {
      setLoadingPermissions(false);
    }
  }

  /* =========================================
     SELECTED ROLE
  ========================================= */

  const selectedRole =
    useMemo(
      () =>
        roles.find(
          (role) =>
            role.id ===
            selectedRoleId
        ) ?? null,
      [
        roles,
        selectedRoleId,
      ]
    );

  /* =========================================
     SUPER ADMIN
  ========================================= */

  const isSuperAdmin =
    isSuperAdminRole(
      selectedRole
    );

  /* =========================================
     NORMALIZED PERMISSIONS
  ========================================= */

  const normalizedPermissions =
    useMemo<PermissionItem[]>(
      () =>
        permissions.map(
          (permission) => {
            /*
             * Gunakan permission.code sebagai sumber utama
             * supaya permission seperti:
             *
             * recaps.china.view
             * recaps.indonesia.view
             * recaps.jepang.view
             * recaps.korea.view
             * recaps.thailand.view
             *
             * tetap dikenali sebagai module Rekapan.
             *
             * Sebelumnya parser memakai permission.name,
             * sehingga "View Rekapan China" terbaca
             * sebagai module "Rekapan China".
             */
            const permissionCode = (
              permission as Permission & {
                code?: string;
              }
            ).code;

            const parsed =
              parsePermissionName(
                permissionCode ||
                  permission.name
              );

            return {
              ...permission,
              module:
                parsed.module,
              action:
                parsed.action,
            };
          }
        ),
      [permissions]
    );

  /* =========================================
     GROUP PERMISSIONS
  ========================================= */

  const groupedPermissions =
    useMemo(() => {
      const groups: Record<
        string,
        PermissionItem[]
      > = {};

      normalizedPermissions.forEach(
        (permission) => {
          if (
            !groups[
              permission.module
            ]
          ) {
            groups[
              permission.module
            ] = [];
          }

          groups[
            permission.module
          ].push(permission);
        }
      );

      /*
       * Urutkan berdasarkan:
       *
       * Lihat
       * Tambah
       * Edit
       * Hapus
       * Kelola
       */

      Object.values(
        groups
      ).forEach(
        (modulePermissions) => {
          modulePermissions.sort(
            (a, b) => {
              const aIndex =
                ACTION_ORDER.indexOf(
                  a.action
                );

              const bIndex =
                ACTION_ORDER.indexOf(
                  b.action
                );

              return (
                (aIndex === -1
                  ? 999
                  : aIndex) -
                (bIndex === -1
                  ? 999
                  : bIndex)
              );
            }
          );
        }
      );

      return groups;
    }, [normalizedPermissions]);

  /* =========================================
     FILTER ROLES
  ========================================= */

  const filteredRoles =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      if (!keyword) {
        return roles;
      }

      return roles.filter(
        (role) =>
          [
            role.name,
            role.description ??
              "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(keyword)
      );
    }, [roles, search]);

  /* =========================================
     PERMISSION COUNT
  ========================================= */

  const permissionCount =
    selectedPermissionIds.length;

  const totalPermissions =
    permissions.length;

  const rolesWithPermission =
    roles.filter(
      (role) =>
        isSuperAdminRole(role) ||
        (rolePermissionCounts[
          role.id
        ] ?? 0) > 0,
    ).length;

  /* =========================================
     TOGGLE PERMISSION
  ========================================= */

  function togglePermission(
    permissionId: string
  ) {
    /*
     * Super Admin tidak bisa diubah.
     */
    if (
      isSuperAdmin ||
      !canAccessPermission("roles.manage")
    ) {
      return;
    }

    setSuccessMessage("");
    setError("");

    setSelectedPermissionIds(
      (current) =>
        current.includes(
          permissionId
        )
          ? current.filter(
              (id) =>
                id !==
                permissionId
            )
          : [
              ...current,
              permissionId,
            ]
    );
  }

  /* =========================================
     SAVE PERMISSION
  ========================================= */

  async function handleSavePermissions() {
    if (!selectedRole) {
      return;
    }

    /*
     * Super Admin tidak bisa disimpan.
     */
    if (
      isSuperAdmin ||
      !canAccessPermission("roles.manage")
    ) {
      return;
    }

    try {
      setSaving(true);

      setError("");
      setSuccessMessage("");

      const result =
        await updateRolePermissions(
          selectedRole.id,
          selectedPermissionIds
        );

      /*
       * Sinkronisasi ulang dari response
       * backend.
       */

      const updatedPermissions =
        extractPermissionItems(
          result,
        );

      const updatedPermissionIds =
        updatedPermissions
          .map(
            (permission) =>
              permission.id
          )
          .filter(
            (
              id
            ): id is string =>
              Boolean(id)
          );

      /*
       * Sinkronkan state dengan response
       * backend. Jika response tidak membawa
       * daftar permission, gunakan state yang
       * baru saja berhasil disimpan.
       */
      setSelectedPermissionIds(
        updatedPermissions.length > 0 ||
          selectedPermissionIds.length ===
            0
          ? updatedPermissionIds
          : selectedPermissionIds,
      );

      setRolePermissionCounts(
        (current) => ({
          ...current,
          [selectedRole.id]:
            updatedPermissions.length > 0 ||
            selectedPermissionIds.length ===
              0
              ? updatedPermissions.length
              : selectedPermissionIds.length,
        }),
      );

      setSuccessMessage(
        `Permission untuk ${formatRoleName(
          selectedRole.name
        )} berhasil diperbarui.`
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Gagal menyimpan permission."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =========================================
     CREATE ROLE MODAL
  ========================================= */

  function openCreateRoleModal() {
    setEditingRole(null);

    setRoleForm({
      name: "",
      description: "",
    });

    setShowRoleModal(true);
  }

  /* =========================================
     EDIT ROLE MODAL
  ========================================= */

  function openEditRoleModal(
    role: Role
  ) {
    setEditingRole(role);

    setRoleForm({
      name: role.name,
      description:
        role.description ??
        "",
    });

    setShowRoleModal(true);
  }

  /* =========================================
     CLOSE ROLE MODAL
  ========================================= */

  function closeRoleModal() {
    if (roleModalLoading) {
      return;
    }

    setShowRoleModal(false);
    setEditingRole(null);
  }

  /* =========================================
     ROLE SUBMIT
  ========================================= */

  async function handleRoleSubmit() {
    const name =
      roleForm.name.trim();

    const description =
      roleForm.description.trim();

    if (!name) {
      setError(
        "Nama role wajib diisi."
      );

      return;
    }

    try {
      setRoleModalLoading(true);

      setError("");
      setSuccessMessage("");

      if (editingRole) {
        await updateRole(
          editingRole.id,
          {
            name,
            description,
          }
        );

        setSuccessMessage(
          "Role berhasil diperbarui."
        );

        await loadInitialData(
          editingRole.id
        );
      } else {
        const newRole =
          await createRole({
            name,
            description,
          });

        setSuccessMessage(
          "Role berhasil dibuat."
        );

        await loadInitialData(
          newRole?.id
        );
      }

      setShowRoleModal(false);
      setEditingRole(null);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Gagal menyimpan role."
      );
    } finally {
      setRoleModalLoading(false);
    }
  }

  /* =========================================
     DELETE ROLE
  ========================================= */

  async function handleDeleteRole(
    role: Role
  ) {
    if (
      isSuperAdminRole(role)
    ) {
      setError(
        "Super Admin tidak dapat dihapus."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Yakin ingin menghapus role "${formatRoleName(
          role.name
        )}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccessMessage("");

      await deleteRole(
        role.id
      );

      const remainingRoles =
        roles.filter(
          (item) =>
            item.id !== role.id
        );

      setRoles(
        remainingRoles
      );

      setRolePermissionCounts(
        (current) => {
          const next = {
            ...current,
          };

          delete next[role.id];

          return next;
        },
      );

      if (
        selectedRoleId ===
        role.id
      ) {
        setSelectedRoleId(
          remainingRoles[0]
            ?.id ?? ""
        );
      }

      setSuccessMessage(
        "Role berhasil dihapus."
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Gagal menghapus role."
      );
    }
  }

  /* =========================================
     TOGGLE MODULE
     
     DEFAULT CLOSED
  ========================================= */

  function toggleModule(
    moduleName: string
  ) {
    setExpandedModules(
      (current) => ({
        ...current,

        /*
         * undefined -> true
         * false -> true
         * true -> false
         */
        [moduleName]:
          current[moduleName] !==
          true,
      })
    );
  }

  /* =========================================
     RENDER LOADING
  ========================================= */

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-sm text-slate-500">
          Memuat Role & Permission...
        </div>
      </div>
    );
  }

  /* =========================================
     RENDER
  ========================================= */

  return (
    <div className="min-h-screen bg-[#f8faff] text-left">
      <div className="w-full space-y-6 px-6 py-8 lg:px-8">

      {/* =====================================
          HEADER
      ===================================== */}

      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">

        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Role & Permission
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Kelola role pengguna dan
            atur permission untuk
            setiap role.
          </p>
        </div>

        {canAccessPermission("roles.create") && (
          <button
            type="button"
            onClick={
              openCreateRoleModal
            }
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus size={18} />

            Tambah Role
          </button>
        )}
      </div>

      {/* =====================================
          ALERT ERROR
      ===================================== */}

      {error && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
            className="rounded-md p-1 hover:bg-red-100"
          >
            <X size={16} />
          </button>

        </div>
      )}

      {/* =====================================
          ALERT SUCCESS
      ===================================== */}

      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {/* =====================================
          SUMMARY
      ===================================== */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

        <SummaryCard
          icon={<Users size={20} />}
          title="Total Role"
          value={roles.length}
          subtitle="role dalam sistem"
        />

        <SummaryCard
          icon={<KeyRound size={20} />}
          title="Total Permission"
          value={permissions.length}
          subtitle="permission tersedia"
        />

        <SummaryCard
          icon={<Shield size={20} />}
          title="Role dengan Permission"
          value={
            rolesWithPermission
          }
          subtitle="role sudah diatur"
        />

        <SummaryCard
          icon={
            <ShieldCheck size={20} />
          }
          title="Role Aktif"
          value={roles.length}
          subtitle="role aktif"
        />

      </div>

      {/* =====================================
          MAIN
      ===================================== */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_1fr]">

        {/* ===================================
            ROLE LIST
        =================================== */}

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 p-5">

            <h2 className="font-semibold text-slate-900">
              Daftar Role
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Kelola data role pengguna
              sistem.
            </p>

            <div className="relative mt-4">

              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Cari role..."
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>
          </div>

          {/* ===================================
              MOBILE ROLE CARDS
          =================================== */}

          <div className="space-y-3 p-4 md:hidden">

            {filteredRoles.map(
              (
                role,
                index,
              ) => {
                const isSelected =
                  selectedRoleId ===
                  role.id;

                const isProtected =
                  isSuperAdminRole(
                    role,
                  );

                return (
                  <article
                    key={role.id}
                    onClick={() =>
                      setSelectedRoleId(
                        role.id,
                      )
                    }
                    className={[
                      "cursor-pointer rounded-xl border p-4 transition",
                      isSelected
                        ? "border-blue-200 bg-blue-50"
                        : "border-slate-200 bg-white hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-400">
                            #{index + 1}
                          </span>

                          <h3 className="break-words text-base font-semibold text-slate-900">
                            {formatRoleName(
                              role.name,
                            )}
                          </h3>
                        </div>

                        {isProtected && (
                          <span className="mt-2 inline-flex rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-600">
                            Protected
                          </span>
                        )}
                      </div>

                      <span className="inline-flex shrink-0 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-600">
                        Aktif
                      </span>

                    </div>

                    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">

                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Deskripsi
                        </p>

                        <p className="mt-1 text-sm leading-5 text-slate-600">
                          {role.description ||
                            "-"}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-4">

                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            Permission
                          </p>

                          <div className="mt-1">
                            {isProtected ? (
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                Semua
                              </span>
                            ) : (
                              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">
                                {rolePermissionCounts[
                                  role.id
                                ] ?? 0}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">

                          <button
                            type="button"
                            title="Pilih role"
                            onClick={(
                              event,
                            ) => {
                              event.stopPropagation();

                              setSelectedRoleId(
                                role.id,
                              );
                            }}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-blue-600"
                          >
                            <Eye size={16} />
                          </button>

                          {!isProtected && (
                            <>
                              {canAccessPermission(
                                "roles.edit",
                              ) && (
                                <button
                                  type="button"
                                  title="Edit role"
                                  onClick={(
                                    event,
                                  ) => {
                                    event.stopPropagation();

                                    openEditRoleModal(
                                      role,
                                    );
                                  }}
                                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-blue-600"
                                >
                                  <Edit size={16} />
                                </button>
                              )}

                              {canAccessPermission(
                                "roles.delete",
                              ) && (
                                <button
                                  type="button"
                                  title="Hapus role"
                                  onClick={(
                                    event,
                                  ) => {
                                    event.stopPropagation();

                                    void handleDeleteRole(
                                      role,
                                    );
                                  }}
                                  className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2
                                    size={16}
                                  />
                                </button>
                              )}
                            </>
                          )}

                        </div>

                      </div>

                    </div>
                  </article>
                );
              },
            )}

            {filteredRoles.length ===
              0 && (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
                Tidak ada role ditemukan.
              </div>
            )}

          </div>

          {/* ===================================
              DESKTOP ROLE TABLE
          =================================== */}

          <div className="hidden overflow-x-auto md:block">

            <table className="w-full min-w-[700px] text-sm">

              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">

                  <th className="px-4 py-3 font-semibold text-slate-600">
                    No
                  </th>

                  <th className="px-4 py-3 font-semibold text-slate-600">
                    Nama Role
                  </th>

                  <th className="px-4 py-3 font-semibold text-slate-600">
                    Deskripsi
                  </th>

                  <th className="px-4 py-3 font-semibold text-slate-600">
                    Permission
                  </th>

                  <th className="px-4 py-3 font-semibold text-slate-600">
                    Status
                  </th>

                  <th className="px-4 py-3 text-right font-semibold text-slate-600">
                    Aksi
                  </th>

                </tr>
              </thead>

              <tbody>

                {filteredRoles.map(
                  (
                    role,
                    index
                  ) => {
                    const isSelected =
                      selectedRoleId ===
                      role.id;

                    const isProtected =
                      isSuperAdminRole(
                        role
                      );

                    return (
                      <tr
                        key={role.id}
                        onClick={() =>
                          setSelectedRoleId(
                            role.id
                          )
                        }
                        className={`cursor-pointer border-b border-slate-100 transition ${
                          isSelected
                            ? "bg-blue-50"
                            : "hover:bg-slate-50"
                        }`}
                      >

                        <td className="px-4 py-4 text-slate-500">
                          {index + 1}
                        </td>

                        <td className="px-4 py-4">

                          <div className="font-semibold text-slate-900">
                            {formatRoleName(
                              role.name
                            )}
                          </div>

                          {isProtected && (
                            <span className="mt-1 inline-flex rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-600">
                              Protected
                            </span>
                          )}

                        </td>

                        <td className="max-w-[200px] px-4 py-4 text-slate-500">
                          {role.description ??
                            "-"}
                        </td>

                        <td className="px-4 py-4">

                          {isProtected ? (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                              Semua
                            </span>
                          ) : (
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">
                              {
                                rolePermissionCounts[
                                  role.id
                                ] ?? 0
                              }
                            </span>
                          )}

                        </td>

                        <td className="px-4 py-4">

                          <span className="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-600">
                            Aktif
                          </span>

                        </td>

                        <td className="px-4 py-4">

                          <div className="flex justify-end gap-1">

                            <button
                              type="button"
                              title="Pilih role"
                              onClick={(
                                event
                              ) => {
                                event.stopPropagation();

                                setSelectedRoleId(
                                  role.id
                                );
                              }}
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-blue-600"
                            >
                              <Eye size={16} />
                            </button>

                            {!isProtected && (
                              <>
                                {canAccessPermission("roles.edit") && (
                                  <button
                                    type="button"
                                    title="Edit role"
                                    onClick={(
                                      event
                                    ) => {
                                      event.stopPropagation();

                                      openEditRoleModal(
                                        role
                                      );
                                    }}
                                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-blue-600"
                                  >
                                    <Edit size={16} />
                                  </button>
                                )}

                                {canAccessPermission("roles.delete") && (
                                  <button
                                    type="button"
                                    title="Hapus role"
                                    onClick={(
                                      event
                                    ) => {
                                      event.stopPropagation();

                                      void handleDeleteRole(
                                        role
                                      );
                                    }}
                                    className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                                  >
                                    <Trash2
                                      size={16}
                                    />
                                  </button>
                                )}
                              </>
                            )}

                          </div>

                        </td>

                      </tr>
                    );
                  }
                )}

                {filteredRoles.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      Tidak ada role
                      ditemukan.
                    </td>
                  </tr>
                )}

              </tbody>

            </table>

          </div>

        </div>

        {/* ===================================
            PERMISSION PANEL
        =================================== */}

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 p-5">

            <h2 className="font-semibold text-slate-900">
              Atur Permission
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Pilih role untuk mengatur
              permission.
            </p>

            <div className="mt-4">

              <label className="mb-2 block text-sm font-medium text-slate-700">
                Pilih Role
              </label>

              <select
                value={selectedRoleId}
                onChange={(event) =>
                  setSelectedRoleId(
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >

                {roles.map(
                  (role) => (
                    <option
                      key={role.id}
                      value={role.id}
                    >
                      {formatRoleName(
                        role.name
                      )}
                    </option>
                  )
                )}

              </select>

            </div>

          </div>

          <div className="p-5">

            {isSuperAdmin ? (
              <div className="mb-5 rounded-lg border border-purple-100 bg-purple-50 px-4 py-3 text-sm text-purple-700">

                <div className="font-semibold">
                  Super Admin
                </div>

                <div className="mt-1">
                  Super Admin memiliki
                  akses penuh ke seluruh
                  permission dan tidak
                  dapat diubah dari
                  halaman ini.
                </div>

              </div>
            ) : (
              <div className="mb-5 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                Centang permission yang
                ingin diberikan ke role
                ini.
              </div>
            )}

            {loadingPermissions ? (
              <div className="py-10 text-center text-sm text-slate-500">
                Memuat permission...
              </div>
            ) : (
              <>
                {/* ===================================
                    MOBILE PERMISSION CARDS
                =================================== */}

                <div className="space-y-3 md:hidden">

                {Object.entries(
                  groupedPermissions,
                ).map(
                  ([
                    moduleName,
                    modulePermissions,
                  ]) => {
                    const isExpanded =
                      expandedModules[
                        moduleName
                      ] === true;

                    return (
                      <div
                        key={moduleName}
                        className="overflow-hidden rounded-xl border border-slate-200"
                      >

                        <button
                          type="button"
                          onClick={() =>
                            toggleModule(
                              moduleName,
                            )
                          }
                          className="flex w-full items-center justify-between gap-3 bg-slate-50 px-4 py-3 text-left"
                        >
                          <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-700">
                            {isExpanded ? (
                              <ChevronDown
                                size={16}
                                className="shrink-0"
                              />
                            ) : (
                              <ChevronRight
                                size={16}
                                className="shrink-0"
                              />
                            )}

                            <span className="break-words">
                              {moduleName}
                            </span>
                          </span>

                          <span className="shrink-0 text-xs text-slate-400">
                            {modulePermissions.length}
                          </span>
                        </button>

                        {isExpanded && (
                          <div className="divide-y divide-slate-100 bg-white">
                            {modulePermissions.map(
                              (
                                permission,
                              ) => {
                                const checked =
                                  isSuperAdmin ||
                                  selectedPermissionIds.includes(
                                    permission.id,
                                  );

                                const actionLabel =
                                  ACTION_LABELS[
                                    permission.action
                                  ] ??
                                  permission.action;

                                return (
                                  <label
                                    key={
                                      permission.id
                                    }
                                    className={[
                                      "flex items-start gap-3 px-4 py-3",
                                      isSuperAdmin ||
                                      !canAccessPermission("roles.manage")
                                        ? "cursor-not-allowed"
                                        : "cursor-pointer",
                                    ].join(" ")}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={
                                        checked
                                      }
                                      disabled={
                                        isSuperAdmin ||
                                        !canAccessPermission("roles.manage")
                                      }
                                      onChange={() =>
                                        togglePermission(
                                          permission.id,
                                        )
                                      }
                                      className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-blue-600 disabled:cursor-not-allowed"
                                    />

                                    <div className="min-w-0 flex-1">
                                      <p className="break-words text-sm text-slate-700">
                                        {getPermissionDisplayLabel(
                                          permission,
                                          moduleName,
                                        )}
                                      </p>

                                      <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                        {actionLabel}
                                      </span>
                                    </div>
                                  </label>
                                );
                              },
                            )}
                          </div>
                        )}

                      </div>
                    );
                  },
                )}

                {Object.keys(
                  groupedPermissions,
                ).length === 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
                    Tidak ada permission tersedia.
                  </div>
                )}

              </div>

              {/* ===================================
                  DESKTOP PERMISSION TABLE
              =================================== */}

              <div className="hidden overflow-x-auto md:block">

                <table className="w-full min-w-[650px] text-sm">

                  <thead>

                    <tr className="border-b border-slate-200">

                      <th className="px-3 py-3 text-left font-semibold text-slate-600">
                        Modul / Permission
                      </th>

                      <th className="w-20 px-2 py-3 text-center font-semibold text-slate-600">
                        Lihat
                      </th>

                      <th className="w-20 px-2 py-3 text-center font-semibold text-slate-600">
                        Tambah
                      </th>

                      <th className="w-20 px-2 py-3 text-center font-semibold text-slate-600">
                        Edit
                      </th>

                      <th className="w-20 px-2 py-3 text-center font-semibold text-slate-600">
                        Hapus
                      </th>

                      <th className="w-20 px-2 py-3 text-center font-semibold text-slate-600">
                        Kelola
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {Object.entries(
                      groupedPermissions
                    ).map(
                      ([
                        moduleName,
                        modulePermissions,
                      ]) => {

                        /*
                         * DEFAULT:
                         * false / undefined
                         *
                         * Module hanya terbuka
                         * ketika diklik.
                         */

                        const isExpanded =
                          expandedModules[
                            moduleName
                          ] === true;

                        return (
                          <PermissionModule
                            key={
                              moduleName
                            }
                            moduleName={
                              moduleName
                            }
                            permissions={
                              modulePermissions
                            }
                            expanded={
                              isExpanded
                            }
                            onToggle={() =>
                              toggleModule(
                                moduleName
                              )
                            }
                            selectedPermissionIds={
                              selectedPermissionIds
                            }
                            onTogglePermission={
                              togglePermission
                            }
                            disabled={
                              isSuperAdmin ||
                              !canAccessPermission(
                                "roles.manage"
                              )
                            }
                            isSuperAdmin={
                              isSuperAdmin
                            }
                          />
                        );
                      }
                    )}

                    {Object.keys(
                      groupedPermissions
                    ).length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-10 text-center text-sm text-slate-500"
                        >
                          Tidak ada permission
                          tersedia.
                        </td>
                      </tr>
                    )}

                  </tbody>

                </table>

              </div>

              </>
            )}

            {/* =================================
                SAVE
            ================================= */}

            {!isSuperAdmin && (
                <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-5">

                  <div className="text-sm text-slate-500">

                    <span className="font-semibold text-slate-800">
                      {
                        permissionCount
                      }
                    </span>{" "}

                    dari{" "}

                    <span className="font-semibold text-slate-800">
                      {
                        totalPermissions
                      }
                    </span>{" "}

                    permission dipilih

                  </div>

                  <button
                    type="button"
                    disabled={
                      saving ||
                      !selectedRole ||
                      !canAccessPermission(
                        "roles.manage"
                      )
                    }
                    onClick={
                      handleSavePermissions
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >

                    {saving ? (
                      "Menyimpan..."
                    ) : (
                      <>
                        <Check
                          size={17}
                        />

                        Simpan Permission
                      </>
                    )}

                  </button>

                </div>
              )}

          </div>

        </div>

      </div>

      {/* =====================================
          DETAIL ROLE
      ===================================== */}

      {selectedRole && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="mb-5">

            <h2 className="font-semibold text-slate-900">
              Detail Role
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Informasi detail role yang
              dipilih.
            </p>

          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">

            <DetailItem
              label="Nama Role"
              value={formatRoleName(
                selectedRole.name
              )}
            />

            <DetailItem
              label="Deskripsi"
              value={
                selectedRole.description ??
                "-"
              }
            />

            <DetailItem
              label="Jumlah Permission"
              value={
                isSuperAdmin
                  ? `Semua dari ${totalPermissions}`
                  : `${permissionCount} dari ${totalPermissions} permission`
              }
            />

            <DetailItem
              label="Status"
              value="Aktif"
              badge
            />

          </div>

        </div>
      )}

      {/* =====================================
          ROLE MODAL
      ===================================== */}

      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">

            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">

              <div>

                <h3 className="font-semibold text-slate-900">
                  {editingRole
                    ? "Edit Role"
                    : "Tambah Role"}
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Kelola informasi role
                  pengguna.
                </p>

              </div>

              <button
                type="button"
                onClick={
                  closeRoleModal
                }
                disabled={
                  roleModalLoading
                }
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X size={18} />
              </button>

            </div>

            {/* FORM */}

            <div className="space-y-4 p-5">

              <div>

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Nama Role
                </label>

                <input
                  value={
                    roleForm.name
                  }
                  onChange={(event) =>
                    setRoleForm(
                      (current) => ({
                        ...current,
                        name: event
                          .target
                          .value,
                      })
                    )
                  }
                  placeholder="Contoh: Admin"
                  disabled={
                    editingRole
                      ? normalizeRoleName(
                          editingRole.name
                        ) ===
                        "super_admin"
                      : false
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Deskripsi
                </label>

                <textarea
                  value={
                    roleForm.description
                  }
                  onChange={(event) =>
                    setRoleForm(
                      (current) => ({
                        ...current,
                        description:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  rows={3}
                  placeholder="Deskripsi role..."
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

              </div>

            </div>

            {/* FOOTER */}

            <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">

              <button
                type="button"
                onClick={
                  closeRoleModal
                }
                disabled={
                  roleModalLoading
                }
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={
                  handleRoleSubmit
                }
                disabled={
                  roleModalLoading
                }
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {roleModalLoading
                  ? "Menyimpan..."
                  : "Simpan"}
              </button>

            </div>

          </div>

        </div>
      )}

      </div>
    </div>
  );
}

/* =========================================
   PERMISSION MODULE
========================================= */

function PermissionModule({
  moduleName,
  permissions,
  expanded,
  onToggle,
  selectedPermissionIds,
  onTogglePermission,
  disabled,
  isSuperAdmin,
}: {
  moduleName: string;
  permissions: PermissionItem[];
  expanded: boolean;
  onToggle: () => void;
  selectedPermissionIds: string[];
  onTogglePermission: (
    permissionId: string
  ) => void;
  disabled: boolean;
  isSuperAdmin: boolean;
}) {
  return (
    <>
      {/* =====================================
          MODULE HEADER
      ===================================== */}

      <tr className="border-b border-slate-100 bg-slate-50">

        <td
          colSpan={6}
          className="px-3 py-2.5"
        >

          <button
            type="button"
            onClick={onToggle}
            className="flex items-center gap-2 text-sm font-semibold text-slate-700"
          >

            {expanded ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}

            {moduleName}

          </button>

        </td>

      </tr>

      {/* =====================================
          PERMISSION ROWS
      ===================================== */}

      {expanded &&
        permissions.map(
          (permission) => {

            /*
             * Super Admin:
             * semua checkbox terlihat
             * checked dan disabled.
             */

            const checked =
              isSuperAdmin ||
              selectedPermissionIds.includes(
                permission.id
              );

            return (
              <tr
                key={permission.id}
                className="border-b border-slate-100"
              >

                {/* PERMISSION NAME */}

                <td className="px-3 py-3">

                  <div className="pl-6">

                    <div className="text-sm text-slate-700">
                      {getPermissionDisplayLabel(
                        permission,
                        moduleName
                      )}
                    </div>

                  </div>

                </td>

                {/* ACTION COLUMNS */}

                {ACTION_ORDER.map(
                  (action) => {

                    const isThisAction =
                      permission.action ===
                      action;

                    return (
                      <td
                        key={action}
                        className="px-2 py-3 text-center"
                      >

                        {isThisAction ? (
                          <input
                            type="checkbox"
                            checked={
                              checked
                            }
                            disabled={
                              disabled
                            }
                            onChange={() =>
                              onTogglePermission(
                                permission.id
                              )
                            }
                            className="h-4 w-4 cursor-pointer accent-blue-600 disabled:cursor-not-allowed"
                          />
                        ) : (
                          <span className="text-slate-300">
                            -
                          </span>
                        )}

                      </td>
                    );
                  }
                )}

              </tr>
            );
          }
        )}
    </>
  );
}

/* =========================================
   SUMMARY CARD
========================================= */

function SummaryCard({
  icon,
  title,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  value: number | string;
  subtitle: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-start justify-between">

        <div>

          <p className="text-sm text-slate-500">
            {title}
          </p>

          <div className="mt-2 text-2xl font-bold text-slate-900">
            {value}
          </div>

          <p className="mt-1 text-xs text-slate-400">
            {subtitle}
          </p>

        </div>

        <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600">
          {icon}
        </div>

      </div>

    </div>
  );
}

/* =========================================
   DETAIL ITEM
========================================= */

function DetailItem({
  label,
  value,
  badge = false,
}: {
  label: string;
  value: string;
  badge?: boolean;
}) {
  return (
    <div>

      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>

      {badge ? (
        <div className="mt-2">

          <span className="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-600">
            {value}
          </span>

        </div>
      ) : (
        <div className="mt-2 text-sm font-medium text-slate-800">
          {value}
        </div>
      )}

    </div>
  );
}