import { NextResponse } from "next/server";
import { DeliveryStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/server/errors";
import { requireStaff } from "@/server/auth";
import { serializeOrder } from "@/server/serializers";

export async function GET() {
  try {
    await requireStaff();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const revenueWhere = { paymentStatus: { in: ["PAID", "COD_PENDING"] as PaymentStatus[] }, status: { not: "CANCELLED" as DeliveryStatus } };

    const [todayOrders, todayRevenue, totalRevenue, totalOrders, totalCustomers, recentOrders, products] = await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.order.aggregate({ where: { ...revenueWhere, createdAt: { gte: startOfToday } }, _sum: { total: true } }),
      prisma.order.aggregate({ where: revenueWhere, _sum: { total: true } }),
      prisma.order.count(),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { items: true, statusHistory: true } }),
      prisma.product.findMany({ where: { isActive: true }, select: { id: true, name: true, slug: true, stock: true, lowStockThreshold: true } }),
    ]);

    return NextResponse.json({
      todayOrders,
      todayRevenue: Number(todayRevenue._sum.total ?? 0),
      totalRevenue: Number(totalRevenue._sum.total ?? 0),
      totalOrders,
      totalCustomers,
      recentOrders: recentOrders.map(serializeOrder),
      lowStockProducts: products.filter((p) => p.stock <= p.lowStockThreshold),
    });
  } catch (err) {
    return handleError(err);
  }
}
