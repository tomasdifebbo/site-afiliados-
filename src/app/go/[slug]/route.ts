import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const AFFILIATE_ID = "an_18370270013";
const GENERIC_CATEGORY_LINKS = new Set([
  "https://s.shopee.com.br/1BGX4gLZZ",
  "https://s.shopee.com.br/4AvSPosErb",
  "https://shope.ee/example",
]);

function resolveProductAffiliateUrl(
  productName: string,
  rawLink: string | null | undefined,
  categoryLink: string | null | undefined
): string {
  const link = (rawLink || "").trim();

  const isGenericCategoryLink =
    !link ||
    GENERIC_CATEGORY_LINKS.has(link) ||
    (categoryLink && link === categoryLink.trim()) ||
    link.includes("-cat.");

  if (isGenericCategoryLink) {
    const keyword = encodeURIComponent(productName.trim());
    return `https://shopee.com.br/search?keyword=${keyword}&mmp_pid=${AFFILIATE_ID}&utm_source=${AFFILIATE_ID}&utm_medium=affiliates`;
  }

  // If it's a direct shopee.com.br link without affiliate tracking, attach affiliate params
  if (link.includes("shopee.com.br/") && !link.includes("s.shopee.com.br") && !link.includes("mmp_pid=")) {
    try {
      const url = new URL(link);
      url.searchParams.set("mmp_pid", AFFILIATE_ID);
      url.searchParams.set("utm_source", AFFILIATE_ID);
      url.searchParams.set("utm_medium", "affiliates");
      return url.toString();
    } catch {
      return link;
    }
  }

  return link;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // 1. Find the product along with its category
  let product = await prisma.product.findUnique({
    where: { slug },
    include: { category: true },
  });

  if (!product) {
    try {
      const decodedSlug = decodeURIComponent(slug);
      product = await prisma.product.findFirst({
        where: {
          OR: [
            { slug: decodedSlug },
            { itemId: slug },
            { id: slug },
          ],
        },
        include: { category: true },
      });
    } catch {}
  }

  if (!product) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 2. Track the click asynchronously (don't block the redirect)
  const origin = request.nextUrl.searchParams.get("origin") || "direct";
  const userAgent = request.headers.get("user-agent") || "";
  const isMobile = /mobile/i.test(userAgent) ? "mobile" : "desktop";

  prisma.click.create({
    data: {
      productId: product.id,
      origin: origin,
      device: isMobile,
    },
  }).catch((err: Error) => console.error("Tracking Error:", err));

  // 3. Resolve specific product affiliate URL (never redirect to generic category)
  const targetUrl = resolveProductAffiliateUrl(
    product.name,
    product.affiliateLink,
    product.category?.affiliateLink
  );

  if (targetUrl !== product.affiliateLink) {
    prisma.product.update({
      where: { id: product.id },
      data: { affiliateLink: targetUrl },
    }).catch(() => {});
  }

  return NextResponse.redirect(targetUrl);
}

