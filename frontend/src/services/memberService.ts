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

export type MemberType =
  | "customer"
  | "employee";

export type Member = {
  id: string;
  name: string;
  phone: string;
  type: MemberType;
  created_at: string;
  updated_at: string;
};

export type CreateMemberInput = {
  name: string;
  phone: string;
  type: MemberType;
};

export type UpdateMemberInput = {
  name?: string;
  phone?: string;
  type?: MemberType;
};

type ApiSuccess<T> = {
  success: true;
  data: T;
  message?: string;
};

type ApiError = {
  success: false;
  message?: string;
  errors?: unknown;
};

type MembersResponse = ApiSuccess<Member[]> | ApiError;

type MemberResponse = ApiSuccess<Member> | ApiError;

type DeleteMemberResponse =
  | {
      success: true;
      message?: string;
    }
  | ApiError;

// ==============================
// Helper
// ==============================

async function parseResponse<T>(
  response: Response,
): Promise<T> {
  let result: unknown;

  try {
    result = await response.json();
  } catch {
    throw new Error(
      `Server mengembalikan response yang tidak valid (${response.status})`,
    );
  }

  if (!response.ok) {
    const errorResponse = result as ApiError;

    throw new Error(
      errorResponse.message ||
        `Request gagal dengan status ${response.status}`,
    );
  }

  return result as T;
}

// ==============================
// Get Members
// ==============================

export async function getMembers(
  search?: string,
): Promise<Member[]> {
  const params = new URLSearchParams();

  if (search?.trim()) {
    params.set("search", search.trim());
  }

  const query = params.toString();

  const url = `${API_BASE_URL}/api/members${
    query ? `?${query}` : ""
  }`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const result =
    await parseResponse<MembersResponse>(response);

  if (!result.success) {
    throw new Error(
      result.message || "Gagal mengambil data anggota",
    );
  }

  return result.data;
}

// ==============================
// Get Member By ID
// ==============================

export async function getMemberById(
  id: string,
): Promise<Member> {
  if (!id.trim()) {
    throw new Error("ID anggota wajib diisi");
  }

  const response = await fetch(
    `${API_BASE_URL}/api/members/${encodeURIComponent(id)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    },
  );

  const result =
    await parseResponse<MemberResponse>(response);

  if (!result.success) {
    throw new Error(
      result.message || "Gagal mengambil data anggota",
    );
  }

  return result.data;
}

// ==============================
// Create Member
// ==============================

export async function createMember(
  input: CreateMemberInput,
): Promise<Member> {
  const response = await fetch(
    `${API_BASE_URL}/api/members`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  const result =
    await parseResponse<MemberResponse>(response);

  if (!result.success) {
    throw new Error(
      result.message || "Gagal menambahkan anggota",
    );
  }

  return result.data;
}

// ==============================
// Update Member
// ==============================

export async function updateMember(
  id: string,
  input: UpdateMemberInput,
): Promise<Member> {
  if (!id.trim()) {
    throw new Error("ID anggota wajib diisi");
  }

  if (
    input.name === undefined &&
    input.phone === undefined &&
    input.type === undefined
  ) {
    throw new Error(
      "Minimal satu data harus diperbarui",
    );
  }

  const response = await fetch(
    `${API_BASE_URL}/api/members/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  const result =
    await parseResponse<MemberResponse>(response);

  if (!result.success) {
    throw new Error(
      result.message || "Gagal memperbarui anggota",
    );
  }

  return result.data;
}

// ==============================
// Delete Member
// ==============================

export async function deleteMember(
  id: string,
): Promise<void> {
  if (!id.trim()) {
    throw new Error("ID anggota wajib diisi");
  }

  const response = await fetch(
    `${API_BASE_URL}/api/members/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
      },
    },
  );

  const result =
    await parseResponse<DeleteMemberResponse>(response);

  if (!result.success) {
    throw new Error(
      result.message || "Gagal menghapus anggota",
    );
  }
}