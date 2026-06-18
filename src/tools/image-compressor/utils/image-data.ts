export function toArrayBuffer(input: Uint8Array): ArrayBuffer {
  return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength) as ArrayBuffer;
}
