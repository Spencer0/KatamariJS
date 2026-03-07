import type { InputState } from '../game/types';

interface Vec2 {
  x: number;
  y: number;
}

function clampUnit(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

export function normalizeVector(input: Vec2): Vec2 {
  const length = Math.hypot(input.x, input.y);
  if (length <= 1) {
    return input;
  }

  return {
    x: input.x / length,
    y: input.y / length,
  };
}

export class InputSystem {
  private keys = new Set<string>();
  private touchLeft: Vec2 = { x: 0, y: 0 };
  private touchRight: Vec2 = { x: 0, y: 0 };
  private leftTouchId: number | null = null;
  private rightTouchId: number | null = null;

  constructor(private readonly element: HTMLElement) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.element.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.element.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.element.addEventListener('touchend', this.onTouchEnd, { passive: false });
    this.element.addEventListener('touchcancel', this.onTouchEnd, { passive: false });
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.element.removeEventListener('touchstart', this.onTouchStart);
    this.element.removeEventListener('touchmove', this.onTouchMove);
    this.element.removeEventListener('touchend', this.onTouchEnd);
    this.element.removeEventListener('touchcancel', this.onTouchEnd);
  }

  update(input: InputState): void {
    const keyboardLeft = normalizeVector({
      x: this.axis(['KeyD']) - this.axis(['KeyA']),
      y: this.axis(['KeyW']) - this.axis(['KeyS']),
    });
    const keyboardRight = normalizeVector({
      x: this.axis(['ArrowRight']) - this.axis(['ArrowLeft']),
      y: this.axis(['ArrowUp']) - this.axis(['ArrowDown']),
    });

    const pad = this.gamepadSticks();

    const left = normalizeVector({
      x: clampUnit(keyboardLeft.x + this.touchLeft.x + pad.left.x),
      y: clampUnit(keyboardLeft.y + this.touchLeft.y + pad.left.y),
    });
    const right = normalizeVector({
      x: clampUnit(keyboardRight.x + this.touchRight.x + pad.right.x),
      y: clampUnit(keyboardRight.y + this.touchRight.y + pad.right.y),
    });

    input.leftStickX = left.x;
    input.leftStickY = left.y;
    input.rightStickX = right.x;
    input.rightStickY = right.y;
    input.moveX = clampUnit((left.x + right.x) * 0.5);
    input.moveY = clampUnit((left.y + right.y) * 0.5);
    input.cameraX = 0;
    input.cameraY = 0;
    input.boost = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.gamepadBoost();
  }

  private axis(codes: string[]): number {
    return codes.some((code) => this.keys.has(code)) ? 1 : 0;
  }

  private gamepadSticks(): { left: Vec2; right: Vec2 } {
    const gamepad = navigator.getGamepads?.()[0];
    if (!gamepad) {
      return {
        left: { x: 0, y: 0 },
        right: { x: 0, y: 0 },
      };
    }

    return {
      left: {
        x: clampUnit(gamepad.axes[0] ?? 0),
        y: clampUnit(-(gamepad.axes[1] ?? 0)),
      },
      right: {
        x: clampUnit(gamepad.axes[2] ?? 0),
        y: clampUnit(-(gamepad.axes[3] ?? 0)),
      },
    };
  }

  private gamepadBoost(): boolean {
    const gamepad = navigator.getGamepads?.()[0];
    return Boolean(gamepad?.buttons[0]?.pressed);
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    this.keys.add(event.code);
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private onTouchStart = (event: TouchEvent): void => {
    event.preventDefault();
    for (const touch of Array.from(event.changedTouches)) {
      if (touch.clientX < window.innerWidth * 0.5 && this.leftTouchId === null) {
        this.leftTouchId = touch.identifier;
      } else if (this.rightTouchId === null) {
        this.rightTouchId = touch.identifier;
      }
    }
  };

  private onTouchMove = (event: TouchEvent): void => {
    event.preventDefault();
    for (const touch of Array.from(event.touches)) {
      if (touch.identifier === this.leftTouchId) {
        const x = (touch.clientX / (window.innerWidth * 0.5)) * 2 - 1;
        const y = (touch.clientY / window.innerHeight) * 2 - 1;
        this.touchLeft = normalizeVector({ x: clampUnit(x), y: clampUnit(-y) });
      }

      if (touch.identifier === this.rightTouchId) {
        const x = (touch.clientX - window.innerWidth * 0.5) / (window.innerWidth * 0.5);
        const y = touch.clientY / window.innerHeight;
        this.touchRight = normalizeVector({
          x: clampUnit(x),
          y: clampUnit(-((y * 2) - 1)),
        });
      }
    }
  };

  private onTouchEnd = (event: TouchEvent): void => {
    event.preventDefault();
    for (const touch of Array.from(event.changedTouches)) {
      if (touch.identifier === this.leftTouchId) {
        this.leftTouchId = null;
        this.touchLeft = { x: 0, y: 0 };
      }

      if (touch.identifier === this.rightTouchId) {
        this.rightTouchId = null;
        this.touchRight = { x: 0, y: 0 };
      }
    }
  };
}
