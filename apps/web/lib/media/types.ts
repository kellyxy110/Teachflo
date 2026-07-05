export type MediaTask =
  | "lesson_diagram"
  | "exam_diagram"
  | "slide_visual"
  | "flashcard_image"
  | "infographic"
  | "poster"
  | "worksheet_figure"
  | "video_clip";

export type MediaStyle =
  | "diagram"
  | "realistic"
  | "minimal"
  | "infographic"
  | "worksheet"
  | "slide"
  | "poster";

export type MediaProvider    = "huggingface" | "replicate" | "krea" | "fal";
export type MediaModelStatus = "production" | "evaluation" | "pending" | "lab" | "rejected";
export type MediaCapability  = "image" | "video" | "diagram" | "infographic";

export interface GenerateMediaInput {
  task: MediaTask;
  prompt: string;
  subject?: string;
  topic?: string;
  classLevel?: string;
  style?: MediaStyle;
  aspectRatio?: "1:1" | "4:3" | "16:9" | "9:16" | "A4";
  labels?: string[];
  colorScheme?: "color" | "bw" | "blueprint";
  safetyLevel?: "strict" | "standard";
  modelOverride?: string;
}

export interface GenerateMediaOutput {
  assetUrl: string;
  modelUsed: string;
  provider: MediaProvider;
  promptUsed: string;
  safetyStatus: "passed" | "blocked";
  generationTimeMs: number;
  metadata: {
    width?: number;
    height?: number;
    aspectRatio?: string;
    mimeType?: string;
    fileSizeBytes?: number;
  };
}

export interface MediaModelEntry {
  id: string;
  name: string;
  provider: MediaProvider;
  status: MediaModelStatus;
  capabilities: MediaCapability[];
  safetyRating: "school-safe" | "requires-review" | "adult-only";
  license: string;
  licensingNotes?: string;
  apiEndpoint?: string;
  envVar?: string;
  defaultParams?: Record<string, unknown>;
  notes?: string;
}
