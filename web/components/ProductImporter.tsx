"use client";

import Papa from "papaparse";
import { useRef } from "react";
import type { Product } from "../types/Product";

export type ProductImporterProps = {
  onProducts: (products: Product[]) => void;
};

const SAMPLE_CSV = `title,price,imageUrl,description,tags\nBouteille isotherme 500ml,24.90,https://images.unsplash.com/photo-1517433670267-08bbd4be890f?q=80&w=1080&auto=format&fit=crop,Acier inoxydable,eco;boisson;chaud\nSupport t?l?phone pliable,14.90,https://images.unsplash.com/photo-1590540179793-05cbd1aab9d3?q=80&w=1080&auto=format&fit=crop,Compact et solide,mobile;stand;utiles\n`;

export function ProductImporter({ onProducts }: ProductImporterProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCSV = (csv: string) => {
    const res = Papa.parse(csv.trim(), { header: true, skipEmptyLines: true });
    const products: Product[] = (res.data as any[]).map((row, idx) => ({
      id: String(idx + 1),
      title: (row.title || row.Titre || "Produit").toString(),
      price: row.price ? String(row.price) : undefined,
      imageUrl: (row.imageUrl || row.image || row.image_url || "").toString(),
      description: row.description ? String(row.description) : undefined,
      tags: row.tags ? String(row.tags).split(/[,;\s]+/).filter(Boolean) : undefined,
      caption: undefined,
    }));
    onProducts(products.filter((p) => p.imageUrl));
  };

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center gap-3">
        <label className="inline-flex items-center px-3 py-2 rounded-md border text-sm cursor-pointer bg-white hover:bg-zinc-50">
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const text = await file.text();
              handleCSV(text);
            }}
          />
          Importer CSV
        </label>
        <button
          className="px-3 py-2 rounded-md border text-sm bg-white hover:bg-zinc-50"
          onClick={() => handleCSV(SAMPLE_CSV)}
        >
          Charger exemple
        </button>
      </div>

      <div>
        <p className="text-sm text-zinc-500 mb-2">Ou collez du CSV (ent?tes: title, price, imageUrl, description, tags)</p>
        <textarea
          ref={textareaRef}
          className="w-full h-32 p-2 border rounded-md"
          placeholder={SAMPLE_CSV}
        />
        <div className="mt-2">
          <button
            className="px-3 py-2 rounded-md bg-black text-white text-sm hover:bg-zinc-800"
            onClick={() => handleCSV(textareaRef.current?.value || SAMPLE_CSV)}
          >
            Importer
          </button>
        </div>
      </div>
    </div>
  );
}
