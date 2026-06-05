import React, { useState, useEffect, useMemo } from "react";
import { C, Lv, Loading } from "./ui.jsx";
import { GROUPS, GROUP_OF, subsOf, inScope, quizSet, buildDiscrimination, BY_ID } from "./concepts";
import { termStates, summary, dueTermIds, weakTerms, recentWrong, confusionPairs, conceptAccuracy } from "./logic";
import * as db from "./lib/supabase";

/* ── AI 호출 ── */
async function callClaude(system, user) {
  const r = await fetch("/api/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system, user }) });
  const d = await r.json();
  if (d.error) throw new Error(d.error);
  return (d.text || "").replace(/```json|```/g, "").trim();
}
function parseJSON(raw) {
  try { return JSON.parse(raw); } catch (e) {}
  const a = raw.indexOf("{"), b = raw.lastIndexOf("}");
  if (a !== -1 && b > a) return JSON.parse(raw.slice(a, b + 1));
  throw new Error("parse");
}

/* ════════ 공통 퀴즈러너 ════════ */
function QuizRunner({ questions, record, onDone }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [wrong, setWrong] = useState(0);
  const [start, setStart] = useState(() => Date.now());
  useEffect(() => { setStart(Date.now()); }, [i]);
  const q = questions[i];
  function choose(idx) {
    if (picked !== null) return;
    setPicked(idx);
    const correct = idx === q.answer;
    if (!correct) setWrong((w) => w + 1);
    record({ mode: q.mode, term_id: q.term_id, term_name: q.term_name, correct, picked_term: correct ? null : q.options[idx], latency_ms: Date.now() - start });
  }
  function next() { if (i + 1 < questions.length) { setI(i + 1); setPicked(null); } else onDone(questions.length - wrong, questions.length); }
  return (
    <div className="card">
      <div className="prog">문제 {i + 1} / {questions.length}</div>
      <div className="q">{q.prompt}</div>
      {q.options.map((op, idx) => {
        let cls = "opt";
        if (picked !== null) { if (idx === q.answer) cls += " right"; else if (idx === picked) cls += " wrong"; }
        return <button key={idx} className={cls} onClick={() => choose(idx)}>{op}</button>;
      })}
      {picked !== null && (
        <div className="exp">
          <b style={{ color: picked === q.answer ? C.green : "#B41E1A" }}>{picked === q.answer ? "정답입니다 ✓" : "오답이에요"}</b>{"\n"}{q.explanation}
          <button className="btn btn-pri" style={{ marginTop: 12 }} onClick={next}>{i + 1 < questions.length ? "다음 →" : "결과 보기 →"}</button>
        </div>
      )}
    </div>
  );
}
function Done({ score, total, onAgain, againLabel }) {
  return (
    <div className="card done">
      <div className="donen">{score} <span className="muted" style={{ fontSize: 18 }}>/ {total}</span></div>
      <div className="muted" style={{ margin: "6px 0 16px" }}>{score === total ? "완벽해요! 🎉" : `틀린 ${total - score}문제는 복습·오답노트에 반영됐어요.`}</div>
      <button className="btn btn-out" onClick={onAgain}>{againLabel}</button>
    </div>
  );
}

/* ════════ 학습 (개념 카드) ════════ */
export function Learn() {
  const [g, setG] = useState(GROUPS[0]);
  const [sub, setSub] = useState(null);
  const [lv, setLv] = useState(null);
  const [open, setOpen] = useState({});
  const subs = useMemo(() => subsOf(g), [g]);
  const list = useMemo(() => inScope(g, sub, lv), [g, sub, lv]);
  return (
    <div>
      <h1 className="h1">개념 학습</h1>
      <div className="chips">{GROUPS.map((x) => <button key={x} className={"catchip" + (g === x ? " on" : "")} onClick={() => { setG(x); setSub(null); }}>{x}</button>)}</div>
      <div className="chips">
        <button className={"chip" + (sub === null ? " on" : "")} onClick={() => setSub(null)}>전체 소분류</button>
        {subs.map((x) => <button key={x} className={"chip" + (sub === x ? " on" : "")} onClick={() => setSub(x)}>{x}</button>)}
      </div>
      <div className="chips">
        {[["", "난이도 전체"], ["low", "하"], ["mid", "중"], ["high", "상"]].map(([v, l]) => (
          <button key={l} className={"chip ind" + ((lv || "") === v ? " on" : "")} onClick={() => setLv(v || null)}>{l}</button>
        ))}
      </div>
      <div className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>{list.length}개 개념</div>
      {list.map((c) => (
        <div key={c.id} className="ccard">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setOpen((o) => ({ ...o, [c.id]: !o[c.id] }))}>
            <div><span className="cterm">{c.term}</span> <span className="csub">· {c.sub}</span></div>
            <Lv level={c.level} />
          </div>
          {open[c.id] ? (
            <>
              <div className="cdef">{c.def}</div>
              {c.ex && <div className="cex">예) {c.ex}</div>}
              {c.point && <div className="cpoint">출제 포인트 — {c.point}</div>}
              {c.related.length > 0 && <div className="crel">{c.related.map((r, k) => <span key={k} className="tag">{r}</span>)}</div>}
            </>
          ) : <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>탭하여 정의 보기</div>}
        </div>
      ))}
    </div>
  );
}

