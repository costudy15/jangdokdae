import raw from "./data/concepts.json";

export const GROUP_OF = (area) => (["화법", "작문", "독서"].includes(area) ? "화법·작문·독서" : area);
export const GROUPS = ["시", "소설", "고전문학", "문법", "화법·작문·독서"];

export const CONCEPTS = raw.map((c) => ({ ...c, group: GROUP_OF(c.area) }));
export const BY_ID = Object.fromEntries(CONCEPTS.map((c) => [c.id, c]));

export function subsOf(group) {
  const out = [];
  for (const c of CONCEPTS) if (c.group === group && !out.includes(c.sub)) out.push(c.sub);
  return out;
}
export function inScope(group, sub, level) {
  return CONCEPTS.filter((c) =>
    (!group || c.group === group) && (!sub || c.sub === sub) && (!level || c.level === level)
  );
}

function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// 변별 문제: 정의 → 개념어 고르기. 오답은 '관련 개념' 우선, 부족하면 같은 소분류 → 같은 영역에서.
export function buildDiscrimination(concept) {
  const distract = [];
  for (const r of concept.related) if (r !== concept.term && !distract.includes(r)) distract.push(r);
  const fill = (pool) => { for (const t of shuffle(pool)) { if (distract.length >= 3) break; if (t !== concept.term && !distract.includes(t)) distract.push(t); } };
  if (distract.length < 3) fill(inScope(concept.group, concept.sub).map((c) => c.term));
  if (distract.length < 3) fill(inScope(concept.group).map((c) => c.term));
  const options = shuffle([concept.term, ...distract.slice(0, 3)]);
  return {
    mode: "구별",
    term_id: concept.id,
    term_name: concept.term,
    prompt: `다음 설명에 해당하는 개념은?\n\n“${concept.def}”`,
    options,
    answer: options.indexOf(concept.term),
    explanation: `${concept.term} — ${concept.def}` + (concept.point ? `\n출제 포인트: ${concept.point}` : ""),
  };
}

// 무작위 변별 세트
export function quizSet(scopeConcepts, n = 8) {
  return shuffle(scopeConcepts).slice(0, n).map(buildDiscrimination);
}
