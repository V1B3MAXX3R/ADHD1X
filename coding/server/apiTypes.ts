// The few parts of a Vercel request and response that the Gemini endpoint uses. Written here instead of
// importing @vercel/node, which only provides these names but brings many dependencies (and security
// warnings) with it. Vercel supplies the real objects when the function runs.
export interface ApiRequest {
  method?: string;
  query: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  socket?: { remoteAddress?: string };
}

export interface ApiResponse {
  setHeader(name: string, value: string): unknown;
  status(code: number): ApiResponse;
  json(payload: unknown): unknown;
}
