// 풀이 기록(attempts)으로부터 개념별 상태·복습·오개념·요약을 계산
// 적응형 숙련도 공식(리포트 기반):
//   mastery = 0.45*최근가중정답률 + 0.20*풀이속도 + 0.15*전이 + 0.10*무힌트 + 0.10*망각보정

const INTERVAL_DAYS = [0, 1, 3, 7, 14, 30]; // Leitner 박스 → 복습 간격(일)
const DAY = 86400000;
const FAST = 3000, SLOW = 20000; // 풀이속도 정규화 기준(ms)
const clamp = (x) => Math.max(0, Math.min(1, x));

export function termStates(attempts) {
  const sorted = attempts.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const byTerm = {};
  for (const a of sorted) {
    const t = byTerm[a.term_id] || (byTerm[a.term_id] = { term_id: a.term_id, term_name: a.term_name, list: [] });
    t.list.push(a);
  }
  const now = Date.now();
  for (const t of Object.values(byTerm)) {
    const L = t.list;
    let box = 0, correct = 0, lastCorrect = null;
    const modesCorrect = new Set();
    let wsum = 0, wacc = 0, latN = 0, latScore = 0, noHint = 0;
    L.forEach((a, i) => {
      const w = Math.pow(1.6, i);          // 최근 시도일수록 큰 가중치
      wsum += w; if (a.correct) wacc += w;
      if (a.correct) { correct++; box = Math.min(5, box + 1); lastCorrect = a.created_at; modesCorrect.add(a.mode); }
      else box = 0;
      if (a.correct && a.latency_ms != null) { latN++; latScore += clamp(1 - (a.latency_ms - FAST) / (SLOW - FAST)); }
      if (!a.hint_used) noHint++;
    });
    const total = L.length;
    const lastSeen = L[L.length - 1].created_at;
    const recentAcc = wsum ? wacc / wsum : 0;
    const latency = latN ? latScore / latN : 0.7;            // 기록 없으면 중립값
    const transfer = Math.min(1, modesCorrect.size / 2);     // 2개 형식 이상 정답 → 만점
    const hintInv = total ? noHint / total : 1;
    const interval = INTERVAL_DAYS[box] * DAY;
    const elapsed = now - new Date(lastSeen).getTime();
    const forgetting = box === 0 ? 0.3 : clamp(1 - elapsed / (interval || DAY));
    const mastery = Math.round(100 * (0.45 * recentAcc + 0.20 * latency + 0.15 * transfer + 0.10 * hintInv + 0.10 * forgetting));
    Object.assign(t, {
      box, total, correct, lastSeen, lastCorrect,
      acc: total ? correct / total : 0,
      recentAcc, latency, transfer, mastery,
      due: now >= new Date(lastSeen).getTime() + interval,
    });
    delete t.list;
  }
  return byTerm;
}

export function dueTermIds(states) {
  return Object.values(states).filter((t) => t.due).sort((a, b) => a.mastery - b.mastery).map((t) => t.term_id);
}
export function weakTerms(states, n = 12) {
  return Object.values(states).sort((a, b) => a.mastery - b.mastery).slice(0, n);
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
  const mastered = arr.filter((t) => t.mastery >= 80).length;
  const due = arr.filter((t) => t.due).length;
  const acc = arr.length ? Math.round(arr.reduce((s, t) => s + t.acc, 0) / arr.length * 100) : 0;
  return { seen: arr.length, mastered, due, acc };
}
export function recentWrong(attempts) {
  const seen = new Set(), out = [];
  for (const a of attempts.slice().sort((x, y) => new Date(y.created_at) - new Date(x.created_at))) {
    if (!a.correct && !seen.has(a.term_id)) { seen.add(a.term_id); out.push(a); }
  }
  return out;
}
// 개념별 정답률(히트맵용)
export function conceptAccuracy(attempts) {
  const m = {};
  for (const a of attempts) {
    const t = m[a.term_id] || (m[a.term_id] = { term_id: a.term_id, term_name: a.term_name, total: 0, correct: 0 });
    t.total++; if (a.correct) t.correct++;
  }
  for (const t of Object.values(m)) t.acc = t.correct / t.total;
  return m;
}
