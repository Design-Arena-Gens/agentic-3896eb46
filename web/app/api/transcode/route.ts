import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { spawn } from "child_process";
import ffmpegStatic from "ffmpeg-static";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return new Response("file missing", { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputPath = path.join(os.tmpdir(), `input-${Date.now()}.webm`);
    const outputPath = path.join(os.tmpdir(), `output-${Date.now()}.mp4`);

    await fs.writeFile(inputPath, Buffer.from(arrayBuffer));

    const ffmpegPath = ffmpegStatic as string;
    await runFfmpeg([
      "-y",
      "-i",
      inputPath,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-an",
      outputPath,
    ], ffmpegPath);

    const data = await fs.readFile(outputPath);

    // cleanup best-effort
    fs.unlink(inputPath).catch(() => {});
    fs.unlink(outputPath).catch(() => {});

    return new Response(data, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename=video.mp4`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return new Response(`error: ${err?.message || String(err)}`, { status: 500 });
  }
}

function runFfmpeg(args: string[], ffmpegPath: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(ffmpegPath, args);
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `ffmpeg exited with code ${code}`));
    });
  });
}
