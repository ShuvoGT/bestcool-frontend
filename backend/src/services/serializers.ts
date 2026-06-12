import { Prisma } from "@prisma/client";
import { resolvePrice, type FlashInfo } from "./pricing";

/**
 * Shapes Prisma entities into clean JSON for the storefront/admin.
 * Decimal fields become numbers; flash pricing is resolved server-side.
 */

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    images: true;
    category: true;
    variants: true;
    reviews: { select: { rating: true } };
  };
}>;

export function serializeProductCard(p: ProductWithRelations, flash?: FlashInfo) {
  const pricing = resolvePrice(p, flash);
  const ratings = p.reviews.map((r) => r.rating);
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    ...pricing,
    stock: p.stock,
    isActive: p.isActive,
    soldCount: p.soldCount,
    image: p.images[0]?.url ?? null,
    category: p.category ? { id: p.category.id, name: p.category.name, slug: p.category.slug } : null,
    rating: {
      average: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : 0,
      count: ratings.length,
    },
    hasVariants: p.variants.length > 0,
    createdAt: p.createdAt,
  };
}

export function serializeProductDetail(p: ProductWithRelations, flash?: FlashInfo) {
  return {
    ...serializeProductCard(p, flash),
    description: p.description,
    lowStockThreshold: p.lowStockThreshold,
    images: p.images
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((i) => ({ id: i.id, url: i.url, alt: i.alt, sortOrder: i.sortOrder })),
    variants: p.variants.map((v) => ({
      id: v.id,
      name: v.name,
      attributes: v.attributes,
      sku: v.sku,
      priceDiff: Number(v.priceDiff),
      stock: v.stock,
    })),
  };
}

type OrderWithRelations = Prisma.OrderGetPayload<{ include: { items: true; statusHistory: true } }>;

export function serializeOrder(o: OrderWithRelations) {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    subtotal: Number(o.subtotal),
    shippingCharge: Number(o.shippingCharge),
    total: Number(o.total),
    shipping: {
      name: o.shippingName,
      phone: o.shippingPhone,
      email: o.shippingEmail,
      address: o.shippingAddress,
      district: o.shippingDistrict,
      notes: o.orderNotes,
      deliveryZone: o.deliveryZoneName,
    },
    courier: o.courierName
      ? { name: o.courierName, consignmentId: o.consignmentId, status: o.courierStatus, trackingUrl: o.courierTrackingUrl }
      : null,
    paidAt: o.paidAt,
    items: o.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      variantId: i.variantId,
      name: i.name,
      variantName: i.variantName,
      image: i.image,
      unitPrice: Number(i.unitPrice),
      quantity: i.quantity,
      lineTotal: Number(i.unitPrice) * i.quantity,
    })),
    timeline: o.statusHistory
      .slice()
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((h) => ({ status: h.status, note: h.note, at: h.createdAt })),
    createdAt: o.createdAt,
  };
}
