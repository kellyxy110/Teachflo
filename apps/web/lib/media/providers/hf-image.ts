import { getMediaModel } from "../registry";

/**
 * Generate an image via HuggingFace Inference Providers Router.
 * Returns a base64 data URL: `data:<mime>;base64,<data>`.
 */
export async function generateWithHuggingFace(
  modelId: string,
  prompt: string,
  dimensions: { width: number; height: number },
  extraParams?: Record<string, unknown>,
  signal?: AbortSignal
): Promise<string> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) throw new Error("HUGGINGFACE_API_KEY is not set");

  const modelEntry = getMediaModel(modelId);
  const defaultParams = modelEntry?.defaultParams ?? {};

  const response = await fetch(
    `https://router.huggingface.co/hf-inference/models/${modelId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Wait-For-Model": "true",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          ...defaultParams,
          ...extraParams,
          width: dimensions.width,
          height: dimensions.height,
        },
      }),
      signal,
    }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `HuggingFace image API ${response.status}: ${body.slice(0, 300)}`
    );
  }

  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  return `data:${contentType};base64,${base64}`;
}
