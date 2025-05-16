declare module 'canvas-confetti' {
  interface ConfettiOptions {
    particleCount?: number;
    angle?: number;
    spread?: number;
    startVelocity?: number;
    decay?: number;
    gravity?: number;
    drift?: number;
    ticks?: number;
    origin?: {
      x?: number;
      y?: number;
    };
    colors?: string[];
    shapes?: string[];
    scalar?: number;
    zIndex?: number;
    disableForReducedMotion?: boolean;
  }

  interface ConfettiCannon {
    reset: () => void;
    fire: () => void;
  }

  interface ConfettiFunction {
    (options?: ConfettiOptions): Promise<null>;
    reset: () => void;
    create: (canvas: HTMLCanvasElement, options?: { resize?: boolean }) => ConfettiFunction;
    createCanvas: (options?: { resize?: boolean }) => HTMLCanvasElement;
  }

  const confetti: ConfettiFunction;
  export default confetti;
}