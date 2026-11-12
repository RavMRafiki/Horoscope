export type ReadJsonResult =
  | { ok: true; data: unknown }
  | { ok: false; status: 413; error: string };

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
    return { ok: false, status: 413, error: "Payload too large." };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      return { ok: false, status: 413, error: "Payload too large." };
    }
    chunks.push(value);
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
    return { ok: true, data: null };
  }
}
