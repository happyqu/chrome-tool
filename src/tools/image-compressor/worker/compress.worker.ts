import { compressImageBest } from "../core/compress";
import type { CompressWorkerRequest } from "../types";

const workerSelf = self as unknown as {
  onmessage: ((event: MessageEvent<CompressWorkerRequest>) => void) | null;
  postMessage(message: unknown, transfer?: Transferable[]): void;
};

workerSelf.onmessage = async (event: MessageEvent<CompressWorkerRequest>) => {
  const { id, fileName, mimeType, buffer, mode, allowConvertToWebp, allowKeepOriginal, targetWidth, targetHeight } = event.data;

  try {
    const input = new Uint8Array(buffer);
    const result = await compressImageBest(input, {
      mimeType,
      mode,
      allowConvertToWebp,
      allowKeepOriginal,
      targetWidth,
      targetHeight
    });

    workerSelf.postMessage(
      {
        id,
        ok: true,
        fileName,
        result
      },
      [result.buffer]
    );
  } catch (error) {
    workerSelf.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : "Compress failed"
    });
  }
};
