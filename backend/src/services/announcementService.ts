import { supabase } from "../config/supabase.js";

/* =========================================
   TYPES
========================================= */

export type AnnouncementCategory =
  | "important"
  | "attention"
  | "information";

export type AnnouncementStatus =
  | "draft"
  | "published"
  | "archived";

export type AnnouncementRecord = {
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

  created_by_user?: {
    id: string;
    name: string;
    username: string;
  } | null;

  updated_by_user?: {
    id: string;
    name: string;
    username: string;
  } | null;
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

/* =========================================
   VALIDATION
========================================= */

function normalizeCategory(
  category: string,
): AnnouncementCategory {
  if (
    category !== "important" &&
    category !== "attention" &&
    category !== "information"
  ) {
    throw new Error(
      "Kategori pengumuman tidak valid.",
    );
  }

  return category;
}

/* =========================================
   SUPABASE ERROR HANDLER
========================================= */

function handleSupabaseError(
  error: {
    code?: string;
    message?: string;
  },
): never {
  throw new Error(
    error.message ||
      "Terjadi kesalahan pada database.",
  );
}

/* =========================================
   GET ALL ANNOUNCEMENTS
   Digunakan Admin
========================================= */

export async function getAnnouncements(
  search?: string,
): Promise<AnnouncementRecord[]> {
  let query = supabase
    .from("announcements")
    .select(`
      *,
      created_by_user:users!announcements_created_by_fkey(
        id,
        name,
        username
      ),
      updated_by_user:users!announcements_updated_by_fkey(
        id,
        name,
        username
      )
    `)
    .order("updated_at", {
      ascending: false,
    });

  if (search?.trim()) {
    const keyword =
      search.trim();

    query = query.or(
      `title.ilike.%${keyword}%,content.ilike.%${keyword}%`,
    );
  }

  const {
    data,
    error,
  } = await query;

  if (error) {
    handleSupabaseError(error);
  }

  return (
    data ?? []
  ) as AnnouncementRecord[];
}

/* =========================================
   GET PUBLISHED ANNOUNCEMENTS
   Digunakan Dashboard Customer
========================================= */

export async function getPublishedAnnouncements(): Promise<
  AnnouncementRecord[]
> {
  const {
    data,
    error,
  } = await supabase
    .from("announcements")
    .select(`
      id,
      title,
      category,
      content,
      action_solution,
      status,
      published_at,
      created_at,
      updated_at
    `)
    .eq(
      "status",
      "published",
    )
    .order(
      "published_at",
      {
        ascending: false,
      },
    );

  if (error) {
    handleSupabaseError(error);
  }

  return (
    data ?? []
  ) as AnnouncementRecord[];
}

/* =========================================
   GET ANNOUNCEMENT BY ID
========================================= */

export async function getAnnouncementById(
  id: string,
): Promise<AnnouncementRecord> {
  if (!id.trim()) {
    throw new Error(
      "ID pengumuman wajib diisi.",
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("announcements")
    .select(`
      *,
      created_by_user:users!announcements_created_by_fkey(
        id,
        name,
        username
      ),
      updated_by_user:users!announcements_updated_by_fkey(
        id,
        name,
        username
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    handleSupabaseError(error);
  }

  return data as AnnouncementRecord;
}

/* =========================================
   CREATE ANNOUNCEMENT
========================================= */

export async function createAnnouncement(
  input: CreateAnnouncementInput,
  userId: string,
): Promise<AnnouncementRecord> {
  const title =
    input.title.trim();

  const content =
    input.content.trim();

  const actionSolution =
    input.action_solution
      ?.trim() || null;

  const category =
    normalizeCategory(
      input.category,
    );

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

  if (!userId.trim()) {
    throw new Error(
      "User pembuat pengumuman tidak valid.",
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("announcements")
    .insert({
      title,
      category,
      content,
      action_solution:
        actionSolution,
      status: "draft",
      published_at: null,
      created_by: userId,
      updated_by: userId,
    })
    .select(`
      *,
      created_by_user:users!announcements_created_by_fkey(
        id,
        name,
        username
      ),
      updated_by_user:users!announcements_updated_by_fkey(
        id,
        name,
        username
      )
    `)
    .single();

  if (error) {
    handleSupabaseError(error);
  }

  return data as AnnouncementRecord;
}

/* =========================================
   UPDATE ANNOUNCEMENT
========================================= */

export async function updateAnnouncement(
  id: string,
  input: UpdateAnnouncementInput,
  userId: string,
): Promise<AnnouncementRecord> {
  if (!id.trim()) {
    throw new Error(
      "ID pengumuman wajib diisi.",
    );
  }

  if (!userId.trim()) {
    throw new Error(
      "User yang memperbarui pengumuman tidak valid.",
    );
  }

  const updateData: Record<
    string,
    unknown
  > = {};

  if (
    input.title !== undefined
  ) {
    const title =
      input.title.trim();

    if (!title) {
      throw new Error(
        "Judul pengumuman wajib diisi.",
      );
    }

    updateData.title =
      title;
  }

  if (
    input.category !== undefined
  ) {
    updateData.category =
      normalizeCategory(
        input.category,
      );
  }

  if (
    input.content !== undefined
  ) {
    const content =
      input.content.trim();

    if (!content) {
      throw new Error(
        "Isi pengumuman wajib diisi.",
      );
    }

    updateData.content =
      content;
  }

  if (
    input.action_solution !==
    undefined
  ) {
    updateData.action_solution =
      input.action_solution
        ?.trim() || null;
  }

  if (
    Object.keys(updateData)
      .length === 0
  ) {
    throw new Error(
      "Minimal satu data harus diperbarui.",
    );
  }

  updateData.updated_by =
    userId;

  updateData.updated_at =
    new Date().toISOString();

  const {
    data,
    error,
  } = await supabase
    .from("announcements")
    .update(updateData)
    .eq("id", id)
    .select(`
      *,
      created_by_user:users!announcements_created_by_fkey(
        id,
        name,
        username
      ),
      updated_by_user:users!announcements_updated_by_fkey(
        id,
        name,
        username
      )
    `)
    .single();

  if (error) {
    handleSupabaseError(error);
  }

  return data as AnnouncementRecord;
}

/* =========================================
   DELETE ANNOUNCEMENT
========================================= */

export async function deleteAnnouncement(
  id: string,
): Promise<void> {
  if (!id.trim()) {
    throw new Error(
      "ID pengumuman wajib diisi.",
    );
  }

  const {
    error,
  } = await supabase
    .from("announcements")
    .delete()
    .eq("id", id);

  if (error) {
    handleSupabaseError(error);
  }
}

/* =========================================
   PUBLISH ANNOUNCEMENT
========================================= */

export async function publishAnnouncement(
  id: string,
  userId: string,
): Promise<AnnouncementRecord> {
  if (!id.trim()) {
    throw new Error(
      "ID pengumuman wajib diisi.",
    );
  }

  if (!userId.trim()) {
    throw new Error(
      "User yang mempublikasikan pengumuman tidak valid.",
    );
  }

  const publishedAt =
    new Date().toISOString();

  const {
    data,
    error,
  } = await supabase
    .from("announcements")
    .update({
      status: "published",
      published_at:
        publishedAt,
      updated_by: userId,
      updated_at:
        publishedAt,
    })
    .eq("id", id)
    .select(`
      *,
      created_by_user:users!announcements_created_by_fkey(
        id,
        name,
        username
      ),
      updated_by_user:users!announcements_updated_by_fkey(
        id,
        name,
        username
      )
    `)
    .single();

  if (error) {
    handleSupabaseError(error);
  }

  return data as AnnouncementRecord;
}