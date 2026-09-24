// Phase 3 contract only. No paid model is called in Phase 1.
export type RecognitionRequest = {
  imageId: string;
  subjectId?: string;
  mode: "classify" | "first_step" | "hints" | "solution";
};
export type RecognitionResult = {
  subjectId: string;
  chapterId?: string;
  sopIds: string[];
  confidence: number;
  hints: string[];
};
