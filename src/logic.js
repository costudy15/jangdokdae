// 시도 기록(attempts)으로부터 개념별 상태·복습대상·오개념·요약을 계산

const INTERVAL_DAYS = [0, 1, 3, 7, 14, 30]; // Leitner 박스 → 복습 간격(일)
const DAY = 86400000;

export function termStates(attempts) {
  const sorted = attempts.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const byTerm = {};
  for (const a of sorted) {
    const t = byTerm[a.term_id] || (byTerm[a.term_id] = { term_id: a.term_id, term_name: a.term_name, box: 0, total: 0, correct: 0, lastSeen: null });
    t.total++;
    if (a.correct) { t.correct++; t.box = Math.min(5, t.box + 1); } else { t.box = 0; }
    t.lastSeen = a.created_at;
  }
  const now = Date.now();
  for (const t of Object.values(byTerm)) {
    const dueAt = new Date(t.lastSeen).getTime() + INTERVAL_DAYS[t.box] * DAY;
    t.due = now >= dueAt;
    t.acc = t.total ? t.correct / t.total : 0;
    t.mastery = Math.round((0.6 * (t.box / 5) + 0.4 * t.acc) * 100);
  }
  return byTerm;
}

export function dueTermIds(states) {
  return Object.values(states).filter((t) => t.due).sort((a, b) => a.mastery - b.mastery).map((t) => t.term_id);
}

export function weakTerms(states, n = 20) {
  return Object.values(states).filter((t) => t.box <= 1).sort((a, b) => a.mastery - b.mastery).slice(0, n);
}

export function confusionPairs(attempts) {
  const m = {};
  for (const a of attempts) if (!a.correct && a.picked_term) {
    const k = a.term_name + " → " + a.picked_term;
    m[k] = (m[k] || 0) + 1;
  }
  return Object.entries(m).sort((x, y) => y[1] - x[1]).map(([pair, n]) => ({ pair, n }));
}

export function summary(states) {
  const arr = Object.values(states);
  const mastered = arr.filter((t) => t.box >= 4).length;
  const due = arr.filter((t) => t.due).length;
  const acc = arr.length ? Math.round(arr.reduce((s, t) => s + t.acc, 0) / arr.length * 100) : 0;
  return { seen: arr.length, mastered, due, acc };
}

// 최근 틀린 개념(중복 제거, 최신순) — 오답노트용
export function recentWrong(attempts) {
  const seen = new Set();
  const out = [];
  for (const a of attempts.slice().sort((x, y) => new Date(y.created_at) - new Date(x.created_at))) {
    if (!a.correct && !seen.has(a.term_id)) { seen.add(a.term_id); out.push(a); }
  }
  return out;
}
