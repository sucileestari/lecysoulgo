const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim();

if (!API_BASE_URL) {
  throw new Error(
    "VITE_API_BASE_URL belum diatur di environment variables.",
  );
}

// ==============================
// Types
// ==============================

export type AnnouncementCategory =
  | "important"
  | "attention"
  | "information";

export type AnnouncementStatus =
  | "draft"
  | "published"
  | "archived";

export type AnnouncementUser = {
  id: string;
  name: string;
  username: string;
};

export type Announcement = {
  id: string;
  title: string;
  category: AnnouncementCategory;
  content: string;
  action_solution: string | null;
  status: AnnouncementStatus;
  published_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;

  created_by_user?: AnnouncementUser | null;
  updated_by_user?: AnnouncementUser | null;
};

export type CreateAnnouncementInput = {
  title: string;
  category: AnnouncementCategory;
  content: string;
  action_solution?: string | null;
};

export type UpdateAnnouncementInput = {
  title?: string;
  category?: AnnouncementCategory;
  content?: string;
  action_solution?: string | null;
};

type ApiSuccess<T> = {
  success: true;
  data: T;
  message?: string;
};

type ApiMessageSuccess = {
  success: true;
  message?: string;
};

type ApiError = {
  success: false;
  message?: string;
  errors?: unknown;
};

type AnnouncementsResponse =
  | ApiSuccess<Announcement[]>
  | ApiError;

type AnnouncementResponse =
  | ApiSuccess<Announcement>
  | ApiError;

type ApiMessageResponse =
  | ApiMessageSuccess
  | ApiError;

// ==============================
// Helper
// ==============================

function getAuthToken(): string {
  const token =
    localStorage.getItem(
      "auth_token",
    );

  if (!token) {
    throw new Error(
      "Token tidak ditemukan. Silakan login kembali.",
    );
  }

  return token;
}

async function parseResponse<T>(
  response: Response,
): Promise<T> {
  let result: unknown;

  try {
    result =
      await response.json();
  } catch {
    throw new Error(
      `Server mengembalikan response yang tidak valid (${response.status})`,
    );
  }

  if (!response.ok) {
    const errorResponse =
      result as ApiError;

    throw new Error(
      errorResponse.message ||
        `Request gagal dengan status ${response.status}`,
    );
  }

  return result as T;
}

// ==============================
// Get Announcements
// ==============================

export async function getAnnouncements(
  search?: string,
): Promise<Announcement[]> {
  const params =
    new URLSearchParams();

  if (search?.trim()) {
    params.set(
      "search",
      search.trim(),
    );
  }

  const query =
    params.toString();

  const url =
    `${API_BASE_URL}/api/announcements${
      query ? `?${query}` : ""
    }`;

  const token =
    getAuthToken();

  const response =
    await fetch(url, {
      method: "GET",
      headers: {
        Accept:
          "application/json",
        Authorization:
          `Bearer ${token}`,
      },
    });

  const result =
    await parseResponse<AnnouncementsResponse>(
      response,
    );

  if (!result.success) {
    throw new Error(
      result.message ||
        "Gagal mengambil data pengumuman",
    );
  }

  return result.data;
}

// ==============================
// Get Announcement By ID
// ==============================

export async function getAnnouncementById(
  id: string,
): Promise<Announcement> {
  if (!id.trim()) {
    throw new Error(
      "ID pengumuman wajib diisi.",
    );
  }

  const token =
    getAuthToken();

  const response =
    await fetch(
      `${API_BASE_URL}/api/announcements/${encodeURIComponent(id)}`,
      {
        method: "GET",
        headers: {
          Accept:
            "application/json",
          Authorization:
            `Bearer ${token}`,
        },
      },
    );

  const result =
    await parseResponse<AnnouncementResponse>(
      response,
    );

  if (!result.success) {
    throw new Error(
      result.message ||
        "Gagal mengambil detail pengumuman",
    );
  }

  return result.data;
}

// ==============================
// Create Announcement
// ==============================

