type PerformanceMemory = {
  usedJSHeapSize?: number;
};

type PerformanceWithMemory = Performance & {
  memory?: PerformanceMemory;
};

type PhaseRecord = {
  durationMs: number;
  heapBytes?: number;
};

/**
 * Lightweight development-only timing for the EPUB pipelines. The tracker is
 * intentionally inert in production and only samples heap usage when the
 * runtime exposes the non-standard Performance.memory API.
 */
export class EpubPerformanceTracker {
  private readonly enabled = __DEV__ && process.env.NODE_ENV !== 'test';
  private readonly phases: Record<string, PhaseRecord> = {};
  private phaseName?: string;
  private phaseStartedAt = 0;
  private peakHeapBytes = 0;
  private readonly startedAt: number;

  constructor(private readonly operation: 'import' | 'export') {
    this.startedAt = this.now();
    this.sampleHeap();
  }

  startPhase(name: string) {
    if (!this.enabled) return;
    this.endPhase();
    this.phaseName = name;
    this.phaseStartedAt = this.now();
    this.sampleHeap();
  }

  endPhase() {
    if (!this.enabled || !this.phaseName) return;
    this.sampleHeap();
    this.phases[this.phaseName] = {
      durationMs: Math.round((this.now() - this.phaseStartedAt) * 100) / 100,
      ...(this.peakHeapBytes > 0 ? { heapBytes: this.peakHeapBytes } : {}),
    };
    this.phaseName = undefined;
  }

  finish(details: Record<string, number | string | boolean | undefined> = {}) {
    if (!this.enabled) return;
    this.endPhase();
    this.sampleHeap();
    console.info(`[EPUB performance] ${this.operation}`, {
      totalMs: Math.round((this.now() - this.startedAt) * 100) / 100,
      peakJsHeapBytes: this.peakHeapBytes || undefined,
      phases: this.phases,
      ...details,
    });
  }

  private now() {
    return globalThis.performance?.now?.() ?? Date.now();
  }

  private sampleHeap() {
    const performance = globalThis.performance as
      | PerformanceWithMemory
      | undefined;
    const heapBytes = performance?.memory?.usedJSHeapSize;
    if (typeof heapBytes === 'number') {
      this.peakHeapBytes = Math.max(this.peakHeapBytes, heapBytes);
    }
  }
}