/* ════════ 문제 (변별 + AI 적용·해석) ════════ */
export function Quiz({ me, record }) {
  const [tab, setTab] = useState("변별");
  return (
    <div>
      <h1 className="h1">문제 풀기</h1>
      <div className="chips">
        {["변별", "AI 적용·해석"].map((t) => <button key={t} className={"catchip" + (tab === t ? " on" : "")} onClick={() => setTab(t)}>{t}</button>)}
      </div>
      {tab === "변별" ? <Discrimination record={record} /> : <AIItems me={me} record={record} />}
    </div>
  );
}

function Discrimination({ record }) {
  const [g, setG] = useState(GROUPS[0]);
  const [lv, setLv] = useState(null);
  const [qs, setQs] = useState(null);
  const [done, setDone] = useState(null);
  const [run, setRun] = useState(0);
  function start() { setDone(null); setQs(quizSet(inScope(g, null, lv), 8)); setRun((r) => r + 1); }
  if (qs && done === null) return <QuizRunner key={run} questions={qs} record={record} onDone={(s, t) => setDone([s, t])} />;
  return (
    <div>
      {done && <Done score={done[0]} total={done[1]} onAgain={() => { setQs(null); setDone(null); }} againLabel="새 문제 풀기" />}
      {!done && <>
        <div className="section-sub">영역</div>
        <div className="chips">{GROUPS.map((x) => <button key={x} className={"catchip" + (g === x ? " on" : "")} onClick={() => setG(x)}>{x}</button>)}</div>
        <div className="section-sub">난이도</div>
        <div className="chips">{[["", "전체"], ["low", "하"], ["mid", "중"], ["high", "상"]].map(([v, l]) => <button key={l} className={"chip" + ((lv || "") === v ? " on" : "")} onClick={() => setLv(v || null)}>{l}</button>)}</div>
        <button className="btn btn-pri" onClick={start}>변별 퀴즈 시작 (8문항)</button>
        <div className="muted" style={{ fontSize: 12.5, marginTop: 10, lineHeight: 1.6 }}>설명을 읽고 알맞은 개념을 고르는 문제입니다. 보기에는 헷갈리기 쉬운 ‘관련 개념’이 섞여 나옵니다.</div>
      </>}
    </div>
  );
}

