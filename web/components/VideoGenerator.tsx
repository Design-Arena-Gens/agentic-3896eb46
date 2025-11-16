"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "../types/Product";

async function loadImageThroughProxy(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.decoding = "async";
  img.referrerPolicy = "no-referrer";
  img.src = `/api/image-proxy?url=${encodeURIComponent(url)}`;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Image load failed"));
  });
  return img;
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  frameIndex: number,
  totalFrames: number,
  title: string,
  price?: string
) {
  const { width, height } = canvas;

  // Background
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, "#0ea5e9");
  grad.addColorStop(1, "#1e293b");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Simple zoom animation on the product image
  const progress = frameIndex / totalFrames; // 0..1
  const minScale = 0.9;
  const maxScale = 1.1;
  const scale = minScale + (maxScale - minScale) * progress;

  const targetW = Math.min(width * 0.8, img.width * scale);
  const targetH = (img.height / img.width) * targetW;
  const x = (width - targetW) / 2;
  const y = (height - targetH) / 2 - 40;

  // Shadow card
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 30;
  ctx.drawImage(img, x, y, targetW, targetH);
  ctx.restore();

  // Title text
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 56px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const titleLines = wrapText(ctx, title, width * 0.9);
  titleLines.forEach((line, i) => {
    ctx.fillText(line, width / 2, height - 380 + i * 60);
  });

  // Price badge
  if (price) {
    const badgeText = price.endsWith("?") ? price : `${price} ?`;
    ctx.font = "bold 44px system-ui, -apple-system, Segoe UI, Roboto";
    const metrics = ctx.measureText(badgeText);
    const padX = 24;
    const padY = 16;
    const bw = metrics.width + padX * 2;
    const bh = 64 + padY * 2 - 16;
    const bx = (width - bw) / 2;
    const by = height - 240;

    // rounded rect
    const r = 18;
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    roundRect(ctx, bx, by, bw, bh, r);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.fillText(badgeText, width / 2, by + bh / 2 + 4);
  }

  // CTA
  ctx.font = "600 36px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillStyle = "#a5b4fc";
  ctx.fillText("Disponible sur notre vitrine TikTok Shop", width / 2, height - 100);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 2); // limit to 2 lines
}

export function VideoGenerator({ product }: { product: Product }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);
  const [webmUrl, setWebmUrl] = useState<string | null>(null);
  const [mp4Url, setMp4Url] = useState<string | null>(null);

  const caption = useMemo(() => {
    const tags = product.tags?.map((t) => `#${t.replace(/[^a-z0-9]/gi, "").toLowerCase()}`) ?? [];
    const base = product.description || product.title;
    return `${base}\n${tags.join(" ")}`.trim();
  }, [product]);

  async function recordWebm() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setBusy(true);
    setWebmUrl(null);
    setMp4Url(null);

    const img = await loadImageThroughProxy(product.imageUrl);

    const fps = 30;
    const seconds = 10;
    const totalFrames = fps * seconds;

    // Record using MediaRecorder for efficiency
    const stream = canvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);

    const ready = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));
    recorder.start();

    for (let i = 0; i < totalFrames; i++) {
      drawFrame(ctx, canvas, img, i, totalFrames, product.title, product.price);
      await new Promise((r) => setTimeout(r, 1000 / fps));
    }

    recorder.stop();
    await ready;

    const blob = new Blob(chunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    setWebmUrl(url);
    setBusy(false);
  }

  async function transcodeToMp4() {
    if (!webmUrl) return;
    setBusy(true);

    const webmBlob = await fetch(webmUrl).then((r) => r.blob());
    const form = new FormData();
    form.append("file", webmBlob, `${product.id}.webm`);

    const res = await fetch("/api/transcode", { method: "POST", body: form });
    if (!res.ok) {
      alert("Transcodage ?chou?");
      setBusy(false);
      return;
    }
    const mp4Blob = await res.blob();
    const mp4 = URL.createObjectURL(mp4Blob);
    setMp4Url(mp4);
    setBusy(false);
  }

  useEffect(() => {
    // Initial blank frame
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0ea5e9";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-start gap-4">
        <canvas ref={canvasRef} width={1080} height={1920} className="w-44 h-[320px] bg-black rounded" />
        <div className="flex-1 space-y-3">
          <div>
            <div className="text-lg font-semibold">{product.title}</div>
            {product.price && <div className="text-zinc-600">{product.price} ?</div>}
          </div>
          <div className="text-sm text-zinc-500 whitespace-pre-wrap border rounded p-2 bg-zinc-50">{caption}</div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={recordWebm}
              disabled={busy}
              className="px-3 py-2 rounded-md bg-black text-white text-sm disabled:opacity-50"
            >
              G?n?rer la vid?o (WebM)
            </button>
            <button
              onClick={transcodeToMp4}
              disabled={!webmUrl || busy}
              className="px-3 py-2 rounded-md border text-sm disabled:opacity-50"
            >
              Convertir en MP4
            </button>
            {webmUrl && (
              <a download={`${product.id}.webm`} href={webmUrl} className="px-3 py-2 rounded-md border text-sm" target="_blank">T?l?charger WebM</a>
            )}
            {mp4Url && (
              <a download={`${product.id}.mp4`} href={mp4Url} className="px-3 py-2 rounded-md border text-sm" target="_blank">T?l?charger MP4</a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
