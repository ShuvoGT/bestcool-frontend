import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, notFound } from "@/server/errors";
import { enrichBlocks } from "@/server/pages";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { slug } = await params;
    const page = await prisma.page.findUnique({
      where: { slug },
      include: { blocks: { where: { isEnabled: true }, orderBy: { sortOrder: "asc" } } },
    });
    if (!page) throw notFound("Page not found");
    return NextResponse.json({
      page: {
        slug: page.slug,
        title: page.title,
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
        ogImage: page.ogImage,
        blocks: await enrichBlocks(page.blocks),
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
