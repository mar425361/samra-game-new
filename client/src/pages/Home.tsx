// Design: نشرة الساحة — تحرير رياضي عربي بعاجي دافئ، حبر كحلي، وقرمزي نبطي للحسم.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Check, ChevronLeft, CircleDot, Crown, Flame, Gamepad2,
  LayoutPanelTop, MonitorPlay, Pause, Play, Radio, RotateCcw, Sparkles,
  Trophy, Users, Volume2, X, Zap,
} from "lucide-react";

type Question = { q: string; a: string };
type QuestionBank = Record<string, Question[]>;
type TeamKey = 1 | 2;
type GameStage = "setup" | "ready" | "category" | "duel" | "question" | "answer" | "review" | "finished";

type ScreenState = {
  category: string;
  question: string;
  answer: string;
  playerOne: string;
  playerTwo: string;
  teamOneName: string;
  teamTwoName: string;
  teamOneMembers: string[];
  teamTwoMembers: string[];
  scoreOne: number;
  scoreTwo: number;
  showAnswer: boolean;
  mode: "idle" | "category" | "duel" | "question" | "finished";
  winner?: string;
  mvp?: string;
};

const HERO = "/manus-storage/samra-hero-arena_6c8172ef.jpg";
const QUESTION_ART = "/manus-storage/samra-question-collage_6443a9c6.jpg";
const MOBILE_ART = "/manus-storage/samra-mobile-texture_0713c965.jpg";
const PATTERN = "/manus-storage/samra-score-pattern_46009582.jpg";
const LOGO = "/manus-storage/samra-logo-mark_e84d2406.png";

const serverUrl = "https://samra-server.onrender.com";
const stageCopy: Record<GameStage, { kicker: string; title: string; detail: string }> = {
  setup: { kicker: "إعداد الساحة", title: "ثبّت الفرق أولاً", detail: "سمِّ الفرق وأضف أسماء المتنافسين ثم انتقل إلى اختيار الفئة." },
  ready: { kicker: "الجولة التالية", title: "الساحة جاهزة", detail: "دوّر بطاقة الفئة لبدء مواجهة جديدة." },
  category: { kicker: "الفئة ثبتت", title: "اختر من يمثل الفريق", detail: "المقدّم يرى السؤال والإجابة فقط في بطاقته الخاصة." },
  duel: { kicker: "المواجهة ثبتت", title: "أطلق السؤال على الشاشة", detail: "تأكد من اللاعبين ثم اعرض السؤال ليبدأ التحدي." },
  question: { kicker: "السؤال مباشر", title: "راقب الوقت ثم ثبّت الإجابة", detail: "لا تظهر الإجابة على الشاشة إلا عندما يقرر المقدّم." },
  answer: { kicker: "الإجابة ظاهرة", title: "احسم نقطة الجولة", detail: "امنح النقاط للفريق الذي أجاب بشكل صحيح." },
  review: { kicker: "الجولة انتهت", title: "النتيجة سجّلت", detail: "ابدأ الفئة التالية عندما تكون الساحة مستعدة." },
  finished: { kicker: "صافرة النهاية", title: "لدينا فريق فائز", detail: "راجع النتيجة ثم ابدأ مباراة جديدة عند الحاجة." },
};

const emptyScreen: ScreenState = {
  category: "في انتظار المايسترو", question: "حين يثبت المقدّم الفئة، يظهر السؤال هنا.", answer: "",
  playerOne: "فريق واحد", playerTwo: "فريق اثنان", teamOneName: "فريق الصقور", teamTwoName: "فريق النمور",
  teamOneMembers: [], teamTwoMembers: [], scoreOne: 0, scoreTwo: 0, showAnswer: false, mode: "idle",
};

function splitPlayers(value: string) {
  return value.split(/[,،\n]/).map((name) => name.trim()).filter(Boolean).slice(0, 10);
}

function getRoom() {
  return new URLSearchParams(window.location.search).get("room") || "samra_room_1";
}

