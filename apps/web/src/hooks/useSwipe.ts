import { useEffect } from 'react';

interface Handlers {
  /** ডান থেকে বামে স্লাইড: শুরু / পরের জন */
  onLeft: () => void;
  /** বাম থেকে ডানে স্লাইড: থামা */
  onRight: () => void;
  disabled?: boolean;
}

const IGNORE_SELECTOR = 'input, textarea, select, [data-no-swipe], .sheet-backdrop';
const MIN_DISTANCE = 70;

/**
 * পুরো স্ক্রিনের যেকোনো জায়গায় স্লাইড (টাচ বা মাউস-ড্র্যাগ)। কিবোর্ডে ← / → ও কাজ করে।
 * ইনপুট, ড্রপডাউন ও রিপোর্ট শিটের ওপর শুরু হওয়া স্লাইড উপেক্ষা করা হয়।
 */
export function useSwipe({ onLeft, onRight, disabled }: Handlers): void {
  useEffect(() => {
    if (disabled) return;
    let start: { x: number; y: number } | null = null;

    const shouldIgnore = (target: EventTarget | null): boolean =>
      target instanceof Element && target.closest(IGNORE_SELECTOR) !== null;

    const down = (e: PointerEvent) => {
      start = e.isPrimary && !shouldIgnore(e.target) ? { x: e.clientX, y: e.clientY } : null;
    };
    const up = (e: PointerEvent) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      start = null;
      if (Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.4) return;
      if (dx < 0) onLeft();
      else onRight();
    };
    const cancel = () => {
      start = null;
    };
    const key = (e: KeyboardEvent) => {
      if (shouldIgnore(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowLeft') onLeft();
      else if (e.key === 'ArrowRight') onRight();
    };

    window.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', key);
    };
  }, [onLeft, onRight, disabled]);
}
