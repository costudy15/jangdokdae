import React, { useState, useEffect, useMemo } from "react";
import { CSS, C, Spinner } from "./ui.jsx";
import * as db from "./lib/supabase";
import { termStates, summary } from "./logic";
import { Learn, Quiz, Review, WrongNotes, Teacher } from "./views.jsx";

function Onggi({ size = 30 }) {
  return (
    <svg width={size} height={size * 1.08} viewBox="0 0 120 130" aria-hidden>
      <path d="M37 9 L83 9 L79 26 L41 26 Z" fill={C.orange} />
      <path d="M41 25 C18 33 9 57 9 82 C9 111 33 125 60 125 C87 125 111 111 111 82 C111 57 102 33 79 25 Z" fill={C.orange} />
    </svg>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [view, setView] = useState("login");
  const [students, setStudents] = useState([]);
  const [me, setMe] = useState(null);
  const [attempts, setAttempts] = useState([]);

  async function reloadStudents() { setStudents(await db.listStudents()); }
  useEffect(() => { (async () => { await reloadStudents(); setReady(true); })(); }, []);

  const states = useMemo(() => termStates(attempts), [attempts]);

  async function login(student, pw) {
    if (!(await db.loginStudent(student.id, pw))) return false;
    setMe(student);
    setAttempts(await db.attemptsOf(student.id));
    setView("home");
    return true;
  }
  function logout() { setMe(null); setAttempts([]); setView("login"); }

  async function record(rec) {
    const local = { student_id: me.id, created_at: new Date().toISOString(), picked_term: rec.picked_term || null, hint_used: !!rec.hint_used, ...rec };
    setAttempts((a) => [...a, local]);
    await db.logAttempt({
      student_id: me.id, mode: rec.mode, term_id: rec.term_id, term_name: rec.term_name,
      correct: rec.correct, picked_term: rec.picked_term || null, hint_used: !!rec.hint_used,
    });
  }

  if (!ready) return (<div className="app"><div className="wrap"><style>{CSS}</style><div className="center" style={{ minHeight: "70vh" }}><Onggi size={56} /></div></div></div>);

  return (
    <div className="app">
      <div className="wrap">
        <style>{CSS}</style>
        {view === "login" && <Login students={students} reload={reloadStudents} onLogin={login} onTeacher={() => setView("teacher")} />}
        {view === "teacher" && <Teacher onExit={() => setView("login")} />}
        {me && view !== "login" && view !== "teacher" && (
          <>
            <header className="topbar">
              <div className="brand" onClick={() => setView("home")}><Onggi size={28} /><span className="brandtxt">개념어</span></div>
              <button className="btn btn-ghost" style={{ width: "auto", padding: "6px 11px", fontSize: 12.5 }} onClick={logout}>{me.name} · 나가기</button>
            </header>
            <nav className="tabs">
              {[["home", "홈"], ["learn", "학습"], ["quiz", "문제"], ["review", "복습"], ["wrong", "오답"]].map(([k, l]) => (
                <button key={k} className={"tab" + (view === k ? " on" : "")} onClick={() => setView(k)}>
                  {l}{k === "review" && summary(states).due > 0 && <span className="badge">{summary(states).due}</span>}
                </button>
              ))}
            </nav>
            <main className="main fade" key={view}>
              {view === "home" && <Home me={me} states={states} setView={setView} />}
              {view === "learn" && <Learn />}
              {view === "quiz" && <Quiz me={me} record={record} />}
              {view === "review" && <Review states={states} record={record} />}
              {view === "wrong" && <WrongNotes attempts={attempts} record={record} />}
            </main>
          </>
        )}
      </div>
    </div>
  );
}

/* ── 로그인 / 학생 관리 ── */
function Login({ students, reload, onLogin, onTeacher }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", school: "", grade: "고1", pw: "" });
  const [pending, setPending] = useState(null);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [teach, setTeach] = useState(false);
  const [tpw, setTpw] = useState("");
  const [terr, setTerr] = useState(false);

  async function add() {
    if (!form.name.trim() || !form.pw.trim()) return;
    setBusy(true);
    const { error } = await db.createStudent(form.name.trim(), form.school.trim(), form.grade, form.pw);
    setBusy(false);
    if (error) return alert("등록 실패: " + error.message);
    setForm({ name: "", school: "", grade: "고1", pw: "" }); setAdding(false); reload();
  }
  async function del(id, e) {
    e.stopPropagation();
    if (!confirm("이 학생을 삭제할까요? 학습 기록도 함께 사라집니다.")) return;
    await db.deleteStudent(id); reload();
  }
  async function go() { setBusy(true); const ok = await onLogin(pending, pw); setBusy(false); if (!ok) setErr(true); }
  async function teacherGo() {
    const ok = await db.verifyTeacher(tpw);
    if (ok) onTeacher(); else setTerr(true);
  }

  return (
    <div className="main" style={{ maxWidth: 420, margin: "0 auto", paddingTop: 38 }}>
      <div style={{ textAlign: "center", marginBottom: 26 }}>
        <Onggi size={62} />
        <div style={{ fontFamily: "'Black Han Sans',sans-serif", fontSize: 38, color: C.orange, marginTop: 4 }}>장독대 국어</div>
        <div style={{ fontFamily: "'Gowun Batang',serif", fontWeight: 700, letterSpacing: 4, marginTop: 2 }}>개념어 학습기</div>
        <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>수능 국어 개념어 298개 · 변별 · 적응형 복습</div>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 13 }}>
          <span style={{ fontFamily: "'Gowun Batang',serif", fontWeight: 700, fontSize: 18 }}>학생 선택</span>
          <button className="chip" onClick={() => { setAdding(!adding); setPending(null); }}>{adding ? "닫기" : "+ 학생 등록"}</button>
        </div>
        {adding && (
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 14 }}>
            <input className="inp" placeholder="이름" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="inp" placeholder="학교" value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} />
            <div className="row">
              {["중1", "중2", "중3", "고1", "고2", "고3"].map((g) => (
                <button key={g} className={"catchip" + (form.grade === g ? " on" : "")} style={{ flex: 1 }} onClick={() => setForm({ ...form, grade: g })}>{g}</button>
              ))}
            </div>
            <input className="inp" type="password" placeholder="비밀번호" value={form.pw} onChange={(e) => setForm({ ...form, pw: e.target.value })} />
            <button className="btn btn-pri" onClick={add} disabled={busy}>{busy ? "등록 중…" : "등록하기"}</button>
          </div>
        )}
        {students.length === 0 && !adding && <div className="placeholder">등록된 학생이 없어요. ‘+ 학생 등록’으로 시작하세요.</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {students.map((st) => (
            <div key={st.id} className="ccard" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 0, cursor: "pointer", padding: 13 }}
              onClick={() => { setPending(st); setPw(""); setErr(false); }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.orange + "1a", color: C.orange, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontFamily: "'Black Han Sans',sans-serif" }}>{st.name[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{st.name}</div>
                <div className="muted" style={{ fontSize: 12.5 }}>{st.school || "—"} · {st.grade}</div>
              </div>
              <button onClick={(e) => del(st.id, e)} style={{ border: "none", background: "none", color: C.muted, fontSize: 22, cursor: "pointer" }}>×</button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 18 }}>
        {!teach ? (
          <button className="btn btn-ghost" style={{ width: "auto", padding: "8px 16px" }} onClick={() => { setTeach(true); setTerr(false); }}>선생님 모드</button>
        ) : (
          <div className="card" style={{ textAlign: "left" }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>선생님 모드</div>
            <input className="inp" type="password" placeholder="관리 비밀번호" value={tpw} onChange={(e) => { setTpw(e.target.value); setTerr(false); }} onKeyDown={(e) => e.key === "Enter" && teacherGo()} />
            {terr && <div className="err" style={{ marginTop: 8, marginBottom: 0 }}>비밀번호가 일치하지 않습니다.</div>}
            <button className="btn btn-pri" style={{ marginTop: 10 }} onClick={teacherGo}>대시보드 열기</button>
          </div>
        )}
      </div>

      {pending && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(43,37,32,.42)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 99 }} onClick={() => setPending(null)}>
          <div className="card" style={{ width: "100%", maxWidth: 330 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontFamily: "'Gowun Batang',serif", fontWeight: 700, fontSize: 20 }}>{pending.name} 학생</div>
            <div className="muted" style={{ fontSize: 13.5, margin: "3px 0 14px" }}>비밀번호를 입력하세요</div>
            <input className="inp" type="password" autoFocus value={pw} style={err ? { borderColor: C.orange } : {}} onChange={(e) => { setPw(e.target.value); setErr(false); }} onKeyDown={(e) => e.key === "Enter" && go()} placeholder="비밀번호" />
            {err && <div className="err" style={{ marginTop: 8, marginBottom: 0 }}>비밀번호가 일치하지 않습니다.</div>}
            <button className="btn btn-pri" style={{ marginTop: 12 }} onClick={go} disabled={busy}>{busy ? "확인 중…" : "입장하기"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 홈 ── */
function Home({ me, states, setView }) {
  const sm = summary(states);
  const menu = [
    ["learn", "개념 학습", "298개 개념을 영역·소분류·난이도로 카드 학습", C.orange],
    ["quiz", "문제 풀기", "변별 퀴즈와 AI 적용·해석 문제", C.indigo],
    ["review", "적응형 복습", sm.due > 0 ? `복습할 개념 ${sm.due}개가 준비됐어요` : "오늘 복습할 개념이 없어요", C.green],
    ["wrong", "오답노트", "틀린 개념과 혼동 패턴 다시 보기", "#B41E1A"],
  ];
  return (
    <div>
      <div className="hero">
        <h2>안녕하세요, {me.name} 님</h2>
        <div className="muted" style={{ fontSize: 13.5, marginTop: 3 }}>{me.school || "—"} · {me.grade}</div>
      </div>
      <div className="stats">
        <div className="stat"><div className="statn">{sm.seen}</div><div className="statl">학습한 개념</div></div>
        <div className="stat"><div className="statn">{sm.mastered}</div><div className="statl">완전 습득</div></div>
        <div className="stat"><div className="statn">{sm.acc}%</div><div className="statl">평균 정답률</div></div>
      </div>
      <div className="menu">
        {menu.map(([k, t, d, col]) => (
          <button key={k} className="menucard" onClick={() => setView(k)}>
            <div className="menubar" style={{ background: col }} />
            <div className="menut">{t}{k === "review" && sm.due > 0 && <span className="badge">{sm.due}</span>}</div>
            <div className="menud">{d}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
