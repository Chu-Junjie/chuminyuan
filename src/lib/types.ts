export type Subject = {
  id: string;
  name: string;
  symbol: string;
  description: string;
  status: "open" | "building";
};
export type Chapter = {
  id: string;
  title: string;
  subject_id: string;
  sort_order: number;
};
export type Block = {
  type: "paragraph" | "table" | "markdown";
  text: string;
  style?: string;
  rows?: string[][];
  sourceIndex: number;
  omml?: string[];
};
export type SopSummary = {
  id: string;
  code: string;
  title: string;
  chapter_id: string;
  chapter: string;
  frequency: number;
  keywords: string[];
  brain_first: string;
  sort_order: number;
};
export type Sop = SopSummary & {
  blocks: Block[];
  sections: { id: string; title: string; blocks: Block[] }[];
};
export type Mastery = "seen" | "can" | "fluent";
export type MistakeStatus = "unsolved" | "hinted" | "solved";
export type ImageKind =
  "question" | "wrong_work" | "teacher_solution" | "other";
export type Attachment = {
  id: string;
  kind: ImageKind;
  name: string;
  mime: string;
  originalId?: string;
};
export type Mistake = {
  id: string;
  title: string;
  subject: string;
  chapter: string;
  sopId: string;
  source: string;
  date: string;
  tags: string[];
  question: string;
  stuck: string;
  reason: string;
  reaction: string;
  understanding: string;
  status: MistakeStatus;
  images: Attachment[];
  createdAt: string;
  updatedAt: string;
};
export type Review = {
  id: string;
  mistakeId: string;
  result: MistakeStatus;
  hintCount: number;
  reviewedAt: string;
};
export type Settings = {
  name: string;
  theme: "light" | "dark";
  accent: string;
  backgroundId?: string;
};
export type Records = {
  progress: {
    sopId: string;
    status: Mastery;
    position: number;
    visitedAt: string;
  };
  notes: { sopId: string; text: string };
  bookmarks: { sopId: string; folder: string };
  folders: { name: string };
  mistakes: Mistake;
  reviews: Review;
  settings: Settings;
};
export type RecordKind = keyof Records;
export type Entry<K extends RecordKind = RecordKind> = {
  key: string;
  scope: string;
  kind: K;
  id: string;
  data: Records[K];
  updatedAt: string;
  revision: string;
  syncedRevision?: string;
  dirty: boolean;
  deleted: boolean;
};
