import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { conflict, handleError } from "@/server/errors";
import { requirePermission } from "@/server/auth";

const querySchema = z.object({
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(req: NextRequest) {
  try {
    await requirePermission("customers");
    const q = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const where: Prisma.UserWhereInput = {
      role: "CUSTOMER",
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search } },
              { email: { contains: q.search } },
              { phone: { contains: q.search } },
            ],
          }
        : {}),
    };
    const [total, customers] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        select: { id: true, name: true, email: true, phone: true, createdAt: true, _count: { select: { orders: true } } },
      }),
    ]);
    return NextResponse.json({
      items: customers.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        joinedAt: c.createdAt,
        totalOrders: c._count.orders,
      })),
      total,
      page: q.page,
      pages: Math.max(1, Math.ceil(total / q.limit)),
    });
  } catch (err) {
    return handleError(err);
  }
}

// Admin-created customer with login credentials + optional default address.
const createSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().transform((v) => v.toLowerCase()),
  phone: z.string().min(11).max(15),
  username: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_.]+$/, "Letters, numbers, dot and underscore only")
    .optional()
    .or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  // Optional default address (created when both lines are provided).
  address: z.string().max(500).optional(),
  district: z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requirePermission("customers");
    const b = createSchema.parse(await req.json());

    if (await prisma.user.findUnique({ where: { email: b.email } })) {
      throw conflict("A customer with this email already exists");
    }
    const username = b.username ? b.username.toLowerCase() : null;
    if (username && (await prisma.user.findUnique({ where: { username } }))) {
      throw conflict("This username is already taken");
    }

    const hasAddress = Boolean(b.address && b.district);
    const user = await prisma.user.create({
      data: {
        name: b.name,
        email: b.email,
        phone: b.phone,
        username,
        password: await bcrypt.hash(b.password, 10),
        role: "CUSTOMER",
        // Admin set the password deliberately, so don't force a first-login change.
        mustChangePassword: false,
        ...(hasAddress
          ? { addresses: { create: { fullName: b.name, phone: b.phone, address: b.address!, district: b.district!, isDefault: true } } }
          : {}),
      },
      select: { id: true, name: true, email: true, phone: true, createdAt: true },
    });

    return NextResponse.json(
      { customer: { id: user.id, name: user.name, email: user.email, phone: user.phone, joinedAt: user.createdAt, totalOrders: 0 } },
      { status: 201 },
    );
  } catch (err) {
    return handleError(err);
  }
}
