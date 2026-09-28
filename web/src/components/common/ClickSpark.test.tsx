import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// `useReducedMotion` reads `window.matchMedia` once, via a module-level
// listener set up on first import — overriding `window.matchMedia` inside a
// test runs too late to affect it. Mock the hook directly instead, behind a
// flag the "reduced motion" test flips before rendering.
let reducedMotionOverride = false;
vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>();
  return { ...actual, useReducedMotion: () => reducedMotionOverride };
});

const { ClickSpark } = await import('./ClickSpark');

function stubCanvasContext() {
  const ctx = {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    setTransform: vi.fn(),
    strokeStyle: '',
    lineWidth: 0,
    lineCap: 'butt',
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    ctx as unknown as CanvasRenderingContext2D,
  );
  return ctx;
}

describe('ClickSpark', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    reducedMotionOverride = false;
  });

  it('renders nothing when disabled', () => {
    stubCanvasContext();
    const { container } = render(<ClickSpark enabled={false} />);
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('renders nothing when the user prefers reduced motion', () => {
    reducedMotionOverride = true;
    stubCanvasContext();

    const { container } = render(<ClickSpark />);

    expect(container.querySelector('canvas')).toBeNull();
  });

  it('renders a fixed full-viewport canvas when enabled', () => {
    stubCanvasContext();
    const { container } = render(<ClickSpark />);

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    expect(canvas?.className).toContain('pointer-events-none');
    expect(canvas?.className).toContain('fixed');
    expect(canvas?.className).toContain('inset-0');
    expect(canvas?.className).toContain('z-[9999]');
  });

  it('draws spark lines on pointerdown without throwing', () => {
    const ctx = stubCanvasContext();
    // A mutable holder object, not a bare `let`, so TypeScript doesn't
    // narrow the captured value back to its initial `null` after the
    // opaque `render`/`dispatchEvent` calls below (a known control-flow
    // narrowing gap for closures over reassigned `let` bindings).
    const queuedFrame: { current: FrameRequestCallback | null } = { current: null };
    const rafSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        queuedFrame.current = cb;
        return 0;
      });

    render(<ClickSpark />);
    window.dispatchEvent(new PointerEvent('pointerdown', { clientX: 5, clientY: 5 }));
    // The pointerdown handler schedules exactly one frame; run it manually
    // instead of letting the mock auto-recurse (which would never terminate,
    // since progress never reaches 1 within a synchronous test).
    queuedFrame.current?.(0);

    expect(ctx.stroke).toHaveBeenCalled();
    rafSpy.mockRestore();
  });
});
