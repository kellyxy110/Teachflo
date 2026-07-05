import type { MediaModelEntry } from "./types";

export const MEDIA_MODEL_REGISTRY: MediaModelEntry[] = [

  // ── Production: Fast image generation ──────────────────────────────────

  {
    id: "black-forest-labs/FLUX.1-schnell",
    name: "FLUX.1-schnell (Black Forest Labs)",
    provider: "huggingface",
    status: "production",
    capabilities: ["image", "diagram"],
    safetyRating: "school-safe",
    license: "Apache 2.0",
    licensingNotes: "Free for commercial use. 4-step distilled model.",
    apiEndpoint: "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
    defaultParams: { num_inference_steps: 4, guidance_scale: 3.5 },
    notes: "Primary fast model. ~5-10s. Best for quick diagrams and lesson drafts.",
  },

  // ── Production: High-quality image generation ───────────────────────────

  {
    id: "black-forest-labs/FLUX.1-dev",
    name: "FLUX.1-dev (Black Forest Labs)",
    provider: "huggingface",
    status: "production",
    capabilities: ["image", "diagram", "infographic"],
    safetyRating: "school-safe",
    license: "FLUX.1-dev Non-Commercial License",
    licensingNotes: "Non-commercial on HF. Commercial use requires licensing from BFL.",
    apiEndpoint: "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-dev",
    defaultParams: { num_inference_steps: 20, guidance_scale: 7.5 },
    notes: "Higher quality than schnell — 20 steps. Use for slide visuals and posters.",
  },

  // ── Evaluation: Ideogram — excels at readable text within images ─────────

  {
    id: "ideogram-ai/ideogram-4-nf4",
    name: "Ideogram 4 NF4 (Replicate)",
    provider: "replicate",
    status: "evaluation",
    capabilities: ["image", "infographic"],
    safetyRating: "school-safe",
    license: "Commercial — Replicate pay-per-use",
    licensingNotes: "Requires REPLICATE_API_TOKEN. Best model for infographics with legible text.",
    apiEndpoint: "https://api.replicate.com/v1/models/ideogram-ai/ideogram-v3",
    envVar: "REPLICATE_API_TOKEN",
    notes: "Evaluate vs FLUX for text-heavy outputs like infographics and labelled diagrams.",
  },

  {
    id: "ideogram-ai/ideogram-4-fp8",
    name: "Ideogram 4 FP8 (Replicate)",
    provider: "replicate",
    status: "evaluation",
    capabilities: ["image", "infographic"],
    safetyRating: "school-safe",
    license: "Commercial — Replicate pay-per-use",
    licensingNotes: "Full-precision variant. Higher quality, slower and more expensive than NF4.",
    apiEndpoint: "https://api.replicate.com/v1/models/ideogram-ai/ideogram-v3",
    envVar: "REPLICATE_API_TOKEN",
    notes: "Higher quality than NF4. Use when text fidelity is critical.",
  },

  // ── Pending: Krea ───────────────────────────────────────────────────────

  {
    id: "krea/Krea-2-Raw",
    name: "Krea-2-Raw (Krea AI)",
    provider: "krea",
    status: "pending",
    capabilities: ["image"],
    safetyRating: "requires-review",
    license: "Krea AI Terms of Service",
    licensingNotes: "Requires Krea API key. Safety review required before production.",
    envVar: "KREA_API_KEY",
    notes: "High-quality image generation. Pending API availability and safety review.",
  },

  {
    id: "krea/Krea-2-Turbo",
    name: "Krea-2-Turbo (Krea AI)",
    provider: "krea",
    status: "pending",
    capabilities: ["image"],
    safetyRating: "requires-review",
    license: "Krea AI Terms of Service",
    licensingNotes: "Faster variant. Requires Krea API key and safety review.",
    envVar: "KREA_API_KEY",
    notes: "Turbo variant — faster but lower quality than Raw. Pending review.",
  },

  // ── Pending: Qwen image models ───────────────────────────────────────────

  {
    id: "Qwen/Qwen-Image",
    name: "Qwen-Image (Alibaba Cloud)",
    provider: "huggingface",
    status: "pending",
    capabilities: ["image"],
    safetyRating: "requires-review",
    license: "Qwen License",
    licensingNotes: "Verify HF Inference Provider availability and license terms before routing.",
    envVar: "HUGGINGFACE_API_KEY",
    notes: "Pending HF endpoint format verification.",
  },

  {
    id: "Qwen/Qwen-Image-2512",
    name: "Qwen-Image-2512 (Dec 2025, Alibaba)",
    provider: "huggingface",
    status: "pending",
    capabilities: ["image", "diagram"],
    safetyRating: "requires-review",
    license: "Qwen License",
    licensingNotes: "Latest Qwen image model. Pending HF Inference Router availability check.",
    envVar: "HUGGINGFACE_API_KEY",
    notes: "Dec 2025 release. Verify endpoint before routing.",
  },

  // ── Lab: BLOCKED — safety or licensing not cleared ──────────────────────

  {
    id: "SulphurAI/Sulphur-2-base",
    name: "Sulphur-2-base (SulphurAI)",
    provider: "huggingface",
    status: "lab",
    capabilities: ["image"],
    safetyRating: "requires-review",
    license: "Unknown — pending review",
    licensingNotes: "BLOCKED: License and content safety not verified.",
    envVar: "HUGGINGFACE_API_KEY",
    notes: "Lab only. Do not route school traffic here.",
  },

  {
    id: "ponpoke/flux2-klein-9b-uncensored-text-encoder",
    name: "FLUX.2 Klein 9B (uncensored encoder)",
    provider: "huggingface",
    status: "lab",
    capabilities: ["image"],
    safetyRating: "adult-only",
    license: "Unknown — pending review",
    licensingNotes: "PERMANENTLY BLOCKED: Uncensored encoder is not school-safe.",
    notes: "NEVER route school traffic here. Adult-only content risk.",
  },

  // ── Future: Video generation (pending implementation) ───────────────────

  {
    id: "zai-org/CogVideoX-5b",
    name: "CogVideoX-5b (ZAI / Replicate)",
    provider: "replicate",
    status: "pending",
    capabilities: ["video"],
    safetyRating: "school-safe",
    license: "Apache 2.0",
    licensingNotes: "Replicate hosted. Requires REPLICATE_API_TOKEN.",
    apiEndpoint: "https://api.replicate.com/v1/models/zai-org/cogvideox-5b",
    envVar: "REPLICATE_API_TOKEN",
    notes: "Future: short educational explainer clips. Implementation pending.",
  },

  {
    id: "vrgamedevgirl84/Wan14BT2VFusioniX",
    name: "Wan14BT2VFusioniX (Lab)",
    provider: "huggingface",
    status: "lab",
    capabilities: ["video"],
    safetyRating: "requires-review",
    license: "Unknown — pending review",
    licensingNotes: "BLOCKED: Safety and licensing not verified.",
    notes: "Lab only. Video generation experiment. Do not route production traffic.",
  },
];

export function getMediaModel(id: string): MediaModelEntry | undefined {
  return MEDIA_MODEL_REGISTRY.find((m) => m.id === id);
}

export function getProductionImageModels(): MediaModelEntry[] {
  return MEDIA_MODEL_REGISTRY.filter(
    (m) =>
      m.status === "production" &&
      m.capabilities.includes("image") &&
      m.safetyRating === "school-safe"
  );
}

export function isProductionSafe(modelId: string): boolean {
  const model = getMediaModel(modelId);
  return !!model && model.status === "production" && model.safetyRating === "school-safe";
}
