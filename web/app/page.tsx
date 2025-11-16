"use client";

import { useState } from "react";
import { ProductImporter } from "../components/ProductImporter";
import { VideoGenerator } from "../components/VideoGenerator";
import type { Product } from "../types/Product";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([
    {
      id: "demo-1",
      title: "Bouteille isotherme 500ml",
      price: "24.90",
      imageUrl:
        "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?q=80&w=1080&auto=format&fit=crop",
      description: "Garde au chaud jusqu'? 12h",
      tags: ["tiktokshop", "vitrine", "boisson"],
    },
  ]);

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Automatisation TikTok Shop</h1>
          <div className="text-sm text-zinc-500">G?n?rer et exporter des vid?os produit</div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-6 space-y-8">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Importer des produits</h2>
          <ProductImporter onProducts={setProducts} />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Vid?os ? g?n?rer</h2>
          <div className="grid gap-4">
            {products.map((p) => (
              <VideoGenerator key={p.id} product={p} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
