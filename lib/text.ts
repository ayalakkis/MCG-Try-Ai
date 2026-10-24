/**
 * Clean truncation for designed slots: cut at a word boundary, never mid-word,
 * and drop dangling punctuation. Sentences get an ellipsis; labels don't.
 */
export function fit(text: string, max: number, { ellipsis = false } = {}): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  const room = ellipsis ? max - 1 : max;
  let cut = t.slice(0, room);
  const space = cut.lastIndexOf(" ");
  if (space > room * 0.5) cut = cut.slice(0, space);
  cut = cut.replace(/[\s,،;:–—-]+$/u, "");
  return ellipsis ? `${cut}…` : cut;
}

export const tooLong = (text: string, max: number) => text.trim().length > max;