function useSocket(onUpdate: (data: any) => void) {
  const socketRef = useRef<any>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const io = (window as any).io;
    if (!io) return;
    const socket = io(serverUrl, { transports: ["websocket", "polling"] });
    socketRef.current = socket;
    const join = () => { setConnected(true); socket.emit("join_room", getRoom()); };
    socket.on("connect", join);
    socket.on("disconnect", () => setConnected(false));
    socket.on("game_update", onUpdate);
    return () => { socket.off("connect", join); socket.off("game_update", onUpdate); socket.disconnect(); };
  }, [onUpdate]);

  const emit = (action: string, data: Record<string, unknown> = {}) => {
    socketRef.current?.emit("game_action", { room: getRoom(), action, ...data });
  };
  return { connected, emit };
}

function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <div className={`brand-mark ${small ? "brand-mark--small" : ""}`}>
      <img src={LOGO} alt="رمز صدام الأفكار" />
      {!small && <div><span>صدام</span><strong>الأفكار</strong></div>}
    </div>
  );
}

function StatusPill({ connected }: { connected: boolean }) {
  return <div className={`status-pill ${connected ? "is-online" : ""}`}><span /><span>{connected ? "البث متصل" : "جارٍ الربط"}</span></div>;
}

function TeamScore({ title, score, team, winner }: { title: string; score: number; team: TeamKey; winner?: boolean }) {
  return (
    <section className={`score-plate score-plate--${team} ${winner ? "is-winner" : ""}`}>
      <div className="score-plate__label"><span>{winner && <Crown size={14} />}{title}</span><i>فريق {team === 1 ? "01" : "02"}</i></div>
      <div className="score-plate__number">{String(score).padStart(2, "0")}</div>
      <div className="score-plate__rule" />
    </section>
  );
}

