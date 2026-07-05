import type { GenerateMediaInput, MediaProvider } from "./types";
import { getMediaModel, isProductionSafe } from "./registry";

export const ASPECT_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "1:1":  { width: 1024, height: 1024 },
  "4:3":  { width: 1024, height: 768  },
  "16:9": { width: 1280, height: 720  },
  "9:16": { width: 768,  height: 1024 },
  "A4":   { width: 816,  height: 1056 },
};

const STYLE_SUFFIXES: Record<string, string> = {
  diagram:      "clear labelled educational diagram, white background, clean technical lines, labelled arrows",
  realistic:    "photorealistic educational illustration, detailed, vibrant colors",
  minimal:      "minimal flat design, simple clean lines, white background, modern educational",
  infographic:  "educational infographic, organised sections, readable typography, clear visual hierarchy",
  worksheet:    "black and white worksheet illustration, printable-friendly, clean outlines, no shading",
  slide:        "clean presentation visual, bold colors, suitable for classroom projector",
  poster:       "educational poster, eye-catching, vibrant colors, large readable text, classroom display",
};

export function buildMediaPrompt(input: GenerateMediaInput): string {
  const safePrefixes = "school-appropriate, classroom-safe educational illustration";

  const contextParts: string[] = [];
  if (input.subject) contextParts.push(`${input.subject}`);
  if (input.topic)   contextParts.push(`topic: ${input.topic}`);
  if (input.classLevel) contextParts.push(`${input.classLevel} level`);

  const styleSuffix = STYLE_SUFFIXES[input.style ?? "diagram"] ?? STYLE_SUFFIXES.diagram;

  const labelText = input.labels?.length
    ? `clearly labelled: ${input.labels.join(", ")}`
    : "";

  const colorText =
    input.colorScheme === "bw"
      ? "black and white, grayscale, no color fills"
      : input.colorScheme === "blueprint"
        ? "blueprint style, white technical lines on dark blue background"
        : "full color";

  return [
    safePrefixes,
    contextParts.length ? contextParts.join(", ") : "",
    input.prompt.trim(),
    styleSuffix,
    labelText,
    colorText,
    "high quality, no watermarks, text legible",
  ]
    .filter(Boolean)
    .join(", ");
}

export function selectImageModel(
  input: GenerateMediaInput
): { modelId: string; provider: MediaProvider } {
  if (input.modelOverride) {
    if (!isProductionSafe(input.modelOverride)) {
      throw new Error(
        `Model "${input.modelOverride}" is not approved for production use. ` +
          `Only production-status, school-safe models may be used.`
      );
    }
    const model = getMediaModel(input.modelOverride)!;
    return { modelId: input.modelOverride, provider: model.provider };
  }

  const fastOverride      = process.env.MEDIA_MODEL_FAST;
  const qualityOverride   = process.env.MEDIA_MODEL_QUALITY;
  const infographicModel  = process.env.MEDIA_MODEL_INFOGRAPHIC;

  switch (input.task) {
    case "infographic":
    case "poster":
      // Ideogram is best for text-in-image; fall back to FLUX.1-dev if no Replicate token
      if (process.env.REPLICATE_API_TOKEN) {
        return {
          modelId: infographicModel ?? "ideogram-ai/ideogram-4-nf4",
          provider: "replicate",
        };
      }
      return {
        modelId: qualityOverride ?? "black-forest-labs/FLUX.1-dev",
        provider: "huggingface",
      };

    case "slide_visual":
      return {
        modelId: qualityOverride ?? "black-forest-labs/FLUX.1-dev",
        provider: "huggingface",
      };

    case "lesson_diagram":
    case "exam_diagram":
    case "flashcard_image":
    case "worksheet_figure":
    default:
      return {
        modelId: fastOverride ?? "black-forest-labs/FLUX.1-schnell",
        provider: "huggingface",
      };
  }
}
