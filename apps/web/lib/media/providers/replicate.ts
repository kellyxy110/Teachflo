interface ReplicatePrediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string | string[];
  error?: string;
  urls: { get: string; cancel: string };
}

const MAX_POLL_ATTEMPTS = 60;
const POLL_INTERVAL_MS  = 2_000;

/**
 * Generate an image via Replicate.
 * Returns the image URL from Replicate's CDN (typically a short-lived https URL).
 */
export async function generateWithReplicate(
  modelId: string,
  prompt: string,
  dimensions: { width: number; height: number },
  signal?: AbortSignal
): Promise<string> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN is not set");

  const [owner, model] = modelId.split("/");
  if (!owner || !model) throw new Error(`Invalid Replicate model ID: ${modelId}`);

  const createRes = await fetch(
    `https://api.replicate.com/v1/models/${owner}/${model}/predictions`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: {
          prompt,
          width: dimensions.width,
          height: dimensions.height,
          num_outputs: 1,
          output_format: "png",
        },
      }),
      signal,
    }
  );

  if (!createRes.ok) {
    const body = await createRes.text().catch(() => "");
    throw new Error(`Replicate create error ${createRes.status}: ${body.slice(0, 300)}`);
  }

  let prediction: ReplicatePrediction = await createRes.json();

  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    if (prediction.status === "succeeded") break;
    if (prediction.status === "failed" || prediction.status === "canceled") {
      throw new Error(
        `Replicate prediction ${prediction.status}: ${prediction.error ?? "unknown"}`
      );
    }

    await new Promise<void>((r) => setTimeout(r, POLL_INTERVAL_MS));
    if (signal?.aborted) throw new Error("Request aborted");

    const pollRes = await fetch(prediction.urls.get, {
      headers: { Authorization: `Token ${token}` },
      signal,
    });
    prediction = await pollRes.json();
  }

  if (prediction.status !== "succeeded") {
    throw new Error("Replicate prediction timed out after 120 seconds");
  }

  const output = Array.isArray(prediction.output)
    ? prediction.output[0]
    : prediction.output;

  if (!output) throw new Error("Replicate returned empty output");
  return output;
}
