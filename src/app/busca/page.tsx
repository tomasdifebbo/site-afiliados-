"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, ShoppingBag, Star, Flame, Loader2, ArrowRight, ExternalLink } from "lucide-react";
import { ShopeeSearchBar } from "@/components/ShopeeSearchBar";

interface LiveShopeeProduct {
  id: string;
  itemId: string;
  name: string;
  price: number;
  originalPrice?: number | null;
  discountRate?: number | null;
  imageUrl: string;
  affiliateLink: string;
  sales: number;
  ratingStar: number;
  shopName: string;
}

import { Suspense } from "react";
import SearchContent from "./SearchContent";

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: "center", padding: "5rem 1rem" }}>
          Carregando busca da Shopee...
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
