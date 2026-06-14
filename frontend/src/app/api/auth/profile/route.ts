import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { conflict, handleError } from "@/server/errors";
import { publicUser, requireAuth } from "@/server/auth";

const schema = z.object({
  name: z.string().min(2).max(100),
  // Optional handle: a valid username, "" to clear it, or omit to leave unchanged.
  username: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_.]+$/, "Letters, numbers, dot and underscore only")
    .optional()
    .or(z.literal("")),
  phone: z.string().min(11).max(15).nullable().optional(),
});

export async function PUT(req: NextRequest) {
  try {
    const authUser = await requireAuth();
    const body = schema.parse(await req.json());
    const data: Prisma.UserUpdateInput = {
      name: body.name,
      phone: body.phone ?? undefined,
    };
    if (body.username !== undefined) {
      const lower = body.username ? body.username.toLowerCase() : null;
      if (lower) {
        const taken = await prisma.user.findFirst({ where: { username: lower, id: { not: authUser.id } } });
        if (taken) throw conflict("This username is already taken");
      }
      data.username = lower;
    }
    const user = await prisma.user.update({ where: { id: authUser.id }, data });
    return NextResponse.json({ user: publicUser(user) });
  } catch (err) {
    return handleError(err);
  }
}
