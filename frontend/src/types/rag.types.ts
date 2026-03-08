export interface RagResponse {
  answer: string;
  sources?: string[];
}

export type RagApiResponse = RagResponse | string;
