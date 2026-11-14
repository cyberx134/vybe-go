export type IconShape =
  | { kind: 'path'; d: string }
  | { kind: 'circle'; cx: number; cy: number; r: number };

export interface IconDef {
  shapes: readonly IconShape[];
  /** ডেমোতে ব্যবহৃত stroke width (ডিফল্ট 1.8) */
  strokeWidth?: number;
}

const p = (d: string): IconShape => ({ kind: 'path', d });
const c = (cx: number, cy: number, r: number): IconShape => ({ kind: 'circle', cx, cy, r });

/** ২৪×২৪ viewBox, stroke-only লাইন আইকন — ডেমোর আইকনগুলো হুবহু, বাকিগুলো একই স্টাইলে। */
export const ICONS = {
  chat: { shapes: [p('M20 11.5a7.5 7.5 0 0 1-8 7.5 8.5 8.5 0 0 1-3.8-.9L4 20l1.2-3.5A7.2 7.2 0 0 1 4 12c0-4.2 3.6-7.5 8-7.5s8 2.8 8 7Z'), p('M8 12h.01M12 12h.01M16 12h.01')] },
  cameraSwitch: { shapes: [p('M14 5h-4l-2 3H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-3z'), c(12, 14, 3.2), p('M18 3v3m-2-1.5h4')] },
  close: { shapes: [p('m6 6 12 12M18 6 6 18')] },
  send: { shapes: [p('m22 2-7 20-4-9-9-4Z'), p('M22 2 11 13')] },
  user: { shapes: [c(12, 8, 3.5), p('M5 20c.6-4 3-6 7-6s6.4 2 7 6')], strokeWidth: 1.7 },
  gender: { shapes: [c(10, 14, 5), p('m14 10 6-6m-5 0h5v5')] },
  globe: { shapes: [c(12, 12, 9), p('M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18')] },
  play: { shapes: [p('m9 5 10 7-10 7z')] },
  end: { shapes: [p('M5 5l14 14M19 5 5 19')] },
  next: { shapes: [p('m5 5 9 7-9 7z'), p('M19 5v14')] },
  mic: { shapes: [p('M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z'), p('M19 11a7 7 0 0 1-14 0'), p('M12 18v3')] },
  micOff: { shapes: [p('M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z'), p('M19 11a7 7 0 0 1-14 0'), p('M12 18v3'), p('M4 4l16 16')] },
  flag: { shapes: [p('M5 21V4'), p('M5 4h11l-1.8 4L16 12H5')] },
  eye: { shapes: [p('M2.6 12C3.5 10.2 7 6 12 6s8.5 4.2 9.4 6c-.9 1.8-4.4 6-9.4 6S3.5 13.8 2.6 12Z'), c(12, 12, 3)] },
  eyeOff: { shapes: [p('M3 3l18 18'), p('M10.6 6.2A9.6 9.6 0 0 1 12 6c5 0 8.5 4.2 9.4 6a11.6 11.6 0 0 1-2.5 3.2'), p('M6.4 7.9A11.6 11.6 0 0 0 2.6 12c.9 1.8 4.4 6 9.4 6a9.5 9.5 0 0 0 3.2-.6'), p('M9.9 9.9a3 3 0 0 0 4.2 4.2')] },
  shield: { shapes: [p('M12 3l8 3v6c0 4.5-3.3 8-8 9-4.7-1-8-4.5-8-9V6z'), p('m9 12 2 2 4-4')] },
  check: { shapes: [p('m5 12 5 5 9-10')] },
  block: { shapes: [c(12, 12, 9), p('M5.6 5.6l12.8 12.8')] },
} as const satisfies Record<string, IconDef>;

export type IconName = keyof typeof ICONS;
