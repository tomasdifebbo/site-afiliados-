import fs from "fs";
import path from "path";

function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const chunkSize = 36 + dataSize;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(chunkSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size
  header.writeUInt16LE(1, 20);  // PCM format = 1
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

/**
 * Sintetiza narração neural de alta qualidade diretamente com a API do Google Gemini
 * Salva o áudio gerado em public/audio/ e retorna a URL pública acessível no navegador.
 */
export async function synthesizeVoiceWithGemini(params: {
  text: string;
  voiceName?: "Puck" | "Charon" | "Kore" | "Fenrir" | "Aoede";
  apiKey?: string;
  filenamePrefix?: string;
}): Promise<{ audioUrl: string; durationEstSeconds: number } | null> {
  const apiKey = params.apiKey || process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    console.warn("[Gemini TTS] Nenhuma GEMINI_API_KEY configurada.");
    return null;
  }

  const cleanText = params.text
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu, "")
    .replace(/[\uD800-\uDFFF]/g, "")
    .replace(/[#*_~`\[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanText) return null;

  const voiceName = params.voiceName || "Puck";
  const models = ["gemini-3.8-flash-tts", "gemini-2.5-flash-preview-tts", "gemini-3.1-flash-tts-preview"];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Fale exatamente o texto a seguir em português do Brasil com entonação entusiasmada, dinâmica e profissional para um vídeo de achadinho da Shopee:\n\n${cleanText}`,
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName,
                },
              },
            },
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[Gemini TTS] Falha no modelo ${model}:`, errText.slice(0, 200));
        continue;
      }

      const data = await res.json();
      const part = data.candidates?.[0]?.content?.parts?.[0];
      if (!part?.inlineData?.data) {
        console.warn(`[Gemini TTS] Modelo ${model} retornou sem áudio inlineData`);
        continue;
      }

      const base64Data = part.inlineData.data;
      const mimeType = part.inlineData.mimeType || "audio/wav";
      const rawBuffer = Buffer.from(base64Data, "base64");

      let finalWavBuffer: Buffer;
      if (mimeType.includes("wav")) {
        finalWavBuffer = rawBuffer;
      } else {
        // Converte PCM L16 24kHz mono para WAV
        finalWavBuffer = pcmToWav(rawBuffer, 24000, 1, 16);
      }

      const publicDir = path.join(process.cwd(), "public", "audio");
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }

      const prefix = params.filenamePrefix || "gemini-narration";
      const fileName = `${prefix}-${Date.now()}.wav`;
      const filePath = path.join(publicDir, fileName);

      fs.writeFileSync(filePath, finalWavBuffer);

      const byteRate = 24000 * 1 * 2; // sampleRate * channels * bytesPerSample
      const durationEstSeconds = Math.max(3, Number((finalWavBuffer.length / byteRate).toFixed(1)));

      return {
        audioUrl: `/audio/${fileName}`,
        durationEstSeconds,
      };
    } catch (err: any) {
      console.warn(`[Gemini TTS] Erro com ${model}:`, err.message);
    }
  }

  return null;
}
