import React from "react";

export const C = {
  bg: "#F3EAD7", paper: "#FBF5E8", card: "#FFFFFF",
  orange: "#DD5410", ink: "#2B2520", soft: "#5A5042", muted: "#9A8B72",
  line: "#E5D8BF", indigo: "#3C4C7C", green: "#2F6F4F",
};

export const LV = {
  low:  { label: "하", bg: "#E7F1E1", fg: "#3E6B3A", bd: "#BFD9B4" },
  mid:  { label: "중", bg: "#FBF1D4", fg: "#9A6A12", bd: "#E7CF8C" },
  high: { label: "상", bg: "#FBE6EC", fg: "#A93A57", bd: "#EAC0CC" },
};

export function Lv({ level }) {
  const v = LV[level] || LV.mid;
  return <span className="lv" style={{ background: v.bg, color: v.fg, borderColor: v.bd }}>{v.label}</span>;
}

export function Spinner() { return <span className="spin" />; }
export function Loading({ text }) {
  return <div className="center" style={{ padding: "44px 0", color: C.soft }}><Spinner /> <span style={{ marginLeft: 10 }}>{text}</span></div>;
}

export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Gowun+Batang:wght@400;700&family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap');
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
*{box-sizing:border-box}
body{margin:0}
.app{font-family:'IBM Plex Sans KR',sans-serif;background:${C.bg};min-height:100vh;color:${C.ink}}
.wrap{max-width:480px;margin:0 auto;min-height:100vh;background:${C.bg}}
.fade{animation:fade .35s ease both}
.spin{display:inline-block;width:18px;height:18px;border:3px solid ${C.line};border-top-color:${C.orange};border-radius:50%;animation:spin .8s linear infinite;vertical-align:middle}
.center{display:flex;align-items:center;justify-content:center}
.muted{color:${C.muted}}

.topbar{display:flex;justify-content:space-between;align-items:center;padding:13px 18px;background:${C.paper};border-bottom:1px solid ${C.line}}
.brand{display:flex;align-items:center;gap:9px;cursor:pointer}
.brandtxt{font-family:'Black Han Sans',sans-serif;font-size:20px;color:${C.orange};letter-spacing:.5px}
.tabs{display:flex;background:${C.paper};border-bottom:1px solid ${C.line};position:sticky;top:0;z-index:10;overflow-x:auto}
.tab{flex:1;min-width:64px;border:none;background:none;padding:12px 6px;font-size:13.5px;font-weight:700;color:${C.muted};cursor:pointer;font-family:inherit;border-bottom:3px solid transparent;white-space:nowrap;position:relative}
.tab.on{color:${C.ink};border-bottom-color:${C.orange}}
.main{padding:20px 18px 60px}

