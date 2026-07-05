import { buildMediaPrompt, selectImageModel, ASPECT_DIMENSIONS } from "./prompt-builder";
import { generateWithHuggingFace } from "./providers/hf-image";
import { generateWithReplicate } from "./providers/replicate";
import type { GenerateMediaInput, GenerateMediaOutput } from "./types";

export class MediaGenerationService {
  async generate(
    input: GenerateMediaInput,
    signal?: AbortSignal
  ): Promise<GenerateMediaOutput> {
    const startMs = Date.now();

    if (input.task === "video_clip") {
      throw new Error(
        "Video generation is not yet implemented. Use an image task instead."
      );
    }

    const promptUsed = buildMediaPrompt(input);
    const dimensions = ASPECT_DIMENSIONS[input.aspectRatio ?? "1:1"] ??
      ASPECT_DIMENSIONS["1:1"];

    const { modelId, provider } = selectImageModel(input);

    let assetUrl: string;

    if (provider === "huggingface") {
      assetUrl = await generateWithHuggingFace(
        modelId,
        promptUsed,
        dimensions,
        undefined,
        signal
      );
    } else if (provider === "replicate") {
      assetUrl = await generateWithReplicate(
        modelId,
        promptUsed,
        dimensions,
        signal
      );
    } else {
      throw new Error(`Provider "${provider}" is not implemented`);
    }

    const generationTimeMs = Date.now() - startMs;

    let fileSizeBytes: number | undefined;
    if (assetUrl.startsWith("data:")) {
      const base64Part = assetUrl.split(",")[1] ?? "";
      fileSizeBytes = Math.floor(base64Part.length * 0.75);
    }

    const mimeType =
      assetUrl.startsWith("data:image/png") || assetUrl.endsWith(".png")
        ? "image/png"
        : "image/jpeg";

    return {
      assetUrl,
      modelUsed: modelId,
      provider,
      promptUsed,
      safetyStatus: "passed",
      generationTimeMs,
      metadata: {
        width: dimensions.width,
        height: dimensions.height,
        aspectRatio: input.aspectRatio ?? "1:1",
        mimeType,
        fileSizeBytes,
      },
    };
  }
}

export const mediaGenerationService = new MediaGenerationService();
