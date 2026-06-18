import type { CompressWorkerRequest, CompressWorkerResponse } from "../types";

type QueueTask = {
  request: CompressWorkerRequest;
  resolve: (response: CompressWorkerResponse) => void;
  reject: (error: Error) => void;
};

export class CompressWorkerPool {
  private readonly concurrency: number;
  private readonly queue: QueueTask[] = [];
  private active = 0;

  constructor(concurrency = 2) {
    this.concurrency = concurrency;
  }

  run(request: CompressWorkerRequest): Promise<CompressWorkerResponse> {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject });
      this.drain();
    });
  }

  private drain() {
    while (this.active < this.concurrency && this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) this.start(task);
    }
  }

  private start(task: QueueTask) {
    this.active += 1;
    const worker = new Worker(new URL("./compress.worker.ts", import.meta.url), { type: "module" });
    const cleanup = () => {
      worker.terminate();
      this.active -= 1;
      this.drain();
    };

    worker.onmessage = (event: MessageEvent<CompressWorkerResponse>) => {
      task.resolve(event.data);
      cleanup();
    };
    worker.onerror = event => {
      task.reject(new Error(event.message || "Worker failed"));
      cleanup();
    };
    worker.postMessage(task.request, [task.request.buffer]);
  }
}