function AIItems({ me, record }) {
  const [g, setG] = useState(GROUPS[0]);
  const [term, setTerm] = useState(null);
  const [kind, setKind] = useState(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState(null);
  const [done, setDone] = useState(null);
  const [err, setErr] = useState("");
  const list = useMemo(() => inScope(g), [g]);

  async function gen(c, k) {
    setTerm(c); setKind(k); setQ(null); setDone(null); setErr(""); setLoading(true);
    const sys = `너는 30년 경력 국어 교사다. 학생 수준 "${me.grade}". 개념 "${c.term}"(${c.def})에 대한 ${k}형 4지선다 1문항을 만든다. ${k === "적용" ? "짧은 예문이나 작품 대목을 제시하고 그 개념이 적용된 것을 고르게 하라." : "두 개 이상의 개념을 함께 판단하게 하는 해석형으로 만들라."} 다른 말 없이 JSON으로만.\n{"prompt":"문제(보기 포함)","options":["①","②","③","④"],"answer":정답인덱스0~3,"explanation":"해설"}`;
    try {
      const r = parseJSON(await callClaude(sys, `개념: ${c.term}`));
      setQ([{ mode: k, term_id: c.id, term_name: c.term, prompt: r.prompt, options: r.options, answer: r.answer, explanation: r.explanation }]);
    } catch (e) { setErr("문제를 만들지 못했어요. 다시 시도해 주세요."); } finally { setLoading(false); }
  }

  if (q && done === null) return <QuizRunner key={term.id + kind} questions={q} record={record} onDone={(s, t) => setDone([s, t])} />;
  return (
    <div>
      {done && <Done score={done[0]} total={done[1]} onAgain={() => { setQ(null); setDone(null); setTerm(null); }} againLabel="다른 개념 풀기" />}
      {!done && <>
        <div className="chips">{GROUPS.map((x) => <button key={x} className={"catchip" + (g === x ? " on" : "")} onClick={() => { setG(x); setTerm(null); }}>{x}</button>)}</div>
        {err && <div className="err">{err}</div>}
        {loading ? <Loading text={`「${term.term}」 ${kind}형 문제 생성 중…`} /> : (
          <>
            <div className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>개념을 고르고 유형을 선택하면 AI가 문제를 만듭니다.</div>
            <div className="chips">
              {list.map((c) => (
                <span key={c.id} style={{ display: "inline-flex", gap: 4 }}>
                  <button className="chip" onClick={() => gen(c, "적용")}>{c.term} · 적용</button>
                  <button className="chip ind on" style={{ opacity: .9 }} onClick={() => gen(c, "해석")}>해석</button>
                </span>
              ))}
            </div>
          </>
        )}
      </>}
    </div>
  );
}

/* ════════ 적응형 복습 ════════ */
export function Review({ states, record }) {
  const due = useMemo(() => dueTermIds(states), [states]);
  const [qs, setQs] = useState(null);
  const [done, setDone] = useState(null);
  const [run, setRun] = useState(0);
  function start() {
    const ids = due.slice(0, 10);
    setDone(null);
    setQs(ids.map((id) => buildDiscrimination(BY_ID[id])));
    setRun((r) => r + 1);
  }
  if (qs && done === null) return <QuizRunner key={run} questions={qs} record={record} onDone={(s, t) => setDone([s, t])} />;
  return (
    <div>
      <h1 className="h1">적응형 복습</h1>
      {done && <Done score={done[0]} total={done[1]} onAgain={() => { setQs(null); setDone(null); }} againLabel="복습 더 하기" />}
      {!done && (due.length === 0
        ? <div className="placeholder">지금 복습할 개념이 없어요.<br />문제를 풀면 틀리거나 시간이 지난 개념이 여기에 모입니다.</div>
        : <>
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>복습 대상 {due.length}개</div>
            <div className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>틀렸거나 복습 주기가 된 개념을 정답률이 낮은 순서로 다시 풉니다. 맞히면 다음 복습 간격이 늘어납니다.</div>
          </div>
          <button className="btn btn-pri" onClick={start}>복습 시작 (최대 10문항)</button>
        </>)}
    </div>
  );
}

/* ════════ 오답노트 ════════ */
export function WrongNotes({ attempts, record }) {
  const wrong = useMemo(() => recentWrong(attempts), [attempts]);
  const pairs = useMemo(() => confusionPairs(attempts), [attempts]);
  const [retry, setRetry] = useState(null);
  const [done, setDone] = useState(null);
  if (retry && done === null) return <QuizRunner key={retry.term_id} questions={[buildDiscrimination(BY_ID[retry.term_id])]} record={record} onDone={(s, t) => setDone([s, t])} />;
  return (
    <div>
      <h1 className="h1">오답노트</h1>
      {done && <Done score={done[0]} total={done[1]} onAgain={() => { setRetry(null); setDone(null); }} againLabel="오답노트로 돌아가기" />}
      {!done && <>
        {pairs.length > 0 && (
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>자주 혼동하는 개념</div>
            {pairs.slice(0, 5).map((p, k) => <div key={k} style={{ fontSize: 14, marginBottom: 4 }}><span className="confuse">{p.pair}</span> <span className="muted">{p.n}회</span></div>)}
          </div>
        )}
        {wrong.length === 0 ? <div className="placeholder">아직 틀린 개념이 없어요.</div> : wrong.map((a) => {
          const c = BY_ID[a.term_id];
          return (
            <div key={a.term_id} className="note">
              <div className="notetop"><span className="cterm" style={{ fontSize: 17 }}>{a.term_name}</span>{c && <Lv level={c.level} />}</div>
              {a.picked_term && <div style={{ fontSize: 13.5, marginBottom: 6 }}><span className="confuse">{a.term_name} 을(를) {a.picked_term} 로 혼동</span></div>}
              {c && <div className="muted" style={{ fontSize: 14, lineHeight: 1.6 }}>{c.def}</div>}
              <button className="btn btn-out" style={{ marginTop: 10 }} onClick={() => { setDone(null); setRetry(a); }}>다시 풀기</button>
            </div>
          );
        })}
      </>}
    </div>
  );
}

/* ════════ 강사 대시보드 ════════ */
function heat(acc) {
  if (acc >= 0.8) return { bg: "#E7F1E1", color: "#3E6B3A", borderColor: "#BFD9B4" };
  if (acc >= 0.5) return { bg: "#FBF1D4", color: "#9A6A12", borderColor: "#E7CF8C" };
  return { bg: "#FBE6EC", color: "#A93A57", borderColor: "#EAC0CC" };
}

export function Teacher({ onExit }) {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [sel, setSel] = useState(null);
  useEffect(() => { (async () => { setStudents(await db.listStudents()); setAttempts(await db.allAttempts()); setLoading(false); })(); }, []);

  const rows = useMemo(() => students.map((s) => {
    const mine = attempts.filter((a) => a.student_id === s.id);
    return { ...s, ...summary(termStates(mine)) };
  }), [students, attempts]);

  // 개념별 정답률 히트맵 (반 전체, 영역별 그룹)
  const heatGroups = useMemo(() => {
    const ca = Object.values(conceptAccuracy(attempts));
    const g = {};
    for (const c of ca) {
      const con = BY_ID[c.term_id]; if (!con) continue;
      const grp = GROUP_OF(con.area);
      (g[grp] = g[grp] || []).push(c);
    }
    for (const k in g) g[k].sort((a, b) => a.acc - b.acc);
    return g;
  }, [attempts]);

  const globalPairs = useMemo(() => confusionPairs(attempts), [attempts]);

  if (loading) return <div className="main"><Loading text="학습 데이터 불러오는 중…" /></div>;

  if (sel) {
    const student = students.find((s) => s.id === sel);
    return <StudentDetail student={student} attempts={attempts.filter((a) => a.student_id === sel)} onBack={() => setSel(null)} />;
  }

  return (
    <div className="main">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 className="h1" style={{ margin: 0 }}>강사 대시보드</h1>
        <button className="btn btn-ghost" style={{ width: "auto", padding: "7px 13px" }} onClick={onExit}>나가기</button>
      </div>

      <div className="card" style={{ marginBottom: 14, overflowX: "auto" }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>학생별 현황</div>
        <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>이름을 누르면 상세 약점을 볼 수 있어요.</div>
        {rows.length === 0 ? <div className="muted">등록된 학생이 없습니다.</div> : (
          <table className="tbl">
            <thead><tr><th>학생</th><th>학년</th><th>학습</th><th>습득</th><th>정답률</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="link" onClick={() => setSel(r.id)}>
                  <td style={{ fontWeight: 700, color: C.indigo }}>{r.name}</td>
                  <td className="muted">{r.grade}</td>
                  <td>{r.seen}</td>
                  <td>{r.mastered}</td>
                  <td><div style={{ display: "flex", alignItems: "center", gap: 6 }}><div className="bar" style={{ flex: 1, minWidth: 40 }}><div className="barfill" style={{ width: r.acc + "%" }} /></div><span style={{ fontSize: 12 }}>{r.acc}%</span></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>개념별 정답률 히트맵</div>
        <div className="heatkey"><span><span className="dot" style={{ background: "#BFD9B4" }} />80%+</span><span><span className="dot" style={{ background: "#E7CF8C" }} />50–79%</span><span><span className="dot" style={{ background: "#EAC0CC" }} />~49%</span></div>
        {Object.keys(heatGroups).length === 0 ? <div className="muted">풀이 데이터가 쌓이면 표시됩니다.</div> :
          GROUPS.filter((g) => heatGroups[g]).map((g) => (
            <div key={g} style={{ marginBottom: 12 }}>
              <div className="section-sub" style={{ margin: "4px 0 6px" }}>{g}</div>
              <div className="heat">
                {heatGroups[g].map((c) => (
                  <span key={c.term_id} className="hcell" style={heat(c.acc)} title={`${c.term_name} · ${c.correct}/${c.total}`}>
                    {c.term_name}<b>{Math.round(c.acc * 100)}%</b>
                  </span>
                ))}
              </div>
            </div>
          ))}
      </div>

      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 10 }}>전체 혼동 개념 Top</div>
        {globalPairs.length === 0 ? <div className="muted">데이터가 쌓이면 여기에 표시됩니다.</div> :
          globalPairs.slice(0, 10).map((p, k) => <div key={k} style={{ fontSize: 14, marginBottom: 5 }}><span className="confuse">{p.pair}</span> <span className="muted">{p.n}회</span></div>)}
      </div>
    </div>
  );
}

function StudentDetail({ student, attempts, onBack }) {
  const states = useMemo(() => termStates(attempts), [attempts]);
  const sm = summary(states);
  const weak = useMemo(() => weakTerms(states, 10), [states]);
  const pairs = useMemo(() => confusionPairs(attempts), [attempts]);
  const areas = useMemo(() => {
    const g = {};
    for (const a of attempts) {
      const con = BY_ID[a.term_id]; if (!con) continue;
      const grp = GROUP_OF(con.area);
      const t = g[grp] || (g[grp] = { total: 0, correct: 0 });
      t.total++; if (a.correct) t.correct++;
    }
    return Object.entries(g).map(([area, v]) => ({ area, acc: v.correct / v.total, n: v.total }));
  }, [attempts]);

  return (
    <div className="main">
      <button className="back" onClick={onBack}>← 학생 목록</button>
      <h1 className="h1">{student ? student.name : "학생"} <span className="muted" style={{ fontSize: 15, fontWeight: 600 }}>{student && student.grade}</span></h1>
      <div className="stats">
        <div className="stat"><div className="statn">{sm.seen}</div><div className="statl">학습한 개념</div></div>
        <div className="stat"><div className="statn">{sm.mastered}</div><div className="statl">완전 습득</div></div>
        <div className="stat"><div className="statn">{sm.acc}%</div><div className="statl">정답률</div></div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>영역별 정답률</div>
        {areas.length === 0 ? <div className="muted">데이터가 없습니다.</div> : areas.map((a) => (
          <div key={a.area} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ width: 78, fontSize: 13, flexShrink: 0 }}>{a.area}</span>
            <div className="bar" style={{ flex: 1 }}><div className="barfill" style={{ width: Math.round(a.acc * 100) + "%", background: heat(a.acc).borderColor }} /></div>
            <span style={{ fontSize: 12, width: 58, textAlign: "right" }} className="muted">{Math.round(a.acc * 100)}% ({a.n})</span>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>가장 약한 개념</div>
        {weak.length === 0 ? <div className="muted">데이터가 없습니다.</div> : weak.map((t) => {
          const con = BY_ID[t.term_id];
          return (
            <div key={t.term_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: `1px solid ${C.line}` }}>
              {con && <Lv level={con.level} />}
              <span style={{ flex: 1, fontWeight: 600 }}>{t.term_name}</span>
              <span className="muted" style={{ fontSize: 12.5 }}>정답 {Math.round(t.acc * 100)}% · 숙련 {t.mastery}</span>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 10 }}>혼동 패턴</div>
        {pairs.length === 0 ? <div className="muted">아직 혼동 기록이 없습니다.</div> :
          pairs.slice(0, 8).map((p, k) => <div key={k} style={{ fontSize: 14, marginBottom: 5 }}><span className="confuse">{p.pair}</span> <span className="muted">{p.n}회</span></div>)}
      </div>
    </div>
  );
}
