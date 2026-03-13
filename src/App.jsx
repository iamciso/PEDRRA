import { useState, useEffect, useMemo, useRef } from "react";

function makeQR(text) {
  try {
    const E = new Uint8Array(256), L = new Uint8Array(256); let v = 1;
    for (let i = 0; i < 255; i++) { E[i] = v; L[v] = i; v = (v << 1) ^ (v & 128 ? 0x11d : 0); } E[255] = E[0];
    const gm = (a, b) => a && b ? E[(L[a] + L[b]) % 255] : 0;
    const rs = (d, n) => { let g = [1]; for (let i = 0; i < n; i++) { const ng = Array(g.length + 1).fill(0); for (let j = 0; j < g.length; j++) { ng[j] ^= g[j]; ng[j+1] ^= gm(g[j], E[i]); } g = ng; } const m = [...d, ...Array(n).fill(0)]; for (let i = 0; i < d.length; i++) { if (m[i]) for (let j = 1; j < g.length; j++) m[i+j] ^= gm(g[j], m[i]); } return m.slice(d.length); };
    const AL = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
    const FM = [[1,1,1,0,1,1,1,1,1,0,0,0,1,0,0],[1,1,1,0,0,1,0,1,1,1,1,0,0,1,1],[1,1,1,1,1,0,1,1,0,1,0,1,0,1,0],[1,1,1,1,0,0,0,1,0,0,1,1,1,0,1],[1,1,0,0,1,1,0,0,0,1,0,1,1,1,1],[1,1,0,0,0,1,1,0,0,0,1,1,0,0,0],[1,1,0,1,1,0,0,0,1,0,0,0,0,0,1],[1,1,0,1,0,0,1,0,1,1,1,0,1,1,0]];
    text = text.toUpperCase(); const b = []; const pb = (v, n) => { for (let i = n-1; i >= 0; i--) b.push((v>>i)&1); };
    pb(2,4); pb(text.length,9);
    for (let i = 0; i < text.length; i += 2) { if (i+1 < text.length) pb(AL.indexOf(text[i])*45+AL.indexOf(text[i+1]),11); else pb(AL.indexOf(text[i]),6); }
    pb(0,Math.min(4,152-b.length)); while(b.length%8) b.push(0); let pi=0; while(b.length<152){pb(pi%2===0?0xEC:0x11,8);pi++;}
    const db=[]; for(let i=0;i<b.length;i+=8){let x=0;for(let j=0;j<8;j++)x=(x<<1)|b[i+j];db.push(x);}
    const ec=rs(db,7),all=[...db,...ec],ab=[]; for(const x of all) for(let i=7;i>=0;i--) ab.push((x>>i)&1);
    let bM=null,bP=1e9;
    for(let mask=0;mask<8;mask++){
      const S=21,M=Array.from({length:S},()=>Array(S).fill(0)),F=Array.from({length:S},()=>Array(S).fill(false));
      const sf=(r,c,v)=>{if(r>=0&&r<S&&c>=0&&c<S){M[r][c]=v;F[r][c]=true;}};
      for(const[fr,fc]of[[0,0],[0,14],[14,0]])for(let dr=-1;dr<=7;dr++)for(let dc=-1;dc<=7;dc++){const a=dr>=0&&dr<=6&&dc>=0&&dc<=6,b2=dr>=1&&dr<=5&&dc>=1&&dc<=5,c2=dr>=2&&dr<=4&&dc>=2&&dc<=4;sf(fr+dr,fc+dc,(c2||(a&&!b2))?1:0);}
      for(let i=8;i<13;i++){sf(6,i,i%2===0?1:0);sf(i,6,i%2===0?1:0);}sf(13,8,1);
      for(let i=0;i<=8;i++){F[8][i]=true;F[i][8]=true;}for(let i=0;i<8;i++){F[8][S-1-i]=true;F[S-1-i][8]=true;}
      let bi=0,up=true;for(let col=S-1;col>=0;col-=2){if(col===6)col=5;const rows=up?Array.from({length:S},(_,i)=>S-1-i):Array.from({length:S},(_,i)=>i);for(const row of rows)for(const dc of[0,-1]){const c=col+dc;if(c<0||c>=S||F[row][c])continue;if(bi<ab.length)M[row][c]=ab[bi++];}up=!up;}
      const mf=[(r,c)=>(r+c)%2===0,(r,c)=>r%2===0,(r,c)=>c%3===0,(r,c)=>(r+c)%3===0,(r,c)=>(~~(r/2)+~~(c/3))%2===0,(r,c)=>(r*c%2+r*c%3)===0,(r,c)=>(r*c%2+r*c%3)%2===0,(r,c)=>((r+c)%2+r*c%3)%2===0][mask];
      for(let r=0;r<S;r++)for(let c=0;c<S;c++)if(!F[r][c]&&mf(r,c))M[r][c]^=1;
      const fmt=FM[mask],p1=[[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8]],p2=[[S-1,8],[S-2,8],[S-3,8],[S-4,8],[S-5,8],[S-6,8],[S-7,8],[8,S-8],[8,S-7],[8,S-6],[8,S-5],[8,S-4],[8,S-3],[8,S-2],[8,S-1]];
      for(let i=0;i<15;i++){M[p1[i][0]][p1[i][1]]=fmt[i];M[p2[i][0]][p2[i][1]]=fmt[i];}
      let pen=0;for(let r=0;r<S;r++)for(let c=0;c<S-4;c++){const s=M[r][c];if(M[r][c+1]===s&&M[r][c+2]===s&&M[r][c+3]===s&&M[r][c+4]===s)pen+=3;}
      if(pen<bP){bP=pen;bM=M.map(r=>[...r]);}
    } return bM;
  } catch(e) { return null; }
}
function QRCode({ data, size = 200, fg = "#0C4DA2" }) {
  const mx = useMemo(() => makeQR(data), [data]);
  if (!mx) return <div style={{ width: size, height: size, background: "#fff", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", border: "2px dashed #ccc" }}><span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: size/6, color: fg, letterSpacing: 4 }}>{data}</span></div>;
  const S = mx.length, cs = size/(S+8), pd = cs*4;
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}><rect width={size} height={size} fill="#fff" rx={12}/>{mx.map((row,r)=>row.map((cell,c)=>cell?<rect key={`${r}-${c}`} x={pd+c*cs} y={pd+r*cs} width={cs+.5} height={cs+.5} fill={fg}/>:null))}</svg>;
}
async function loadS(){try{const r=localStorage.getItem("pedrra");if(r)return JSON.parse(r);}catch(e){}return null;}
async function saveS(d){try{localStorage.setItem("pedrra",JSON.stringify(d));}catch(e){}}
const P={b:"#0C4DA2",dk:"#082F66",lt:"#E8EFF8",gd:"#54585A",gm:"#9EA2A2",gl:"#F0F1F2",w:"#FFF",gn:"#1B8A4E",rd:"#D32F2F",am:"#ED8B00",yl:"#FFF200"};
const ANS=[{bg:"#E21B3C",s:"\u25B2",l:"A"},{bg:"#1368CE",s:"\u25C6",l:"B"},{bg:"#D89E00",s:"\u25CF",l:"C"},{bg:"#26890C",s:"\u25A0",l:"D"}];

const DEF_COURSE = {
  title: "PEDRRA I", desc: "Interactive training on personal data breach risk assessment.",
  modules: [
    { id: "m1", title: "Pre-Reading", icon: "📖", phase: "before", desc: "Review before training (~30 min)", items: [
      { id: "i1", type: "doc", title: "EUDPR Regulation", desc: "Focus on Articles 33–35", url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32018R1725" },
      { id: "i2", type: "doc", title: "EDPS Breach Guidelines", desc: "November 2018", url: "https://www.edps.europa.eu/data-protection/our-work/publications/guidelines/2018-11-21-guidelines-personal-data-breach_en" },
      { id: "i3", type: "doc", title: "Pre-Reading Package", desc: "10-page preparation", url: "" },
      { id: "i4", type: "doc", title: "Risk Assessment Primer", desc: "2-page reference", url: "" },
      { id: "i5", type: "survey", title: "Pre-Training Self-Assessment", desc: "Baseline confidence (helps measure progress)", qs: [
        { id: "p1", text: "I can distinguish a security incident from a data breach.", type: "scale" },
        { id: "p2", text: "I understand breach types: Confidentiality, Integrity, Availability.", type: "scale" },
        { id: "p3", text: "I can determine whether to notify the EDPS.", type: "scale" },
        { id: "p4", text: "I can assess Risk vs High Risk.", type: "scale" },
        { id: "p5", text: "I know when the 72-hour deadline starts.", type: "scale" },
        { id: "p6", text: "I know when Article 35 communication is required.", type: "scale" },
        { id: "p7", text: "I understand encryption/pseudonymisation in risk assessment.", type: "scale" },
        { id: "p8", text: "I can coordinate IT Security, LCO, and DPO during a breach.", type: "scale" },
      ]},
      { id: "i5b", type: "survey", title: "Pre-Training Knowledge Check", desc: "Quick baseline — don't worry about scores!", qs: [
        { id: "pk1", text: "Encrypted laptop = always Unlikely Risk, no EDPS notification.", type: "tf", opts: ["True","False"], ok: 1 },
        { id: "pk2", text: "72-hour clock starts when the DPO is formally informed.", type: "tf", opts: ["True","False"], ok: 1 },
        { id: "pk3", text: "Pseudonymised data is no longer personal data under EUDPR.", type: "tf", opts: ["True","False"], ok: 1 },
        { id: "pk4", text: "A processor must notify the controller without undue delay.", type: "tf", opts: ["True","False"], ok: 0 },
        { id: "pk5", text: "High Risk = communicate to subjects AND notify EDPS.", type: "tf", opts: ["True","False"], ok: 0 },
        { id: "pk6", text: "Risk assessment should focus on organisational reputation.", type: "tf", opts: ["True","False"], ok: 1 },
        { id: "pk7", text: "Health Status Indicator (Good/Fair/Poor) = health data (Art. 10).", type: "tf", opts: ["True","False"], ok: 0 },
        { id: "pk8", text: "Retention violations must be in the EDPS notification.", type: "tf", opts: ["True","False"], ok: 0 },
      ]},
    ]},
    { id: "m2", title: "Welcome & Context", icon: "⭐", phase: "live", desc: "Introduction and ground rules", items: [
      { id: "i6", type: "slides", title: "Welcome Slides", slides: [
        { t: "Welcome to PEDRRA", c: "PErsonal Data bReach Risk Assessment\n\nEuropean Data Protection Supervisor", l: "title" },
        { t: "Programme", c: "09:30 Welcome\n10:00 Scenario 1\n11:00 Break\n11:15 Lecture\n12:15 Lunch\n13:15 Scenario 2\n14:30 Quiz\n15:15 Debrief", l: "content" },
        { t: "Ground Rules", c: "🔒 Chatham House Rule\n🤝 No blame\n🗣️ Every voice matters\n📱 Phone ready for quiz", l: "content" },
        { t: "Key Principle", c: "Not every security incident is a data breach,\nbut every data breach is a security incident.", l: "quote" },
      ]}
    ]},
    { id: "m3", title: "Scenario 1: Encrypted Gateway", icon: "🔒2", phase: "live", desc: "Stolen laptop scenario", items: [
      { id: "i7", type: "doc", title: "Scenario 1 Briefing", desc: "Context and technical findings", url: "" },
      { id: "i8", type: "doc", title: "Team Workbook", desc: "Risk assessment template", url: "" },
    ]},
    { id: "m4", title: "Lecture: Breach Essentials", icon: "🎓", phase: "live", desc: "60-min EDPS perspective", items: [
      { id: "i9", type: "slides", title: "Breach Essentials", slides: [
        { t: "Breach Essentials", c: "EDPS Perspective\nRisk Assessment\nNotification", l: "title" },
        { t: "3-Tier Framework", c: "Unlikely Risk = Record only\n\nRisk = Notify EDPS (72h)\n\nHigh Risk = Notify EDPS + Data subjects", l: "content" },
        { t: "72-Hour Rule", c: "Notify without undue delay,\nwhere feasible within 72 hours.\n\nClock starts at reasonable certainty.", l: "quote" },
      ]}
    ]},
    { id: "m5", title: "Scenario 2: Data Leak", icon: "☁️", phase: "live", desc: "Cloud compromise", items: [
      { id: "i10", type: "doc", title: "Scenario 2 Briefing", desc: "Full scenario", url: "" },
      { id: "i11", type: "doc", title: "Team Workbook", desc: "4 blocks + communication draft", url: "" },
    ]},
    { id: "m6", title: "Quiz & Examples", icon: "❓", phase: "live", desc: "Interactive knowledge check", items: [
      { id: "i12", type: "quiz", title: "Training Quiz", desc: "8 questions", qs: [
        { id: "Q1", text: "Stolen Laptop: why might this NOT be High Risk?", type: "mc", opts: ["Stolen from locked office","Encrypted + backup exists","Only professional emails","Remote wipe sent"], ok: 1, xp: 100 },
        { id: "Q2", text: "Remote wipe pending: impact on risk?", type: "mc", opts: ["No change","Increases risk","Decreases risk","No legal impact"], ok: 1, xp: 100 },
        { id: "Q3", text: "CloudVault: which field triggered High Risk?", type: "mc", opts: ["Passwords","Health Status Indicator","750K records","Cross-border"], ok: 1, xp: 100 },
        { id: "Q4", text: "Data retention oversight: impact?", type: "mc", opts: ["Irrelevant","Compounds severity","Lowers risk","Only if unencrypted"], ok: 1, xp: 100 },
        { id: "Q5", text: "EUDPR Art. 33: notify EDPS...", type: "mc", opts: ["Immediately","24 hours","72 hours max","Only if High Risk"], ok: 2, xp: 100 },
        { id: "Q6", text: "HR emails with CC. Notify?", type: "bn", opts: ["Notify","Don't Notify"], ok: 0, xp: 50 },
        { id: "Q7", text: "Whistleblower DB published. Communicate?", type: "bn", opts: ["Communicate","Don't"], ok: 0, xp: 50 },
        { id: "Q8", text: "Encrypted USB lost, backups. Notify?", type: "bn", opts: ["Notify","May not be required"], ok: 1, xp: 50 },
      ]},
      { id: "i13", type: "quiz", title: "Scenario Verdicts", desc: "Team votes", qs: [
        { id: "V1", text: "Scenario 1 verdict?", type: "poll", opts: ["Unlikely Risk","Risk","High Risk"], ok: -1, xp: 25 },
        { id: "V2", text: "Scenario 2 (pre-inject)?", type: "poll", opts: ["Unlikely Risk","Risk","High Risk"], ok: -1, xp: 25 },
        { id: "V3", text: "Scenario 2 (post-inject)?", type: "poll", opts: ["Unlikely Risk","Risk","High Risk"], ok: -1, xp: 25 },
      ]},
    ]},
    { id: "m7", title: "Evaluation", icon: "📋", phase: "after", desc: "Post-training evaluation (Kirkpatrick L1-L2)", items: [
      { id: "e1", type: "survey", title: "Level 1: Reaction & Satisfaction", desc: "Rate 1-5. Anonymous.", qs: [
        { id: "H1a", text: "CONTENT & RELEVANCE", type: "header" },
        { id: "L11", text: "Content relevant to my job.", type: "scale" },
        { id: "L12", text: "Content current and accurate.", type: "scale" },
        { id: "L13", text: "Appropriate level.", type: "scale" },
        { id: "L14", text: "Scenarios were realistic.", type: "scale" },
        { id: "L15", text: "Clarified Security Incident vs Data Breach.", type: "scale" },
        { id: "L16", text: "More confident: Risk vs High Risk.", type: "scale" },
        { id: "H1b", text: "METHODS & DELIVERY", type: "header" },
        { id: "L17", text: "TTX format effective.", type: "scale" },
        { id: "L18", text: "Activities enhanced understanding.", type: "scale" },
        { id: "L19", text: "Good lecture/practice balance.", type: "scale" },
        { id: "L1a", text: "Communication exercise useful.", type: "scale" },
        { id: "L1b", text: "Pace appropriate.", type: "scale" },
        { id: "L1c", text: "Platform easy to use.", type: "scale" },
        { id: "H1c", text: "FACILITATION", type: "header" },
        { id: "L1d", text: "Facilitators knowledgeable.", type: "scale" },
        { id: "L1e", text: "Communicated clearly.", type: "scale" },
        { id: "L1f", text: "Managed debates well.", type: "scale" },
        { id: "L1g", text: "Psychologically safe.", type: "scale" },
        { id: "H1d", text: "OVERALL", type: "header" },
        { id: "L1h", text: "Overall satisfied.", type: "scale" },
        { id: "L1i", text: "Would recommend.", type: "scale" },
        { id: "L1j", text: "Met expectations.", type: "scale" },
        { id: "L1k", text: "Confidence applying learning (1-5).", type: "scale" },
        { id: "H1e", text: "OPEN-ENDED", type: "header" },
        { id: "L1l", text: "Most valuable?", type: "text" },
        { id: "L1m", text: "What to improve?", type: "text" },
        { id: "L1n", text: "Additional topics?", type: "text" },
        { id: "L1o", text: "72h deadline still unclear?", type: "text" },
      ]},
      { id: "e2", type: "survey", title: "Post-Training Knowledge Check (Level 2)", desc: "Same as pre-training — measure progress!", qs: [
        { id: "pk1b", text: "Encrypted laptop = always Unlikely Risk.", type: "tf", opts: ["True","False"], ok: 1 },
        { id: "pk2b", text: "72h clock starts at DPO notification.", type: "tf", opts: ["True","False"], ok: 1 },
        { id: "pk3b", text: "Pseudonymised = not personal data.", type: "tf", opts: ["True","False"], ok: 1 },
        { id: "pk4b", text: "Processor must notify controller.", type: "tf", opts: ["True","False"], ok: 0 },
        { id: "pk5b", text: "High Risk = subjects + EDPS.", type: "tf", opts: ["True","False"], ok: 0 },
        { id: "pk6b", text: "Focus on organisational reputation.", type: "tf", opts: ["True","False"], ok: 1 },
        { id: "pk7b", text: "Health indicator = health data.", type: "tf", opts: ["True","False"], ok: 0 },
        { id: "pk8b", text: "Retention violations in notification.", type: "tf", opts: ["True","False"], ok: 0 },
      ]},
      { id: "e3", type: "survey", title: "Knowledge Gaps (Objective 7)", desc: "We deliver a resource within 4 weeks.", qs: [
        { id: "G1", text: "Top knowledge gap #1:", type: "text" },
        { id: "G2", text: "Proposed resource for gap #1:", type: "text" },
        { id: "G3", text: "Knowledge gap #2:", type: "text" },
        { id: "G4", text: "Proposed resource for gap #2:", type: "text" },
      ]},
    ]},
    { id: "m8", title: "Follow-Up Resources", icon: "🚀", phase: "after", desc: "Post-training materials", items: [
      { id: "f1", type: "doc", title: "Risk Assessment Tool", desc: "Standard template", url: "" },
      { id: "f2", type: "doc", title: "Art. 35 Communication Template", desc: "Pre-filled", url: "" },
    ]},
    { id: "m9", title: "Level 3: Follow-Up (3-6 months)", icon: "📊", phase: "after", desc: "Behavioural change survey", items: [
      { id: "l31", type: "survey", title: "Participant Self-Assessment", desc: "How has training changed your work?", qs: [
        { id: "H3a", text: "APPLICATION", type: "header" },
        { id: "L31", text: "How often applied PEDRRA knowledge?", type: "choice", opts: ["Daily","Weekly","Monthly","Rarely","Never"] },
        { id: "L32", text: "Used EDPS Risk Assessment Tool?", type: "choice", opts: ["Yes","No"] },
        { id: "L33", text: "Team updated Communication Protocol?", type: "choice", opts: ["Yes","In progress","No"] },
        { id: "L34", text: "Risk vs High Risk debate? Used PEDRRA criteria?", type: "choice", opts: ["Yes, PEDRRA","Yes, other","No situation"] },
        { id: "H3b", text: "SPECIFICS", type: "header" },
        { id: "L35", text: "Skills applied most?", type: "text" },
        { id: "L36", text: "Work practice changes:", type: "text" },
        { id: "L37", text: "Impact on incident response:", type: "text" },
        { id: "H3c", text: "BARRIERS", type: "header" },
        { id: "L38", text: "Barriers encountered:", type: "text" },
        { id: "L39", text: "Support needed:", type: "text" },
      ]},
      { id: "l32", type: "survey", title: "Manager Observation", desc: "For supervisors (optional)", qs: [
        { id: "M1", text: "Improved IT-DPO coordination?", type: "choice", opts: ["Significant","Some","No change","Decline"] },
        { id: "M2", text: "Reports more complete?", type: "choice", opts: ["Significantly","Somewhat","No change"] },
        { id: "M3", text: "Specific improvements:", type: "text" },
        { id: "M4", text: "Organisational benefit:", type: "text" },
      ]},
    ]},
  ],
};

const mkCode = () => Array.from({length:6},()=>"ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[~~(Math.random()*31)]).join("");
const HD={background:`linear-gradient(135deg,${P.b},${P.dk})`,padding:"10px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8};
const CD={background:P.w,borderRadius:12,padding:20,boxShadow:"0 2px 12px rgba(0,0,0,.06)",border:`1px solid ${P.gl}`};
const BT=(bg,c="#fff")=>({background:bg,color:c,border:"none",borderRadius:8,padding:"10px 18px",fontSize:14,fontWeight:600,cursor:"pointer"});
const BO=(c=P.b)=>({background:"transparent",color:c,border:`2px solid ${c}`,borderRadius:8,padding:"8px 16px",fontSize:14,fontWeight:600,cursor:"pointer"});
const IN={width:"100%",padding:"10px 14px",borderRadius:8,border:"1px solid #d1d5db",fontSize:14,boxSizing:"border-box",fontFamily:"inherit"};
const TB=(a)=>({padding:"10px 16px",fontSize:13,fontWeight:600,cursor:"pointer",border:"none",background:"transparent",borderBottom:a?`3px solid ${P.b}`:"3px solid transparent",color:a?P.b:P.gm});
const PC={before:"#6366f1",live:P.b,after:P.gn};
function Slide({s,big}){if(!s)return null;const f=big?1:.55;const ls={title:{bg:`linear-gradient(135deg,${P.b},${P.dk})`,c:"#fff",a:"center",t:42*f,x:20*f,p:50*f},content:{bg:P.w,c:P.gd,a:"left",t:28*f,x:16*f,p:36*f},quote:{bg:P.lt,c:P.b,a:"center",t:22*f,x:20*f,p:50*f}};const l=ls[s.l]||ls.content;return<div style={{background:l.bg,color:l.c,borderRadius:12,padding:l.p,minHeight:big?360:160,display:"flex",flexDirection:"column",justifyContent:"center",textAlign:l.a,border:`1px solid ${P.gl}`}}><h2 style={{fontSize:l.t,fontWeight:700,margin:"0 0 12px",lineHeight:1.3}}>{s.t}</h2><div style={{fontSize:l.x,lineHeight:1.7,whiteSpace:"pre-wrap",opacity:.9}}>{s.c}</div></div>;}
function PB({done,total,color=P.b}){const pct=total>0?~~(done/total*100):0;return<div style={{display:"flex",alignItems:"center",gap:8}}><div style={{flex:1,height:8,background:P.gl,borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:4,transition:"width .4s"}}/></div><span style={{fontSize:12,fontWeight:700,color:P.gd,minWidth:32}}>{pct}%</span></div>;}

export default function App(){
  const[course,setCourse]=useState(DEF_COURSE);const[loaded,setLoaded]=useState(false);
  const[mode,setMode]=useState(null);const[sess,setSess]=useState(null);const[parts,setParts]=useState([]);const[resp,setResp]=useState({});
  const[lqId,setLqId]=useState(null);const[lqi,setLqi]=useState(-1);const[rev,setRev]=useState(false);
  const[tmr,setTmr]=useState(0);const[tmOn,setTmOn]=useState(false);const[si,setSi]=useState(0);
  const[aTab,setATab]=useState("course");const[modId,setModId]=useState(null);const[itemId,setItemId]=useState(null);
  const[pName,setPName]=useState("");const[pTeam,setPTeam]=useState("");const[pid,setPid]=useState(null);
  const[prog,setProg]=useState({});const[pAns,setPAns]=useState({});const[xp,setXp]=useState(0);
  const[eMod,setEMod]=useState(null);const tr=useRef(null);

  useEffect(()=>{loadS().then(d=>{if(d?.course)setCourse(d.course);setLoaded(true);});},[]);
  useEffect(()=>{if(loaded)saveS({course});},[course,loaded]);
  useEffect(()=>{if(tmOn&&tmr>0)tr.current=setTimeout(()=>setTmr(t=>t-1),1000);else if(tmr===0&&tmOn)setTmOn(false);return()=>clearTimeout(tr.current);},[tmr,tmOn]);

  const jurl=sess?`PEDRRA/${sess.code}`:"PEDRRA";
  const me=parts.find(p=>p.id===pid);
  const aMod=modId?course.modules.find(m=>m.id===modId):null;
  const aItem=aMod&&itemId?aMod.items.find(i=>i.id===itemId):null;
  const lItem=lqId?course.modules.flatMap(m=>m.items).find(i=>i.id===lqId):null;
  const lQ=lItem?.qs&&lqi>=0?lItem.qs[lqi]:null;
  const grd=qId=>{const d={};Object.keys(resp).forEach(k=>{if(k.endsWith(`-${qId}`))d[resp[k]]=(d[resp[k]]||0)+1;});return d;};
  const grc=qId=>Object.keys(resp).filter(k=>k.endsWith(`-${qId}`)).length;
  const modProg=m=>({t:m.items.length,d:m.items.filter(i=>prog[i.id]).length});
  const totProg=()=>{const a=course.modules.flatMap(m=>m.items);return{t:a.length,d:a.filter(i=>prog[i.id]).length};};

  const launch=()=>{setSess({code:mkCode()});setMode("admin");setATab("live");};
  const join=()=>{if(!pName.trim()||!pTeam)return;const id=Date.now();setParts(p=>[...p,{id,name:pName.trim(),team:pTeam,xp:0,tt:0}]);setPid(id);setMode("par");};
  const pushQ=(iid,qi)=>{setLqId(iid);setLqi(qi);setRev(false);const it=course.modules.flatMap(m=>m.items).find(i=>i.id===iid);const q=it?.qs?.[qi];if(q){setTmr(q.type==="mc"?45:30);setTmOn(true);}};
  const answer=(qId,a)=>{const k=`${pid}-${qId}`;if(resp[k]!==undefined)return;setResp(p=>({...p,[k]:a}));setPAns(p=>({...p,[qId]:a}));if(lQ?.id===qId){const ok=lQ.ok>=0&&a===lQ.ok;const x=lQ.type==="mc"?(ok?(lQ.xp||100)+(tmr>30?50:0):0):(lQ.xp||0);setXp(p=>p+x);setParts(p=>p.map(pp=>pp.id!==pid?pp:{...pp,xp:pp.xp+x,tt:pp.tt+1}));}};
  const csv=()=>{let c="Name,Team,XP\n";parts.forEach(p=>{c+=`"${p.name}","${p.team}",${p.xp}\n`;});const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([c],{type:"text/csv"}));a.download="pedrra.csv";a.click();};
  const PL={before:"Before Training",live:"Training Day",after:"After Training"};
  const IC={doc:"📄",slides:"📊",quiz:"❓",survey:"📋"};

  /* Survey question renderer */
  const SurveyQ = ({q}) => (
    <div style={{marginBottom:q.type==="header"?4:12,padding:q.type==="header"?"4px 12px 0":12,background:q.type==="header"?"transparent":P.gl,borderRadius:8,borderLeft:q.type==="header"?`3px solid ${P.b}`:"none"}}>
      {q.type==="header"?<p style={{margin:"4px 0 0",fontSize:12,fontWeight:700,color:P.b,textTransform:"uppercase",letterSpacing:1}}>{q.text}</p>:<p style={{margin:"0 0 8px",fontSize:14,color:P.gd,lineHeight:1.5}}>{q.text}</p>}
      {q.type==="scale"&&<div style={{display:"flex",gap:6}}>{[1,2,3,4,5].map(v=><button key={v} onClick={()=>setPAns(p=>({...p,[q.id]:v}))} style={{width:40,height:40,borderRadius:8,border:pAns[q.id]===v?`2px solid ${P.b}`:"1px solid #d1d5db",background:pAns[q.id]===v?P.lt:"#fff",color:P.gd,fontSize:15,fontWeight:600,cursor:"pointer"}}>{v}</button>)}</div>}
      {q.type==="tf"&&<div style={{display:"flex",gap:8}}>{(q.opts||["True","False"]).map((o,oi)=><button key={oi} onClick={()=>setPAns(p=>({...p,[q.id]:oi}))} style={{flex:1,padding:12,borderRadius:8,border:pAns[q.id]===oi?`2px solid ${P.b}`:"1px solid #d1d5db",background:pAns[q.id]===oi?P.lt:"#fff",color:P.gd,fontSize:14,fontWeight:600,cursor:"pointer"}}>{o}</button>)}</div>}
      {q.type==="choice"&&<div style={{display:"flex",flexDirection:"column",gap:6}}>{(q.opts||[]).map((o,oi)=><button key={oi} onClick={()=>setPAns(p=>({...p,[q.id]:oi}))} style={{padding:"10px 14px",borderRadius:8,border:pAns[q.id]===oi?`2px solid ${P.b}`:"1px solid #d1d5db",background:pAns[q.id]===oi?P.lt:"#fff",color:P.gd,fontSize:14,textAlign:"left",cursor:"pointer"}}>{o}</button>)}</div>}
      {q.type==="text"&&<textarea style={{...IN,minHeight:50,resize:"vertical"}} value={pAns[q.id]||""} onChange={e=>setPAns(p=>({...p,[q.id]:e.target.value}))}/>}
    </div>
  );

  if(!mode)return(<div style={{minHeight:"100vh",background:P.w,fontFamily:"'Segoe UI',system-ui,sans-serif"}}><div style={HD}><span style={{color:"#fff",fontWeight:700,fontSize:13,letterSpacing:1.5}}>EUROPEAN DATA PROTECTION SUPERVISOR</span></div><div style={{maxWidth:480,margin:"0 auto",padding:"48px 24px",textAlign:"center"}}><div style={{width:64,height:64,borderRadius:"50%",background:P.lt,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:28}}>🛡️</div><h1 style={{fontSize:40,fontWeight:800,color:P.b,margin:"0 0 4px"}}>PEDRRA</h1><p style={{fontSize:14,color:P.gd,margin:"0 0 4px"}}>PErsonal Data bReach Risk Assessment</p><p style={{fontSize:12,color:P.gm,margin:"0 0 32px"}}>Learning Management System</p><div style={{display:"flex",flexDirection:"column",gap:10,maxWidth:280,margin:"0 auto"}}><button onClick={()=>{setMode("admin");setATab("course");}} style={BT(P.b)}>🔧 Admin Panel</button><button onClick={launch} style={BT(P.gn)}>🎓 Launch Live Session</button><button onClick={()=>setMode("join")} style={BO()}>📱 Join as Participant</button></div><div style={{marginTop:32,padding:"10px 14px",background:P.lt,borderRadius:10,textAlign:"left"}}><p style={{margin:0,fontSize:11,color:P.gd,lineHeight:1.6}}><strong>🔒 Privacy by Design:</strong> No accounts, no tracking. QR codes local. EUDPR compliant.</p></div></div></div>);

  if(mode==="join")return(<div style={{minHeight:"100vh",background:P.gl,fontFamily:"'Segoe UI',system-ui,sans-serif"}}><div style={HD}><span style={{color:"#fff",fontWeight:600,fontSize:13}}>PEDRRA</span></div><div style={{maxWidth:360,margin:"0 auto",padding:"32px 20px"}}><button onClick={()=>setMode(null)} style={{background:"none",border:"none",color:P.b,cursor:"pointer",fontSize:13,marginBottom:12}}>← Back</button><div style={CD}><h2 style={{margin:"0 0 16px",fontSize:20,color:P.gd}}>Join Session</h2><label style={{fontSize:12,color:P.gm,display:"block",marginBottom:2}}>Code</label><input style={{...IN,fontSize:18,fontFamily:"monospace",letterSpacing:4,textAlign:"center",textTransform:"uppercase",marginBottom:10}} placeholder="ABC123" maxLength={6}/><label style={{fontSize:12,color:P.gm,display:"block",marginBottom:2}}>Name</label><input style={{...IN,marginBottom:10}} placeholder="First name" value={pName} onChange={e=>setPName(e.target.value)}/><label style={{fontSize:12,color:P.gm,display:"block",marginBottom:2}}>Team</label><select style={{...IN,background:"#fff",marginBottom:16}} value={pTeam} onChange={e=>setPTeam(e.target.value)}><option value="">Select...</option>{[1,2,3,4,5].map(i=><option key={i} value={`Team ${i}`}>Team {i}</option>)}</select><button onClick={join} style={{...BT(P.b),width:"100%"}}>Join</button></div></div></div>);

  if(mode==="par"){const tp=totProg();const myA=lQ?resp[`${pid}-${lQ.id}`]:undefined;
    if(modId&&aMod&&itemId&&aItem)return(<div style={{minHeight:"100vh",background:P.gl,fontFamily:"'Segoe UI',system-ui,sans-serif"}}><div style={{...HD,padding:"8px 14px"}}><button onClick={()=>setItemId(null)} style={{background:"none",border:"none",color:"#fff",cursor:"pointer",fontSize:13}}>← {aMod.title}</button><span style={{color:P.yl,fontWeight:700}}>⚡ {xp}</span></div><div style={{maxWidth:560,margin:"0 auto",padding:14}}>
      {aItem.type==="doc"&&<div style={CD}><h2 style={{margin:"0 0 6px",fontSize:18,color:P.gd}}>{aItem.title}</h2><p style={{margin:"0 0 14px",fontSize:14,color:P.gm}}>{aItem.desc}</p>{aItem.url?<a href={aItem.url} target="_blank" rel="noopener noreferrer" style={{...BT(P.b),display:"inline-block",textDecoration:"none",marginBottom:10}}>Open</a>:<p style={{fontSize:13,color:P.am,fontStyle:"italic"}}>Provided at venue.</p>}<button onClick={()=>{setProg(p=>({...p,[aItem.id]:true}));setItemId(null);}} style={{...BT(P.gn),width:"100%",marginTop:10}}>✓ Mark Read</button></div>}
      {aItem.type==="slides"&&aItem.slides&&<div><Slide s={aItem.slides[si]} big/><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}><button onClick={()=>setSi(Math.max(0,si-1))} disabled={si===0} style={{...BT(P.b),opacity:si===0?.3:1}}>←</button><span style={{fontSize:13,color:P.gm}}>{si+1}/{aItem.slides.length}</span>{si<aItem.slides.length-1?<button onClick={()=>setSi(si+1)} style={BT(P.b)}>→</button>:<button onClick={()=>{setProg(p=>({...p,[aItem.id]:true}));setItemId(null);setSi(0);}} style={BT(P.gn)}>✓ Done</button>}</div></div>}
      {aItem.type==="survey"&&aItem.qs&&<div style={CD}><h2 style={{margin:"0 0 6px",fontSize:18,color:P.gd}}>{aItem.title}</h2><p style={{margin:"0 0 14px",fontSize:13,color:P.gm}}>{aItem.desc}</p>{aItem.qs.map(q=><SurveyQ key={q.id} q={q}/>)}<button onClick={()=>{setProg(p=>({...p,[aItem.id]:true}));setItemId(null);}} style={{...BT(P.gn),width:"100%"}}>✓ Submit</button></div>}
    </div></div>);
    if(modId&&aMod){const mp=modProg(aMod);return(<div style={{minHeight:"100vh",background:P.gl,fontFamily:"'Segoe UI',system-ui,sans-serif"}}><div style={{...HD,padding:"8px 14px"}}><button onClick={()=>setModId(null)} style={{background:"none",border:"none",color:"#fff",cursor:"pointer",fontSize:13}}>← Course</button><span style={{color:P.yl,fontWeight:700}}>⚡ {xp}</span></div><div style={{maxWidth:560,margin:"0 auto",padding:14}}><div style={{...CD,marginBottom:14}}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}><span style={{fontSize:26}}>{aMod.icon}</span><div style={{flex:1}}><h2 style={{margin:"0 0 2px",fontSize:18,color:P.gd}}>{aMod.title}</h2><p style={{margin:0,fontSize:12,color:P.gm}}>{aMod.desc}</p></div></div><PB done={mp.d} total={mp.t}/></div>{aMod.items.map(it=>{const d=prog[it.id];return(<div key={it.id} onClick={()=>{setItemId(it.id);setSi(0);}} style={{...CD,marginBottom:6,padding:14,cursor:"pointer",display:"flex",alignItems:"center",gap:10,opacity:d?.7:1,borderLeft:`4px solid ${d?P.gn:P.b}`}}><span style={{fontSize:20}}>{IC[it.type]||"📄"}</span><div style={{flex:1}}><p style={{margin:"0 0 1px",fontWeight:600,fontSize:14,color:P.gd}}>{it.title}</p><p style={{margin:0,fontSize:12,color:P.gm}}>{it.desc||""}</p></div>{d?<span style={{color:P.gn,fontSize:16}}>✓</span>:<span style={{color:P.gm}}>›</span>}</div>);})}{lQ&&<div style={{...CD,marginTop:14,border:`2px solid ${P.am}`,background:"#FFFBF0"}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}><span style={{width:8,height:8,borderRadius:"50%",background:P.rd}}/><span style={{fontSize:13,fontWeight:700,color:P.am}}>LIVE</span>{tmOn&&<span style={{marginLeft:"auto",fontWeight:800,fontSize:18,color:tmr<10?P.rd:P.gd}}>{tmr}</span>}</div>{myA===undefined?<><p style={{fontSize:14,color:P.gd,lineHeight:1.5,margin:"0 0 10px"}}>{lQ.text}</p><div style={{display:"grid",gridTemplateColumns:lQ.opts.length<=3?"1fr":"1fr 1fr",gap:8}}>{lQ.opts.map((o,i)=>{const s=ANS[i]||ANS[0];return<button key={i} onClick={()=>answer(lQ.id,i)} style={{padding:lQ.type==="mc"?"18px":"12px",borderRadius:10,border:"none",background:lQ.type==="mc"?s.bg:P.b,color:"#fff",fontSize:lQ.type==="mc"?16:14,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,boxShadow:"0 3px 10px rgba(0,0,0,.2)"}}>{lQ.type==="mc"&&<span style={{fontSize:20}}>{s.s}</span>}{lQ.type==="mc"?s.l:o}</button>;})}</div></>:<div style={{textAlign:"center",padding:14}}><span style={{fontSize:28}}>✓</span><p style={{color:P.gd,fontWeight:600}}>Recorded!</p>{rev&&lQ.ok>=0&&<div style={{padding:8,borderRadius:8,background:myA===lQ.ok?"#ecfdf5":"#fef2f2",border:`1px solid ${myA===lQ.ok?P.gn:P.rd}`,marginTop:6}}><p style={{margin:0,fontWeight:600,color:myA===lQ.ok?P.gn:P.rd,fontSize:13}}>{myA===lQ.ok?"Correct!":"Answer: "+lQ.opts[lQ.ok]}</p></div>}</div>}</div>}</div></div>);}
    return(<div style={{minHeight:"100vh",background:P.gl,fontFamily:"'Segoe UI',system-ui,sans-serif"}}><div style={{...HD,padding:"8px 14px"}}><span style={{color:"#fff",fontWeight:700,fontSize:14}}>{me?.name||""} <span style={{color:"#7dd3fc",fontSize:12}}>{me?.team||""}</span></span><span style={{color:P.yl,fontWeight:700}}>⚡ {xp}</span></div><div style={{maxWidth:560,margin:"0 auto",padding:14}}><div style={{...CD,marginBottom:14,background:`linear-gradient(135deg,${P.b},${P.dk})`,color:"#fff",border:"none"}}><h1 style={{margin:"0 0 4px",fontSize:22,fontWeight:800}}>{course.title}</h1><p style={{margin:"0 0 10px",fontSize:12,opacity:.8}}>{course.desc}</p><PB done={tp.d} total={tp.t} color={P.yl}/><p style={{margin:"6px 0 0",fontSize:11,opacity:.7}}>{tp.d}/{tp.t} items</p></div>{["before","live","after"].map(ph=>{const ms=course.modules.filter(m=>m.phase===ph);if(!ms.length)return null;return<div key={ph} style={{marginBottom:16}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}><div style={{width:10,height:10,borderRadius:"50%",background:PC[ph]}}/><span style={{fontSize:11,fontWeight:700,color:PC[ph],textTransform:"uppercase",letterSpacing:1}}>{PL[ph]}</span></div>{ms.map(m=>{const p=modProg(m);return(<div key={m.id} onClick={()=>setModId(m.id)} style={{...CD,marginBottom:6,padding:14,cursor:"pointer",display:"flex",alignItems:"center",gap:12,borderLeft:`4px solid ${p.d===p.t&&p.t>0?P.gn:PC[ph]}`}}><span style={{fontSize:24}}>{m.icon}</span><div style={{flex:1}}><p style={{margin:"0 0 4px",fontWeight:700,fontSize:14,color:P.gd}}>{m.title}</p><PB done={p.d} total={p.t} color={PC[ph]}/></div>{p.d===p.t&&p.t>0?<span style={{color:P.gn,fontSize:18}}>✓</span>:<span style={{fontSize:13,color:P.gm}}>{p.d}/{p.t}</span>}</div>);})}</div>;})}</div></div>);
  }

  if(mode==="proj"){if(!lQ)return(<div style={{minHeight:"100vh",background:`linear-gradient(180deg,${P.dk},${P.b})`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"#fff",fontFamily:"'Segoe UI',system-ui,sans-serif"}}><button onClick={()=>setMode("admin")} style={{position:"fixed",top:10,right:10,background:"rgba(255,255,255,.15)",border:"none",color:"#fff",borderRadius:8,padding:"6px 14px",fontSize:12,cursor:"pointer"}}>Back</button><p style={{fontSize:12,letterSpacing:3,textTransform:"uppercase",opacity:.7}}>European Data Protection Supervisor</p><h1 style={{fontSize:48,fontWeight:800,margin:"4px 0"}}>PEDRRA</h1><p style={{fontSize:15,opacity:.8,marginBottom:28}}>Scan to join</p><div style={{background:"#fff",borderRadius:20,padding:20,boxShadow:"0 12px 48px rgba(0,0,0,.3)"}}><QRCode data={jurl} size={220} fg={P.b}/></div><div style={{marginTop:20,fontSize:48,fontWeight:800,letterSpacing:10,fontFamily:"monospace",background:"rgba(255,255,255,.12)",borderRadius:14,padding:"8px 24px"}}>{sess?.code||""}</div><p style={{position:"fixed",bottom:20,fontSize:14,opacity:.7}}>{parts.length} connected</p></div>);
  return(<div style={{minHeight:"100vh",background:P.w,fontFamily:"'Segoe UI',system-ui,sans-serif",padding:"20px 32px"}}><button onClick={()=>setMode("admin")} style={{position:"fixed",top:10,right:10,background:P.gl,border:"none",borderRadius:8,padding:"6px 14px",fontSize:12,cursor:"pointer",color:P.gd}}>Back</button><div style={{maxWidth:860,margin:"0 auto"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontSize:13,color:P.gm}}>{lQ.id}</span><div style={{display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:13,color:P.gm}}>{grc(lQ.id)}/{parts.length}</span>{tmOn&&<span style={{fontSize:28,fontWeight:800,color:tmr<10?P.rd:P.gd}}>{tmr}</span>}</div></div>{tmOn&&<div style={{height:5,background:P.gl,borderRadius:3,marginBottom:18,overflow:"hidden"}}><div style={{height:"100%",background:tmr<10?P.rd:P.b,width:`${tmr/(lQ.type==="mc"?45:30)*100}%`,transition:"width 1s linear"}}/></div>}<h2 style={{fontSize:26,lineHeight:1.4,margin:"0 0 24px",color:P.gd}}>{lQ.text}</h2><div style={{display:"grid",gridTemplateColumns:lQ.opts.length<=3?`repeat(${lQ.opts.length},1fr)`:"1fr 1fr",gap:10}}>{lQ.opts.map((o,i)=>{const s=ANS[i]||ANS[0];const d=grd(lQ.id);const t=Object.values(d).reduce((s,v)=>s+v,0)||1;const pct=~~((d[i]||0)/t*100);const ok=rev&&lQ.ok>=0&&i===lQ.ok;return<div key={i} style={{padding:"18px 16px",borderRadius:12,background:s.bg,color:"#fff",opacity:rev&&lQ.ok>=0&&!ok?.35:1,boxShadow:"0 4px 14px rgba(0,0,0,.2)",transition:"opacity .3s"}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:22}}>{s.s}</span><span style={{fontSize:15,fontWeight:600,flex:1}}>{o}</span></div>{rev&&<div style={{fontSize:26,fontWeight:800,marginTop:6}}>{pct}%</div>}</div>;})}</div><div style={{position:"fixed",bottom:12,right:12,opacity:.4}}><QRCode data={jurl} size={56} fg={P.gm}/></div></div></div>);}

  if(mode==="admin")return(<div style={{minHeight:"100vh",background:P.gl,fontFamily:"'Segoe UI',system-ui,sans-serif"}}><div style={HD}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{color:"#fff",fontWeight:700,fontSize:14}}>PEDRRA Admin</span>{sess&&<span style={{color:P.yl,fontSize:12}}>Session: <span style={{fontFamily:"monospace",fontWeight:700,letterSpacing:2}}>{sess.code}</span> · {parts.length}</span>}</div><div style={{display:"flex",gap:5}}>{sess&&<button onClick={()=>setMode("proj")} style={BT("#6366f1")}>📺 Projector</button>}{!sess&&<button onClick={launch} style={BT(P.gn)}>🎓 Launch</button>}<button onClick={()=>setMode(null)} style={{background:"rgba(255,255,255,.15)",border:"none",color:"#fff",borderRadius:8,padding:"6px 12px",fontSize:12,cursor:"pointer"}}>← Home</button></div></div>
  <div style={{background:P.w,borderBottom:`1px solid ${P.gl}`,display:"flex",padding:"0 16px",gap:2}}>{[["course","📖S Course"],["people","👥 Participants"],...(sess?[["live","🔴 Live"]]:[])]
    .map(([k,l])=><button key={k} onClick={()=>setATab(k)} style={TB(aTab===k)}>{l}</button>)}</div>
  <div style={{maxWidth:860,margin:"0 auto",padding:16}}>
    {aTab==="course"&&<div><div style={{...CD,marginBottom:14}}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><div><label style={{fontSize:11,color:P.gm}}>Title</label><input style={IN} value={course.title} onChange={e=>setCourse({...course,title:e.target.value})}/></div><div><label style={{fontSize:11,color:P.gm}}>Description</label><input style={IN} value={course.desc} onChange={e=>setCourse({...course,desc:e.target.value})}/></div></div></div>{course.modules.map((m,mi)=>{const isE=eMod===m.id;return<div key={m.id} style={{...CD,marginBottom:8,borderLeft:`4px solid ${PC[m.phase]||P.b}`}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:22}}>{m.icon}</span><div style={{flex:1}}>{isE?<input style={{...IN,fontWeight:700}} value={m.title} onChange={e=>{const ms=[...course.modules];ms[mi]={...ms[mi],title:e.target.value};setCourse({...course,modules:ms});}}/>:<><h4 style={{margin:"0 0 2px",fontSize:14,color:P.gd}}>{m.title} <span style={{fontSize:10,padding:"2px 6px",borderRadius:8,background:PC[m.phase]+"18",color:PC[m.phase],fontWeight:700}}>{m.phase}</span></h4><p style={{margin:0,fontSize:12,color:P.gm}}>{m.desc} · {m.items.length} items</p></>}</div>{isE?<button onClick={()=>setEMod(null)} style={BT(P.gn)}>✓</button>:<button onClick={()=>setEMod(m.id)} style={{...BO(P.b),padding:"4px 10px",fontSize:12}}>Edit</button>}</div>{isE&&<div style={{marginTop:10,borderTop:`1px solid ${P.gl}`,paddingTop:8}}>{m.items.map(it=><div key={it.id} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 8px",marginBottom:2,background:P.gl,borderRadius:6,fontSize:12}}><span style={{flex:1,fontWeight:600}}>{it.title}</span><span style={{color:P.gm}}>{it.type}</span></div>)}</div>}</div>;})}
    </div>}
    {aTab==="people"&&<div><div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}><h2 style={{margin:0,fontSize:18,color:P.gd}}>Participants ({parts.length})</h2><button onClick={csv} style={BT(P.gn)}>📥 CSV</button></div>{!parts.length?<div style={{...CD,textAlign:"center",padding:32,color:P.gm}}>No participants yet.</div>:<div style={CD}>{[...parts].sort((a,b)=>b.xp-a.xp).map(p=>(<div key={p.id} style={{display:"flex",padding:"8px 0",borderBottom:`1px solid ${P.gl}`,fontSize:13,color:P.gd,gap:8}}><span style={{flex:2,fontWeight:600}}>{p.name}</span><span style={{flex:1}}>{p.team}</span><span style={{fontWeight:700,color:P.am}}>⚡{p.xp}</span><span>{p.tt} ans</span></div>))}</div>}</div>}
    {aTab==="live"&&sess&&<div><div style={{...CD,display:"flex",alignItems:"center",gap:16,padding:14,marginBottom:14}}><QRCode data={jurl} size={72} fg={P.b}/><div><p style={{margin:"0 0 2px",fontWeight:700,color:P.gd}}>Session: <span style={{fontFamily:"monospace",fontSize:18,color:P.b,letterSpacing:2}}>{sess.code}</span></p><p style={{margin:0,fontSize:13,color:P.gm}}>{parts.length} participants</p></div><div style={{flex:1}}/><button onClick={()=>setMode("proj")} style={BT("#6366f1")}>📺</button></div><h3 style={{fontSize:15,color:P.gd,margin:"0 0 10px"}}>Push Questions</h3>{course.modules.map(m=>{const qi=m.items.filter(i=>i.qs);if(!qi.length)return null;return<div key={m.id} style={{marginBottom:14}}><p style={{fontSize:13,fontWeight:700,color:PC[m.phase],margin:"0 0 6px"}}>{m.icon} {m.title}</p>{qi.map(it=><div key={it.id} style={{...CD,marginBottom:4,padding:12}}><p style={{fontWeight:700,fontSize:13,color:P.gd,margin:"0 0 6px"}}>{it.title} <span style={{fontSize:11,color:P.gm,fontWeight:400}}>· {it.qs.length} qs</span></p>{it.qs.map((q,qi2)=>{const isA=lqId===it.id&&lqi===qi2;return<div key={q.id} onClick={()=>pushQ(it.id,qi2)} style={{padding:"5px 8px",marginBottom:2,borderRadius:6,cursor:"pointer",border:isA?`2px solid ${P.b}`:"1px solid transparent",background:isA?P.lt:"#f9fafb",fontSize:12,display:"flex",justifyContent:"space-between"}}><span style={{color:P.gd}}>{qi2+1}. {q.text.length>55?q.text.substring(0,55)+"...":q.text}</span>{isA&&<span style={{color:P.b,fontWeight:700}}>{grc(q.id)}/{parts.length}</span>}</div>;})}</div>)}</div>;})}
    {lQ&&<div style={{...CD,marginTop:10,display:"flex",gap:6,alignItems:"center",padding:12}}><span style={{fontSize:12,color:P.gd,flex:1}}><strong>Active:</strong> {lQ.text.substring(0,40)}... ({grc(lQ.id)}/{parts.length})</span>{!rev&&lQ.ok>=0&&<button onClick={()=>setRev(true)} style={BT(P.gn)}>✓ Reveal</button>}{lItem?.qs&&lqi<lItem.qs.length-1&&<button onClick={()=>pushQ(lqId,lqi+1)} style={BT(P.b)}>Next →</button>}</div>}</div>}
  </div></div>);
  return null;
}
