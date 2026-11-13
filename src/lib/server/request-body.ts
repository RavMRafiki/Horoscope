export type ReadJsonResult =
  | { ok: true; data: unknown }
  | { ok: false; status: 400 | 413; error: string };

export async function readJsonWithLimit(
  request: Request,
  maxBytes: number,
): Promise<ReadJsonResult> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const declared = Number(contentLength);
    if (!Number.isFinite(declared) || declared > maxBytes) {
      return { ok: false, status: 413, error: "Payload too large." };
    }
  }

  if (!request.body) {
    return { ok: false, status: 400, error: "Request body is required." };
  }

  let reader: ReadableStreamDefaultReader<Uint8Array>;
  try {
    reader = request.body.getReader();
  } catch {
    return { ok: false, status: 400, error: "Unable to read request body." };
  }
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, status: 413, error: "Payload too large." };
      }
      chunks.push(value);
    }
  } catch {
    await reader.cancel().catch(() => undefined);
    return { ok: false, status: 400, error: "Unable to read request body." };
  }

  const buffer = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { ok: true, data: JSON.parse(new TextDecoder().decode(buffer)) };
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON body." };
  }
}
