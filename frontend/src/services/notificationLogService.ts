const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim();

if (!API_BASE_URL) {
  throw new Error(
    "VITE_API_BASE_URL belum diatur di environment variables.",
  );
}

/* =========================================
   TYPES
========================================= */

export type NotificationLogStatus =
  | "scheduled"
  | "sent"
  | "failed"
  | "skipped";

export type NotificationType =
  | "RECAP_PAYMENT"
  | "DUE_DATE_REMINDER";

export type NotificationLogItem = {
  id: string;
  notification_type: NotificationType;
  scheduled_at: string;
  sent_at: string | null;
  status: NotificationLogStatus;
  provider_message_id: string | null;
  error_message: string | null;
  skip_reason: string | null;
  attempt_count: number;
  last_attempt_at: string | null;
  created_at: string;
  member: {
    id: string;
    name: string | null;
    phone: string | null;
  } | null;
  recap: {
    id: string;
    detail_barang: string | null;
    batch: {
      id: string;
      name: string | null;
      country: string | null;
    } | null;
  } | null;
  payment: {
    id: string;
    payment_type: "DP" | "PELUNASAN";
    amount: number;
    status: string;
    due_date: string | null;
  } | null;
};

export type NotificationLogSummary = {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
};

export type NotificationLogPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type NotificationLogListResult = {
  items: NotificationLogItem[];
  pagination: NotificationLogPagination;
  summary: NotificationLogSummary;
};

export type NotificationLogFilters = {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  notificationType?: NotificationType | "";
  status?: NotificationLogStatus | "";
  buyer?: string;
};

type ApiSuccess<T> = {
  success: true;
  data: T;
  message?: string;
};

type ApiError = {
  success: false;
  message?: string;
};

type ApiResponse<T> =
  | ApiSuccess<T>
  | ApiError;

type RetryResponse = {
  logId: string;
  status: NotificationLogStatus;
};

/* =========================================
   RESPONSE PARSER
========================================= */

async function parseResponse<T>(
  response: Response,
): Promise<T> {
  let result: ApiResponse<T>;

  try {
    result = await response.json();
  } catch {
    throw new Error(
      `Server mengembalikan response tidak valid (${response.status}).`,
    );
  }

  if (!response.ok) {
    throw new Error(
      !result.success
        ? result.message ||
            `Request gagal (${response.status}).`
        : `Request gagal (${response.status}).`,
    );
  }

  if (!result.success) {
    throw new Error(
      result.message || "Request gagal.",
    );
  }

  return result.data;
}

/* =========================================
   AUTH HEADER
========================================= */

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem(
    "auth_token",
  );

  if (!token) {
    throw new Error(
      "Sesi admin tidak ditemukan. Silakan login kembali.",
    );
  }

  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

/* =========================================
   GET NOTIFICATION LOGS
========================================= */

export async function getNotificationLogs(
  filters: NotificationLogFilters = {},
): Promise<NotificationLogListResult> {
  const params = new URLSearchParams();

  params.set(
    "page",
    String(filters.page ?? 1),
  );
  params.set(
    "limit",
    String(filters.limit ?? 10),
  );

  if (filters.dateFrom) {
    params.set(
      "date_from",
      filters.dateFrom,
    );
  }

  if (filters.dateTo) {
    params.set(
      "date_to",
      filters.dateTo,
    );
  }

  if (filters.notificationType) {
    params.set(
      "notification_type",
      filters.notificationType,
    );
  }

  if (filters.status) {
    params.set(
      "status",
      filters.status,
    );
  }

  if (filters.buyer?.trim()) {
    params.set(
      "buyer",
      filters.buyer.trim(),
    );
  }

  const response = await fetch(
    `${API_BASE_URL}/api/notifications/logs?${params.toString()}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    },
  );

  return parseResponse<NotificationLogListResult>(
    response,
  );
}

/* =========================================
   RETRY FAILED NOTIFICATION
========================================= */

export async function retryNotificationLog(
  id: string,
): Promise<RetryResponse> {
  if (!id?.trim()) {
    throw new Error(
      "ID notification log wajib diisi.",
    );
  }

  const response = await fetch(
    `${API_BASE_URL}/api/notifications/logs/${encodeURIComponent(
      id.trim(),
    )}/retry`,
    {
      method: "POST",
      headers: getAuthHeaders(),
    },
  );

  return parseResponse<RetryResponse>(
    response,
  );
}
