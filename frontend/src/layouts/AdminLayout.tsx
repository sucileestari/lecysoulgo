import {
  useMemo,
  useState,
} from "react";

import {
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";

import {
  Banknote,
  Bell,
  ChevronDown,
  ChevronRight,
  FileText,
  HeartPlus,
  ReceiptText,
  Users,
  Clock3,
  Package,
  ClipboardList,
  ShieldCheck,
  ChartNoAxesCombined,
  WalletCards,
  ShoppingBag,
} from "lucide-react";

import {
  CN,
  ID,
  JP,
  KR,
  TH,
} from "country-flag-icons/react/3x2";

import {
  hasPermission,
} from "../utils/permissions";

/* =========================================
   USER TYPES
========================================= */

type CurrentUser = {
  name: string;
  role: string;
  avatar?: string;
};

type CustomerMember = {
  id: string;
  name: string;
  phone: string;
};

/* =========================================
   MENU TYPES
========================================= */

type SubMenuItem = {
  label: string;
  path: string;

  flag: React.ComponentType<{
    title?: string;
    className?: string;
  }>;
};

type MenuItem = {
  label: string;
  path?: string;
  icon: typeof FileText;

  /*
   * Permission yang dibutuhkan
   * untuk menampilkan menu.
   */
  permission?: string;
  group?: string;

  children?: SubMenuItem[];
};

/* =========================================
   ADMIN MENU
========================================= */

const adminMenuItems: MenuItem[] = [
  {
    group: "General",
    label: "Peraturan GO",
    path: "/rules-go",
    icon: FileText,

    /*
     * Semua admin yang memiliki
     * dashboard.view dapat melihat
     * Peraturan GO.
     */
    permission: "dashboard.view",
  },

  {
    group: "General",
    label: "Anggota / Member",
    path: "/members",
    icon: Users,

    permission: "members.view",
  },

  {
    group: "General",
    label: "Notification Log",
    path: "/notification-log",
    icon: Bell,
  },

  {
    group: "Rekapan",
    label: "Rekapan",
    icon: ReceiptText,

    permission: "recaps.view",

    children: [
      {
        label: "China",
        path: "/rekapan/china",
        flag: CN,
      },

      {
        label: "Indonesia",
        path: "/rekapan/indonesia",
        flag: ID,
      },

      {
        label: "Jepang",
        path: "/rekapan/jepang",
        flag: JP,
      },

      {
        label: "Korea",
        path: "/rekapan/korea",
        flag: KR,
      },

      {
        label: "Thailand",
        path: "/rekapan/thailand",
        flag: TH,
      },
    ],
  },

  {
    group: "Rekapan",
    label: "Ijin Telat Bayar",
    path: "/ijin-telat-bayar",
    icon: Clock3,

    permission:
      "late_payment_permissions.view",
  },

  {
    group: "Pengiriman",
    label: "Pengiriman Manual",
    path: "/pengiriman-manual",
    icon: Package,

    permission: "shipping.view",
  },

  {
    group: "Pengiriman",
    label: "Pesanan Marketplace",
    path: "/pesanan-marketplace",
    icon: ShoppingBag,
  },

  {
    group: "Keuangan",
    label: "Modal dan Keuntungan",
    path: "/modal-dan-keuntungan",
    icon: ChartNoAxesCombined,
  },

  {
    group: "Keuangan",
    label: "Keuangan / Arus Dana",
    path: "/arus-dana",
    icon: WalletCards,
  },

  {
    group: "Keuangan",
    label: "Gaji Karyawan",
    path: "/gaji-karyawan",
    icon: Banknote,
  },

  /* =========================================
     ROLE & PERMISSION
  ========================================= */

  {
    group: "Permission",
    label: "Role & Permission",
    path: "/roles-permissions",
    icon: ShieldCheck,

    permission: "roles.view",
  },
];

/* =========================================
   CUSTOMER MENU
========================================= */

const customerMenuItems: MenuItem[] = [
  {
    group: "General",
    label: "Rules GO",
    path: "/rules-go",
    icon: FileText,
  },

  {
    group: "Rekapan",
    label: "Rekapan Saya",
    path: "/customer/rekapan",
    icon: ClipboardList,
  },

  {
    group: "Rekapan",
    label: "Ijin Telat Bayar",
    path: "/customer/ijin-telat-bayar",
    icon: Clock3,
  },

  {
    group: "Pengiriman",
    label: "Pengiriman Manual",
    path: "/customer/pengiriman-manual",
    icon: Package,
  },

  {
    group: "Pengiriman",
    label: "Pesanan Marketplace",
    path: "/customer/pesanan-marketplace",
    icon: ShoppingBag,
  },
];

const customerRulesOnlyMenuItems: MenuItem[] = [
  customerMenuItems[0],
];

/* =========================================
   DEFAULT ADMIN USER
========================================= */

const defaultUser: CurrentUser = {
  name: "Admin",
  role: "Administrator",
};

/* =========================================
   CUSTOMER MEMBER HELPER
========================================= */

function getCustomerMember(): CustomerMember | null {
  try {
    const storedMember =
      localStorage.getItem(
        "customer_member",
      );

    if (!storedMember) {
      return null;
    }

    const member =
      JSON.parse(storedMember);

    if (
      !member ||
      typeof member !== "object"
    ) {
      return null;
    }

    return member as CustomerMember;
  } catch {
    return null;
  }
}

/* =========================================
   FILTER ADMIN MENU BY PERMISSION
========================================= */

function getVisibleAdminMenuItems(): MenuItem[] {
  return adminMenuItems.filter(
    (item) => {
      /*
       * Kalau menu tidak mempunyai
       * permission, tampilkan.
       */
      if (!item.permission) {
        return true;
      }

      /*
       * Cek permission user.
       *
       * Untuk Super Admin:
       * hasPermission() akan mengembalikan
       * true karena memiliki wildcard "*".
       */
      return hasPermission(
        item.permission,
      );
    },
  );
}

/* =========================================
   LAYOUT
========================================= */

export default function AdminLayout({
  user = defaultUser,
}: {
  user?: CurrentUser;
}) {
  const navigate =
    useNavigate();

  /* =======================================
     REKAPAN SUBMENU STATE
  ======================================== */

  const [
    isRekapOpen,
    setIsRekapOpen,
  ] = useState(true);

  /* =======================================
     DETECT SESSION
  ======================================== */

  const isCustomerRulesOnly =
    localStorage.getItem(
      "customer_rules_only",
    ) === "true";

  const isCustomer =
    Boolean(
      localStorage.getItem(
        "customer_token",
      ),
    ) || isCustomerRulesOnly;

  /* =======================================
     CUSTOMER DATA
  ======================================= */

  const customerMember =
    useMemo(
      () =>
        isCustomer
          ? getCustomerMember()
          : null,
      [isCustomer],
    );

  /* =======================================
     CURRENT USER
  ======================================= */

  const currentUser =
    isCustomer
      ? {
          name:
            customerMember?.name ||
            "Customer",

          role: "Customer",
        }
      : user;

  /* =======================================
     MENU
  ======================================= */

  const menuItems =
    isCustomerRulesOnly
      ? customerRulesOnlyMenuItems
      : isCustomer
        ? customerMenuItems
        : getVisibleAdminMenuItems();

  /* =======================================
     AVATAR
  ======================================= */

  const avatarInitial =
    currentUser.name
      .charAt(0)
      .toUpperCase();

  /* =======================================
     LOGOUT
  ======================================= */

  function handleLogout() {
    /*
     * CUSTOMER LOGOUT
     */
    if (isCustomer) {
      localStorage.removeItem(
        "customer_token",
      );

      localStorage.removeItem(
        "customer_member",
      );

      localStorage.removeItem(
        "customer_rules_only",
      );
    }

    /*
     * ADMIN LOGOUT
     */
    else {
      localStorage.removeItem(
        "auth_token",
      );

      localStorage.removeItem(
        "auth_user",
      );
    }

    navigate(
      "/login",
      {
        replace: true,
      },
    );
  }

  /* =======================================
     RENDER
  ======================================== */

  return (
    <div className="min-h-screen bg-[#f8faff] text-left">
      <div className="flex min-h-screen">

        {/* =================================
            SIDEBAR
        ================================== */}

        <aside className="fixed inset-y-0 left-0 z-40 flex w-[190px] flex-col border-r border-[#e5eaf4] bg-white">

          {/* =================================
              LOGO
          ================================== */}

          <div className="flex flex-col items-center px-5 pt-10">

            <div className="relative flex h-12 w-12 items-center justify-center">

              <HeartPlus
                className="h-10 w-10 stroke-[1.7] text-[#142968]"
              />

              <span className="absolute right-0 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white">

                <span className="text-xs font-bold leading-none text-[#f05a70]">
                  +
                </span>

              </span>

            </div>

            <h1 className="mt-3 text-[17px] font-bold tracking-tight text-[#142968]">
              Lecy Soulgo
            </h1>

          </div>

          {/* =================================
              NAVIGATION
          ================================== */}

          <nav className="mt-8 min-h-0 flex-1 overflow-y-auto px-4 pb-4">

            <div className="space-y-1">

              {(() => {
                const groups = menuItems.reduce<
                  Array<{
                    label: string;
                    items: MenuItem[];
                  }>
                >((result, item) => {
                  const groupLabel =
                    item.group ?? "General";

                  let group = result.find(
                    (current) =>
                      current.label ===
                      groupLabel,
                  );

                  if (!group) {
                    group = {
                      label: groupLabel,
                      items: [],
                    };

                    result.push(group);
                  }

                  group.items.push(item);
                  return result;
                }, []);

                return groups.map(
                  (group) => (
                    <div
                      key={group.label}
                      className="mb-5 last:mb-0"
                    >
                      <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a96b4]">
                        {group.label}
                      </p>

                      <div className="space-y-1">
                        {group.items.map(
                          (item) => {
                            const Icon =
                              item.icon;

                            /* =================================
                               MENU DENGAN SUBMENU
                            ================================== */

                            if (
                              item.children
                            ) {
                              return (
                                <div
                                  key={
                                    item.label
                                  }
                                >

                                  {/* PARENT MENU */}

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setIsRekapOpen(
                                        (
                                          current,
                                        ) =>
                                          !current,
                                      )
                                    }
                                    className="flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-[#1f356c] transition-all hover:bg-[#f5f7fc]"
                                  >

                                    <Icon className="h-5 w-5 shrink-0 text-[#20366f]" />

                                    <span className="flex-1">
                                      {
                                        item.label
                                      }
                                    </span>

                                    {isRekapOpen ? (
                                      <ChevronDown className="h-4 w-4 shrink-0" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 shrink-0" />
                                    )}

                                  </button>

                                  {/* SUBMENU */}

                                  {isRekapOpen && (
                                    <div className="mt-1 space-y-1 pl-3">

                                      {item.children.map(
                                        (
                                          subItem,
                                        ) => {
                                          const Flag =
                                            subItem.flag;

                                          return (
                                            <NavLink
                                              key={
                                                subItem.path
                                              }
                                              to={
                                                subItem.path
                                              }
                                              className={( {
                                                isActive,
                                              }) =>
                                                [
                                                  "flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-all",

                                                  isActive
                                                    ? "bg-[#edf3ff] font-medium text-[#1457ff]"
                                                    : "text-[#50628e] hover:bg-[#f5f7fc] hover:text-[#20366f]",
                                                ].join(
                                                  " ",
                                                )
                                              }
                                            >

                                              <Flag
                                                title={
                                                  subItem.label
                                                }
                                                className="h-4 w-5 rounded-sm"
                                              />

                                              <span>
                                                {
                                                  subItem.label
                                                }
                                              </span>

                                            </NavLink>
                                          );
                                        },
                                      )}

                                    </div>
                                  )}

                                </div>
                              );
                            }

                            /* =================================
                               NORMAL MENU
                            ================================== */

                            return (
                              <NavLink
                                key={
                                  item.path
                                }
                                to={
                                  item.path ??
                                  "#"
                                }
                                className={( {
                                  isActive,
                                }) =>
                                  [
                                    "flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition-all",

                                    isActive
                                      ? "bg-[#edf3ff] text-[#1457ff]"
                                      : "text-[#1f356c] hover:bg-[#f5f7fc]",
                                  ].join(
                                    " ",
                                  )
                                }
                              >

                                {({
                                  isActive,
                                }) => (
                                  <>
                                    <Icon
                                      className={[
                                        "h-5 w-5 shrink-0",

                                        isActive
                                          ? "text-[#1457ff]"
                                          : "text-[#20366f]",
                                      ].join(
                                        " ",
                                      )}
                                    />

                                    <span>
                                      {
                                        item.label
                                      }
                                    </span>
                                  </>
                                )}

                              </NavLink>
                            );
                          },
                        )}
                      </div>
                    </div>
                  ),
                );
              })()}

            </div>

          </nav>

          {/* =================================
              CURRENT USER
          ================================== */}

          <div className="mt-auto shrink-0 px-4 pb-5">

            <button
              type="button"
              onClick={
                handleLogout
              }
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-[#f5f7fc]"
            >

              {/* AVATAR */}

              {currentUser.avatar ? (
                <img
                  src={
                    currentUser.avatar
                  }
                  alt={
                    currentUser.name
                  }
                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1457ff] text-xs font-semibold text-white">
                  {
                    avatarInitial
                  }
                </div>
              )}

              {/* USER INFO */}

              <div className="min-w-0 flex-1">

                <p className="truncate text-left text-sm font-medium text-[#20366f]">
                  {
                    currentUser.name
                  }
                </p>

                <p className="truncate text-left text-xs text-muted-foreground">
                  {
                    currentUser.role
                  }
                </p>

              </div>

              <ChevronRight className="h-4 w-4 shrink-0 text-[#20366f]" />

            </button>

          </div>

        </aside>

        {/* =================================
            MAIN CONTENT
        ================================== */}

        <main className="ml-[190px] min-h-screen w-[calc(100%-190px)] text-left">
          <Outlet />
        </main>

      </div>
    </div>
  );
}