function DisplayScreen() {
  const [screen, setScreen] = useState<ScreenState>(emptyScreen);
  const [connectedCopy, setConnectedCopy] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const presenterUrl = `${window.location.origin}${window.location.pathname}?mode=presenter&room=${encodeURIComponent(getRoom())}`;
  const onUpdate = useMemo(() => (data: any) => {
    setConnectedCopy((value) => value + 1);
    setScreen((previous) => {
      const next = { ...previous };
      if (data.action === "UPDATE_TEAMS") {
        next.teamOneName = data.t1 || previous.teamOneName; next.teamTwoName = data.t2 || previous.teamTwoName;
        next.teamOneMembers = data.m1 || []; next.teamTwoMembers = data.m2 || [];
      }
      if (data.action === "SCORE") { next.scoreOne = data.s1 ?? previous.scoreOne; next.scoreTwo = data.s2 ?? previous.scoreTwo; }
      if (data.action === "SPIN_WHEEL") { next.mode = "category"; next.showAnswer = false; }
      if (data.action === "SHOW_CATEGORY") { next.category = data.cat || previous.category; next.mode = "category"; }
      if (data.action === "NOMINATE") { next.category = data.cat || previous.category; next.playerOne = data.p1 || ""; next.playerTwo = data.p2 || ""; next.mode = "duel"; }
      if (data.action === "SHOW_Q") { setCountdown(30); next.question = data.q || previous.question; next.answer = data.a || ""; next.showAnswer = false; next.mode = "question"; }
      if (data.action === "SHOW_A") { setCountdown(null); next.showAnswer = true; next.mode = "question"; }
      if (data.action === "GAME_OVER") { next.mode = "finished"; next.winner = data.winner; next.mvp = data.mvp; next.scoreOne = data.t1Name === data.winner ? data.winScore : data.loseScore; next.scoreTwo = data.t2Name === data.winner ? data.winScore : data.loseScore; }
      if (data.action === "RESTART_GAME") return { ...emptyScreen, teamOneName: previous.teamOneName, teamTwoName: previous.teamTwoName, teamOneMembers: previous.teamOneMembers, teamTwoMembers: previous.teamTwoMembers };
      return next;
    });
  }, []);
  const { connected } = useSocket(onUpdate);
  useEffect(() => {
    if (screen.mode !== "question" || screen.showAnswer || countdown === null || countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown((seconds) => seconds === null ? null : Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, screen.mode, screen.showAnswer]);
  const modeLabel = screen.mode === "question" ? "السؤال على الهواء" : screen.mode === "duel" ? "اختيار المتنافسين" : screen.mode === "finished" ? "نهاية المباراة" : "إعداد الجولة";

  return (
    <main className="broadcast-shell" style={{ backgroundImage: `linear-gradient(90deg, rgba(9,27,48,.95) 0%, rgba(9,27,48,.84) 43%, rgba(9,27,48,.35) 100%), url(${HERO})` }}>
      <header className="broadcast-topbar">
        <BrandMark />
        <a className="presenter-entry" href={presenterUrl} aria-label="فتح لوحة المقدّم على الجوال"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&margin=0&data=${encodeURIComponent(presenterUrl)}`} alt="رمز QR لفتح لوحة المقدّم" /><span>لوحة<br />المقدّم</span></a>
        <div className="broadcast-status"><div className="live-stamp"><Radio size={14} /> مباشر</div><span className="broadcast-status__line" /><span>{modeLabel}</span><StatusPill connected={connected} /></div>
      </header>
      <section className="broadcast-grid">
        <aside className="broadcast-scoreboard">
          <p className="scoreboard-kicker">لوحة النتيجة</p>
          <TeamScore title={screen.teamOneName} score={screen.scoreOne} team={1} winner={screen.winner === screen.teamOneName} />
          <div className="versus-mark">ضد</div>
          <TeamScore title={screen.teamTwoName} score={screen.scoreTwo} team={2} winner={screen.winner === screen.teamTwoName} />
        </aside>
        <section className={`question-stage question-stage--${screen.mode}`} style={{ backgroundImage: `linear-gradient(120deg, rgba(243,235,220,.98), rgba(250,246,237,.89)), url(${QUESTION_ART})` }}>
          <div className="question-stage__head"><div className="round-badge"><span /> الجولة المباشرة</div><p>{screen.category}</p></div>
          {screen.mode === "duel" && <div className="duel-line"><div>{screen.playerOne}</div><strong>VS</strong><div>{screen.playerTwo}</div></div>}
          {screen.mode === "finished" ? <div className="final-reveal"><Trophy size={46} /><p>فوز مستحق</p><h1>{screen.winner}</h1><span>نجم المواجهة: {screen.mvp || "—"}</span></div> : <>
            <div className="question-index">ســـؤال <b>0{Math.min(connectedCopy + 1, 9)}</b></div>
            <h1>{screen.question}</h1>
            {screen.showAnswer ? <div className="answer-reveal"><span>الإجابة المعتمدة</span><strong>{screen.answer}</strong></div> : <div className="question-stage__prompt"><CircleDot size={17} /> الإجابة عند المايسترو — فكّر بسرعة</div>}
            {screen.mode === "question" && !screen.showAnswer && <div className={`stage-timer ${countdown !== null && countdown <= 10 ? "is-urgent" : ""}`}><span>الوقت</span><b>{String(countdown ?? 30).padStart(2, "0")}</b><i>ث</i></div>}
          </>}
          <div className="stage-corner">صدام الأفكار <i /></div>
        </section>
      </section>
      <footer className="broadcast-footer"><span>مسابقة الفرق المباشرة</span><span>الغرفة · {getRoom()}</span><span>المقدّم يتحكم من الجوال</span></footer>
    </main>
  );
}

function StepRail({ stage }: { stage: GameStage }) {
  const steps: Array<{ id: GameStage; label: string }> = [
    { id: "setup", label: "الفرق" }, { id: "category", label: "الفئة" }, { id: "duel", label: "المواجهة" }, { id: "answer", label: "الحسم" },
  ];
  const active = stage === "ready" ? 0 : stage === "review" || stage === "finished" ? 3 : Math.max(0, steps.findIndex((item) => item.id === stage));
  return <div className="step-rail">{steps.map((step, index) => <div key={step.id} className={index <= active ? "is-active" : ""}><span>{String(index + 1).padStart(2, "0")}</span><b>{step.label}</b>{index < steps.length - 1 && <i />}</div>)}</div>;
}

function PresenterScreen() {
  const [bank, setBank] = useState<QuestionBank>({});
  const [loadError, setLoadError] = useState(false);
  const [stage, setStage] = useState<GameStage>("setup");
  const [teamOneName, setTeamOneName] = useState("فريق الصقور");
  const [teamTwoName, setTeamTwoName] = useState("فريق النمور");
  const [playersOneInput, setPlayersOneInput] = useState("عمار، راكان، فهد");
  const [playersTwoInput, setPlayersTwoInput] = useState("نورة، سارة، جود");
  const [target, setTarget] = useState(10);
  const [category, setCategory] = useState("");
  const [current, setCurrent] = useState<Question | null>(null);
  const [selectedOne, setSelectedOne] = useState("");
  const [selectedTwo, setSelectedTwo] = useState("");
  const [scores, setScores] = useState({ one: 0, two: 0 });
  const [used, setUsed] = useState<Record<string, number[]>>({});
  const [notice, setNotice] = useState("ثبّت أسماء الفرق ثم افتح الجولة الأولى.");
  const [showSetup, setShowSetup] = useState(true);
  const playersOne = useMemo(() => splitPlayers(playersOneInput), [playersOneInput]);
  const playersTwo = useMemo(() => splitPlayers(playersTwoInput), [playersTwoInput]);
  const categories = useMemo(() => Object.keys(bank), [bank]);
  const onUpdate = useMemo(() => (_data: any) => {}, []);
  const { connected, emit } = useSocket(onUpdate);

  useEffect(() => {
    fetch("/questions.json").then((result) => {
      if (!result.ok) throw new Error("questions");
      return result.json();
    }).then((data) => { setBank(data); setCategory(Object.keys(data)[0] || ""); }).catch(() => setLoadError(true));
  }, []);

  const syncTeams = () => {
    if (!playersOne.length || !playersTwo.length || !Number.isInteger(target) || target < 1) { setNotice("أضف لاعباً واحداً على الأقل في كل فريق، وحدد هدفاً صحيحاً."); return; }
    emit("UPDATE_TEAMS", { t1: teamOneName, t2: teamTwoName, m1: playersOne, m2: playersTwo });
    setStage("ready"); setShowSetup(false); setNotice("الفرق ثابتة. الآن اختر الفئة أو دع الساحة تختارها.");
  };

  const draw = (selectedCategory: string) => {
    const list = bank[selectedCategory] || [];
    if (!list.length) return;
    const seen = used[selectedCategory] || [];
    const candidates = list.map((_, index) => index).filter((index) => !seen.includes(index));
    const index = (candidates.length ? candidates : list.map((_, i) => i))[Math.floor(Math.random() * (candidates.length || list.length))];
    setUsed((state) => ({ ...state, [selectedCategory]: [...(candidates.length ? seen : []), index] }));
    setCurrent(list[index]);
  };

  const spin = () => {
    if (!categories.length) { setNotice("بنك الأسئلة لم يكتمل تحميله بعد."); return; }
    const picked = category || categories[Math.floor(Math.random() * categories.length)];
    emit("SPIN_WHEEL"); setNotice("الساحة تختار فئة الجولة…");
    window.setTimeout(() => { setCategory(picked); draw(picked); emit("SHOW_CATEGORY", { cat: picked }); setStage("category"); setSelectedOne(""); setSelectedTwo(""); setNotice("الفئة ثبتت. اختر المتنافسين الآن."); }, 720);
  };

  const nominate = () => {
    if (!current || !selectedOne || !selectedTwo) { setNotice("اختر ممثلاً من كل فريق قبل تثبيت المواجهة."); return; }
    emit("NOMINATE", { cat: category, p1: selectedOne, p2: selectedTwo }); setStage("duel"); setNotice("المواجهة ثابتة. أطلق السؤال عندما يكون الجميع جاهزاً.");
  };
  const launchQuestion = () => { if (!current) return; emit("SHOW_Q", { q: current.q, a: current.a }); setStage("question"); setNotice("السؤال على الشاشة. الإجابة عندك في البطاقة البنفسجية فقط."); };
  const revealAnswer = () => { emit("SHOW_A"); setStage("answer"); setNotice("الإجابة ظاهرة. ثبّت الفريق الذي أخذ النقطة."); };
  const award = (team: TeamKey) => {
    const next = team === 1 ? { one: scores.one + 1, two: scores.two } : { one: scores.one, two: scores.two + 1 };
    setScores(next); emit("SCORE", { s1: next.one, s2: next.two });
    const winningName = team === 1 ? teamOneName : teamTwoName;
    if ((team === 1 ? next.one : next.two) >= target) { emit("GAME_OVER", { winner: winningName, winScore: team === 1 ? next.one : next.two, loseScore: team === 1 ? next.two : next.one, t1Name: teamOneName, t2Name: teamTwoName, t1Members: playersOne, t2Members: playersTwo, mvp: team === 1 ? selectedOne : selectedTwo, mvpCount: 1, allStats: {} }); setStage("finished"); setNotice(`${winningName} وصل لهدف الفوز.`); } else { setStage("review"); setNotice(`سُجلت نقطة لـ ${winningName}. الساحة جاهزة للجولة التالية.`); }
  };
  const restart = () => { setScores({ one: 0, two: 0 }); setCurrent(null); setStage("ready"); setUsed({}); setSelectedOne(""); setSelectedTwo(""); emit("RESTART_GAME"); emit("SCORE", { s1: 0, s2: 0 }); setNotice("مباراة جديدة، نفس الساحة."); };

  const nextAction = stage === "ready" || stage === "review" ? spin : stage === "category" ? nominate : stage === "duel" ? launchQuestion : stage === "question" ? revealAnswer : undefined;
  const nextLabel = stage === "ready" || stage === "review" ? "اسحب فئة جديدة" : stage === "category" ? "ثبّت المتنافسين" : stage === "duel" ? "أطلق السؤال" : stage === "question" ? "أظهر الإجابة" : "";

  return (
    <main className="host-shell" style={{ backgroundImage: `linear-gradient(180deg, rgba(12,34,57,.96), rgba(12,34,57,.82)), url(${MOBILE_ART})` }}>
      <header className="host-header"><a className="host-back" href="?mode=display"><MonitorPlay size={16} /> شاشة العرض</a><BrandMark /><StatusPill connected={connected} /></header>
      <section className="host-hero"><div><p>لوحة المايسترو <span>·</span> غرفة {getRoom()}</p><h1>{stageCopy[stage].title}</h1><small>{stageCopy[stage].detail}</small></div><StepRail stage={stage} /></section>
      <section className="host-workspace">
        <aside className="host-rail">
          <div className="signal-card"><div className="signal-card__top"><Radio size={16} /><span>حالة الساحة</span></div><strong>{stageCopy[stage].kicker}</strong><p>{notice}</p><div className="signal-card__stamp"><span /> مباشر الآن</div></div>
          <div className="quick-score" style={{ backgroundImage: `linear-gradient(120deg, rgba(255,255,255,.98), rgba(255,255,255,.83)), url(${PATTERN})` }}><span>{teamOneName}</span><strong>{String(scores.one).padStart(2, "0")}</strong><i>:</i><strong>{String(scores.two).padStart(2, "0")}</strong><span>{teamTwoName}</span></div>
          <button className="text-button" onClick={() => setShowSetup((value) => !value)}><Users size={17} /> {showSetup ? "إخفاء إعدادات الفرق" : "تعديل الفرق والهدف"}<ChevronLeft size={16} /></button>
          {stage !== "setup" && <button className="text-button text-button--danger" onClick={restart}><RotateCcw size={17} /> مباراة جديدة</button>}
        </aside>
        <section className="host-main">
          {showSetup && <section className="editorial-panel team-editor"><div className="panel-eyebrow">بث مباشر · إدخال الفريقين</div><div className="team-editor__top"><label>هدف الفوز<input type="number" min="1" value={target} onChange={(event) => setTarget(Number(event.target.value))} /></label><p>افصل الأسماء بفاصلة عربية أو إنجليزية.</p></div><div className="team-editor__grid"><TeamEditor label="01" accent="blue" name={teamOneName} names={playersOneInput} onName={setTeamOneName} onPlayers={setPlayersOneInput} /><TeamEditor label="02" accent="red" name={teamTwoName} names={playersTwoInput} onName={setTeamTwoName} onPlayers={setPlayersTwoInput} /></div><button className="primary-action" onClick={syncTeams}><Check size={18} /> ثبّت الفريقين على الهواء</button></section>}

          {!loadError ? <>
            <section className="editorial-panel category-panel"><div><div className="panel-eyebrow">مسار الجولة</div><h2>بطاقة الفئة</h2><p>اختيار عشوائي يضع السؤال مباشرة في بطاقة المقدّم الخاصة.</p></div><div className="category-panel__action"><select value={category} onChange={(event) => setCategory(event.target.value)} disabled={stage !== "ready" && stage !== "review"}>{categories.map((item) => <option key={item}>{item}</option>)}</select><button className="spin-button" disabled={stage !== "ready" && stage !== "review"} onClick={spin}><Sparkles size={18} /> تدوير الساحة</button></div></section>
            {current && <section className="presenter-card"><div className="presenter-card__seal"><Volume2 size={15} /> بطاقة المقدّم — سرية</div><div className="presenter-card__meta"><span>{category}</span><button onClick={() => { draw(category); setNotice("تم تبديل السؤال داخل الفئة نفسها."); }} disabled={stage !== "category"}>بدّل السؤال</button></div><h2>{current.q}</h2><div className="presenter-card__answer"><span>الإجابة الصحيحة</span><strong>{current.a}</strong></div></section>}
            {stage === "category" && <section className="editorial-panel duel-picker"><div className="panel-eyebrow">التمثيل في الجولة</div><h2>من يدخل الساحة؟</h2><div className="duel-picker__columns"><PlayerList title={teamOneName} players={playersOne} selected={selectedOne} setSelected={setSelectedOne} team={1} /><div className="duel-picker__vs">VS</div><PlayerList title={teamTwoName} players={playersTwo} selected={selectedTwo} setSelected={setSelectedTwo} team={2} /></div></section>}
            {(stage === "answer") && <section className="decision-deck"><div><span>قرار الجولة</span><h2>من يستحق النقطة؟</h2></div><button className="award award--one" onClick={() => award(1)}><Check /> {teamOneName}</button><button className="award award--two" onClick={() => award(2)}><Check /> {teamTwoName}</button></section>}
          </> : <section className="load-error"><X size={26} /><h2>لم يتم تحميل بنك الأسئلة</h2><p>أضف ملف questions.json إلى الاستضافة نفسها ثم أعد تحميل الصفحة.</p></section>}
        </section>
      </section>
      {nextAction && <button className="next-action" onClick={nextAction}>{nextLabel}<ArrowLeft size={19} /></button>}
    </main>
  );
}

function TeamEditor({ label, accent, name, names, onName, onPlayers }: { label: string; accent: "blue" | "red"; name: string; names: string; onName: (value: string) => void; onPlayers: (value: string) => void }) {
  return <div className={`team-edit team-edit--${accent}`}><span>فريق {label}</span><input value={name} onChange={(event) => onName(event.target.value)} aria-label={`اسم الفريق ${label}`} /><textarea value={names} onChange={(event) => onPlayers(event.target.value)} aria-label={`أعضاء الفريق ${label}`} rows={2} /></div>;
}

function PlayerList({ title, players, selected, setSelected, team }: { title: string; players: string[]; selected: string; setSelected: (value: string) => void; team: TeamKey }) {
  return <div className={`player-list player-list--${team}`}><header><span>فريق {team === 1 ? "01" : "02"}</span><b>{title}</b></header><div>{players.map((player) => <button key={player} onClick={() => setSelected(player)} className={selected === player ? "is-selected" : ""}>{selected === player ? <Check size={15} /> : <span />}{player}</button>)}</div></div>;
}

export default function Home() {
  const mode = new URLSearchParams(window.location.search).get("mode");
  return mode === "presenter" ? <PresenterScreen /> : <DisplayScreen />;
}