export async function createAnnouncement(
  input: CreateAnnouncementInput,
): Promise<Announcement> {
  const title =
    input.title.trim();

  const content =
    input.content.trim();

  if (!title) {
    throw new Error(
      "Judul pengumuman wajib diisi.",
    );
  }

  if (!content) {
    throw new Error(
      "Isi pengumuman wajib diisi.",
    );
  }

  const actionSolution =
    input.action_solution
      ?.trim() || null;

  const token =
    getAuthToken();

  const response =
    await fetch(
      `${API_BASE_URL}/api/announcements`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Accept:
            "application/json",
          Authorization:
            `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          category:
            input.category,
          content,
          action_solution:
            actionSolution,
        }),
      },
    );

  const result =
    await parseResponse<AnnouncementResponse>(
      response,
    );

  if (!result.success) {
    throw new Error(
      result.message ||
        "Gagal menambahkan pengumuman",
    );
  }

  return result.data;
}

// ==============================
// Update Announcement
// ==============================

export async function updateAnnouncement(
  id: string,
  input: UpdateAnnouncementInput,
): Promise<Announcement> {
  if (!id.trim()) {
    throw new Error(
      "ID pengumuman wajib diisi.",
    );
  }

  if (
    input.title === undefined &&
    input.category === undefined &&
    input.content === undefined &&
    input.action_solution ===
      undefined
  ) {
    throw new Error(
      "Minimal satu data harus diperbarui.",
    );
  }

  const body: UpdateAnnouncementInput =
    {
      ...input,
    };

  if (body.title !== undefined) {
    body.title =
      body.title.trim();

    if (!body.title) {
      throw new Error(
        "Judul pengumuman wajib diisi.",
      );
    }
  }

  if (
    body.content !== undefined
  ) {
    body.content =
      body.content.trim();

    if (!body.content) {
      throw new Error(
        "Isi pengumuman wajib diisi.",
      );
    }
  }

  if (
    body.action_solution !==
    undefined
  ) {
    body.action_solution =
      body.action_solution
        ?.trim() || null;
  }

  const token =
    getAuthToken();

  const response =
    await fetch(
      `${API_BASE_URL}/api/announcements/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type":
            "application/json",
          Accept:
            "application/json",
          Authorization:
            `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      },
    );

  const result =
    await parseResponse<AnnouncementResponse>(
      response,
    );

  if (!result.success) {
    throw new Error(
      result.message ||
        "Gagal memperbarui pengumuman",
    );
  }

  return result.data;
}

// ==============================
// Delete Announcement
// ==============================

export async function deleteAnnouncement(
  id: string,
): Promise<void> {
  if (!id.trim()) {
    throw new Error(
      "ID pengumuman wajib diisi.",
    );
  }

  const token =
    getAuthToken();

  const response =
    await fetch(
      `${API_BASE_URL}/api/announcements/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: {
          Accept:
            "application/json",
          Authorization:
            `Bearer ${token}`,
        },
      },
    );

  const result =
    await parseResponse<ApiMessageResponse>(
      response,
    );

  if (!result.success) {
    throw new Error(
      result.message ||
        "Gagal menghapus pengumuman",
    );
  }
}

// ==============================
// Publish Announcement
// ==============================

export async function publishAnnouncement(
  id: string,
): Promise<Announcement> {
  if (!id.trim()) {
    throw new Error(
      "ID pengumuman wajib diisi.",
    );
  }

  const token =
    getAuthToken();

  const response =
    await fetch(
      `${API_BASE_URL}/api/announcements/${encodeURIComponent(id)}/publish`,
      {
        method: "POST",
        headers: {
          Accept:
            "application/json",
          Authorization:
            `Bearer ${token}`,
        },
      },
    );

  const result =
    await parseResponse<AnnouncementResponse>(
      response,
    );

  if (!result.success) {
    throw new Error(
      result.message ||
        "Gagal mempublikasikan pengumuman",
    );
  }

  return result.data;
}