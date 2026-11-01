import { spawn } from "child_process";
import { join } from "path";

export interface ShopeeVideoExtractResult {
  success: boolean;
  videoUrl?: string;
  allVideos?: Array<{ url: string; title: string; type: string; rating?: number }>;
  duration?: number;
  title?: string;
  shopId?: string;
  itemId?: string;
  source?: "shopee_vod" | "pdp_json" | "dom" | "direct_vod" | "review";
  error?: string;
}

/**
 * Executes the stealth Shopee video extractor in an isolated Node child process.
 * This ensures full compatibility with Next.js Turbopack and prevents bundler issues.
 */
export async function extractShopeeProductVideo(
  inputUrlOrId: string,
  options?: { timeoutMs?: number }
): Promise<ShopeeVideoExtractResult> {
  const scriptPath = join(process.cwd(), "scripts", "extract_shopee_video.mjs");
  const targetUrl = inputUrlOrId.trim();

  return new Promise((resolve) => {
    const proc = spawn(process.execPath, [scriptPath, targetUrl], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    const timeout = setTimeout(() => {
      try {
        proc.kill();
      } catch {}
      resolve({
        success: false,
        error: "Tempo limite esgotado ao extrair vídeo da Shopee.",
      });
    }, options?.timeoutMs || 30000);

    proc.on("close", () => {
      clearTimeout(timeout);
      try {
        // Attempt to parse JSON from output
        const lines = stdout.trim().split("\n");
        const lastLine = lines[lines.length - 1];
        const json = JSON.parse(lastLine);
        resolve(json);
      } catch {
        resolve({
          success: false,
          error: stderr || stdout || "Falha ao processar resposta do extrator.",
        });
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timeout);
      resolve({
        success: false,
        error: err.message,
      });
    });
  });
}
