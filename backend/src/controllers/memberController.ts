import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  createMember,
  deleteMember,
  getMemberById,
  getMembers,
  updateMember,
} from "../services/memberService.js";

type MemberOption = {
  id: string;
  name: string;
  phone: string;
  type:
    | "customer"
    | "employee"
    | "hnr";
};

function normalizeMemberOptions(
  members: unknown,
): MemberOption[] {
  if (!Array.isArray(members)) {
    throw new Error(
      "Data member tidak valid.",
    );
  }

  return members.map(
    (member): MemberOption => {
      if (
        !member ||
        typeof member !==
          "object"
      ) {
        throw new Error(
          "Data member tidak valid.",
        );
      }

      const value =
        member as Record<
          string,
          unknown
        >;

      if (
        typeof value.id !==
          "string" ||
        typeof value.name !==
          "string" ||
        typeof value.phone !==
          "string" ||
        (
          value.type !==
            "customer" &&
          value.type !==
            "employee" &&
          value.type !==
            "hnr"
        )
      ) {
        throw new Error(
          "Format data member tidak valid.",
        );
      }

      return {
        id: value.id,
        name: value.name,
        phone: value.phone,
        type: value.type,
      };
    },
  );
}

export async function listMembers(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const search =
      typeof req.query.search ===
      "string"
        ? req.query.search
        : undefined;

    const data = await getMembers(
      search,
    );

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function listBatchMemberOptions(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const search =
      typeof req.query.search ===
      "string"
        ? req.query.search
        : undefined;

    const members =
      await getMembers(search);

    const normalizedMembers =
      normalizeMemberOptions(
        members,
      );

    const data =
      normalizedMembers
        .filter(
          (member) =>
            member.type ===
            "employee",
        )
        .map((member) => ({
          id: member.id,
          name: member.name,
          phone: member.phone,
          type: member.type,
        }));

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function listRecapMemberOptions(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const search =
      typeof req.query.search ===
      "string"
        ? req.query.search
        : undefined;

    const members =
      await getMembers(search);

    const normalizedMembers =
      normalizeMemberOptions(
        members,
      );

    const data =
      normalizedMembers.map(
        (member) => ({
          id: member.id,
          name: member.name,
          phone: member.phone,
          type: member.type,
        }),
      );

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function listHnrMembers(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const search =
      typeof req.query.search ===
      "string"
        ? req.query.search
        : undefined;

    const data = await getMembers(
      search,
      "hnr",
    );

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMember(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = Array.isArray(
      req.params.id,
    )
      ? req.params.id[0]
      : req.params.id;

    const data =
      await getMemberById(id);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function addMember(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await createMember(
      req.body,
    );

    res.status(201).json({
      success: true,
      message:
        "Member berhasil ditambahkan",
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function editMember(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = Array.isArray(
      req.params.id,
    )
      ? req.params.id[0]
      : req.params.id;

    const data = await updateMember(
      id,
      req.body,
    );

    res.json({
      success: true,
      message:
        "Member berhasil diperbarui",
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function removeMember(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = Array.isArray(
      req.params.id,
    )
      ? req.params.id[0]
      : req.params.id;

    await deleteMember(id);

    res.json({
      success: true,
      message:
        "Member berhasil dihapus",
    });
  } catch (error) {
    next(error);
  }
}