.btn{border-radius:10px;padding:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;border:1.5px solid transparent;width:100%}
.btn-pri{background:${C.orange};color:#fff;border:none}
.btn-out{background:#fff;border-color:${C.orange};color:${C.orange}}
.btn-ghost{background:#fff;border-color:${C.line};color:${C.soft};font-weight:600}
.btn:disabled{opacity:.55;cursor:default}

.h1{font-family:'Black Han Sans',sans-serif;font-size:26px;margin:0 0 16px;padding-left:11px;border-left:5px solid ${C.orange};line-height:1.15}
.inp{border:1.5px solid ${C.line};border-radius:9px;padding:11px 13px;font-size:15px;font-family:inherit;background:#fff;color:${C.ink};width:100%;outline:none}
.row{display:flex;gap:8px}
.chips{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:14px}
.chip{background:#fff;border:1.5px solid ${C.line};border-radius:999px;padding:7px 13px;font-size:13.5px;font-weight:600;cursor:pointer;font-family:inherit;color:${C.ink}}
.chip.on{background:${C.orange};color:#fff;border-color:${C.orange}}
.chip.ind.on{background:${C.indigo};border-color:${C.indigo}}
.catchip{background:#fff;border:1.5px solid ${C.line};border-radius:9px;padding:7px 13px;font-size:13.5px;font-weight:600;color:${C.soft};cursor:pointer;font-family:inherit}
.catchip.on{color:${C.orange};border-color:${C.orange};font-weight:800}

.lv{display:inline-block;border:1px solid;border-radius:6px;font-size:11px;font-weight:800;padding:1px 7px;line-height:1.6}

.ccard{background:${C.card};border:1px solid ${C.line};border-radius:14px;padding:18px;margin-bottom:11px;box-shadow:0 4px 14px rgba(43,37,32,.04)}
.cterm{font-family:'Gowun Batang',serif;font-weight:700;font-size:20px}
.csub{font-size:11.5px;color:${C.muted};font-weight:600;letter-spacing:.5px}
.cdef{font-size:15px;line-height:1.7;margin:10px 0}
.cex{font-size:13.5px;color:${C.soft};background:${C.paper};border-radius:8px;padding:10px 12px;line-height:1.6}
.cpoint{font-size:12.5px;color:${C.indigo};margin-top:8px;font-weight:600}
.crel{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.tag{background:${C.indigo}14;color:${C.indigo};font-size:11.5px;border-radius:6px;padding:2px 8px;font-weight:600}

.card{background:${C.card};border-radius:14px;border:1px solid ${C.line};padding:20px;box-shadow:0 8px 24px rgba(43,37,32,.05)}
.hero{margin-bottom:20px}
.hero h2{font-family:'Gowun Batang',serif;font-size:23px;margin:0}
.stats{display:flex;gap:9px;margin:16px 0 6px}
.stat{flex:1;background:${C.card};border:1px solid ${C.line};border-radius:12px;padding:13px 8px;text-align:center}
.statn{font-family:'Black Han Sans',sans-serif;font-size:24px;color:${C.orange}}
.statl{font-size:11.5px;color:${C.muted};margin-top:2px}
.menu{display:flex;flex-direction:column;gap:12px;margin-top:8px}
.menucard{text-align:left;background:${C.card};border:1px solid ${C.line};border-radius:14px;padding:17px 18px;cursor:pointer;position:relative;overflow:hidden;font-family:inherit}
.menubar{position:absolute;left:0;top:0;bottom:0;width:5px}
.menut{font-family:'Gowun Batang',serif;font-weight:700;font-size:18px}
.menud{color:${C.soft};font-size:13px;margin-top:4px;line-height:1.5}
.badge{background:${C.orange};color:#fff;border-radius:999px;font-size:11px;padding:1px 7px;margin-left:5px;vertical-align:middle;font-weight:700}

.prog{font-size:12.5px;font-weight:700;color:${C.muted};margin-bottom:8px}
.q{font-size:16px;font-weight:600;line-height:1.6;margin-bottom:14px;white-space:pre-line}
.opt{display:block;width:100%;text-align:left;border:1.5px solid ${C.line};background:#fff;border-radius:10px;padding:12px 15px;font-size:15px;margin-bottom:8px;cursor:pointer;font-family:inherit;line-height:1.5;color:${C.ink}}
.opt.right{background:#E8F3EC;border-color:${C.green};color:#1E4D3A}
.opt.wrong{background:#FBEAE8;border-color:#B41E1A;color:#8A201C}
.exp{background:${C.paper};border-radius:10px;padding:14px 16px;font-size:14px;line-height:1.65;margin-top:4px;white-space:pre-line}
.done{text-align:center;padding-top:10px}
.donen{font-family:'Black Han Sans',sans-serif;font-size:44px;color:${C.ink}}

.note{background:${C.card};border:1px solid ${C.line};border-radius:12px;padding:14px 16px;margin-bottom:10px}
.notetop{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.confuse{background:#FBEAE8;color:#8A201C;font-size:12px;border-radius:6px;padding:2px 8px;font-weight:600}

.tbl{width:100%;border-collapse:collapse;font-size:13.5px}
.tbl th{text-align:left;color:${C.muted};font-size:11.5px;font-weight:700;padding:8px 6px;border-bottom:2px solid ${C.line}}
.tbl td{padding:10px 6px;border-bottom:1px solid ${C.line}}
.bar{height:7px;background:${C.line};border-radius:99px;overflow:hidden}
.barfill{height:100%;background:${C.orange}}
.placeholder{text-align:center;color:${C.muted};padding:44px 0;font-size:14.5px}
.err{background:#FBEAE8;color:#B41E1A;padding:11px 14px;border-radius:10px;margin-bottom:13px;font-size:14px}
.section-sub{font-size:12px;font-weight:700;color:${C.muted};letter-spacing:.5px;margin:18px 0 8px}
`;
