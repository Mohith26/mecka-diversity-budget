// Task family = first token of the task label, stemmed, so folding_clothes and fold_clothes
// land in the same family ("fold"), cleaning_shoes and cleaning_parts in "clean".
export function stem(task) {
  const w = String(task || '').toLowerCase().trim().split(/[_\s-]+/)[0];
  if (w.endsWith('ing') && w.length > 5) {
    let s = w.slice(0, -3);
    if (s.length > 2 && s.at(-1) === s.at(-2) && !'lsz'.includes(s.at(-1))) s = s.slice(0, -1);
    return s;
  }
  return w;
}
