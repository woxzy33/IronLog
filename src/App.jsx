import React, { useState, useEffect, useCallback } from "react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer
} from "recharts";

// --- Native Icon Fallbacks (Bypassing lucide-react) ---
const Plus = ({ size }) => <span style={{ fontSize: size || 16, lineHeight: 1 }}>➕</span>;
const X = ({ size }) => <span style={{ fontSize: size || 16, lineHeight: 1 }}>❌</span>;
const Check = ({ size }) => <span style={{ fontSize: size || 16, lineHeight: 1 }}>✅</span>;
const Copy = ({ size }) => <span style={{ fontSize: size || 16, lineHeight: 1 }}>📋</span>;
const TimerReset = ({ size }) => <span style={{ fontSize: size || 16, lineHeight: 1 }}>⏱️</span>;
const Loader2 = ({ size }) => <span style={{ fontSize: size || 16, lineHeight: 1 }} className="spin">⏳</span>;
const Dumbbell = ({ size }) => <span style={{ fontSize: size || 16, lineHeight: 1 }}>🏋️</span>;
const History = ({ size }) => <span style={{ fontSize: size || 16, lineHeight: 1 }}>🕒</span>;
const TrendingUp = ({ size }) => <span style={{ fontSize: size || 16, lineHeight: 1 }}>📈</span>;
const Library = ({ size }) => <span style={{ fontSize: size || 16, lineHeight: 1 }}>📚</span>;

const STORAGE_KEY = "gym-data-v2";

const emptyData = () => ({
  exercises: [],
  templates: [],
  sessions: [],
});

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const CATEGORIES = ["Chest", "Back", "Shoulders", "Arms", "Legs", "Core", "Olympic"];
const DEFAULT_EXERCISES = [
  { id: uid(), name: "Barbell Flat Bench Press", category: "Chest" },
  { id: uid(), name: "Incline Dumbbell Press", category: "Chest" },
  { id: uid(), name: "Barbell Back Squat", category: "Legs" },
  { id: uid(), name: "Romanian Deadlift (RDL)", category: "Legs" },
  { id: uid(), name: "Conventional Deadlift", category: "Back" },
  { id: uid(), name: "Wide-Grip Lat Pulldown", category: "Back" },
  { id: uid(), name: "Overhead Barbell Press", category: "Shoulders" },
  { id: uid(), name: "Dumbbell Lateral Raise", category: "Shoulders" },
  { id: uid(), name: "Standing Barbell Curl", category: "Arms" },
  { id: uid(), name: "Cable Triceps Pushdown", category: "Arms" },
  { id: uid(), name: "Hanging Leg Raise", category: "Core" }
];

export default function App() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("train");
  const [activeSession, setActiveSession] = useState(null);
  const [activeTimer, setActiveTimer] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setData({ ...emptyData(), ...JSON.parse(saved) });
      } catch {
        setData({ ...emptyData(), exercises: DEFAULT_EXERCISES });
      }
    } else {
      setData({ ...emptyData(), exercises: DEFAULT_EXERCISES });
    }
  }, []);

  const persist = useCallback((nextData) => {
    setData(nextData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
  }, []);

  if (!data) {
    return (
      <div style={styles.loadingWrap}>
        <Loader2 size={28} />
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <style>{globalCss}</style>
      <Header />
      <div style={styles.content}>
        {tab === "train" && (
          <Train
            data={data}
            persist={persist}
            activeSession={activeSession}
            setActiveSession={setActiveSession}
            startTimer={(sec) => setActiveTimer({ endTime: Date.now() + sec * 1000 })}
          />
        )}
        {tab === "progress" && <ProgressTab data={data} />}
        {tab === "history" && <HistoryPlaceholder data={data} />}
        {tab === "library" && <LibraryTab data={data} persist={persist} />}
      </div>

      {activeTimer && (
        <FloatingTimer timer={activeTimer} onClose={() => setActiveTimer(null)} />
      )}

      <BottomNav tab={tab} setTab={setTab} hasActive={!!activeSession} />
    </div>
  );
}

function Header() {
  return (
    <div style={styles.header}>
      <div style={styles.headerTitle}>IRONLOG BETA</div>
      <div style={styles.headerSub}>progressive overload, tracked</div>
    </div>
  );
}

function Train({ data, persist, activeSession, setActiveSession, startTimer }) {
  if (activeSession) {
    return (
      <ActiveSessionView
        session={activeSession}
        setSession={setActiveSession}
        data={data}
        persist={persist}
        startTimer={startTimer}
      />
    );
  }

  return (
    <div style={styles.pad}>
      <div style={styles.sectionLabel}>START WORKOUT</div>
      <button
        style={styles.bigCta}
        onClick={() =>
          setActiveSession({
            id: uid(),
            name: "Workout Session",
            date: new Date().toISOString(),
            exercises: [],
          })
        }
      >
        <Plus size={20} /> Blank Session
      </button>

      {data.sessions.length === 0 && (
        <div style={styles.emptyHint}>
          Click "Blank Session" to add exercises, test superset links, check previous ghost weights, and trigger rest timers.
        </div>
      )}
    </div>
  );
}

function ActiveSessionView({ session, setSession, data, persist, startTimer }) {
  const [showAdd, setShowAdd] = useState(false);

  const addExercise = (exerciseId) => {
    setSession({
      ...session,
      exercises: [...session.exercises, { id: uid(), exerciseId, sets: [] }],
    });
    setShowAdd(false);
  };

  const updateExerciseSets = (idx, sets) => {
    const nextSession = [...session.exercises];
    nextSession[idx] = { ...nextSession[idx], sets };
    setSession({ ...session, exercises: nextSession });
  };

  const finish = () => {
    const cleaned = {
      ...session,
      exercises: session.exercises.filter((e) => e.sets.length > 0),
    };
    if (cleaned.exercises.length > 0) {
      persist({ ...data, sessions: [...data.sessions, cleaned] });
    }
    setSession(null);
  };

  return (
    <div style={styles.pad}>
      <input
        value={session.name}
        onChange={(e) => setSession({ ...session, name: e.target.value })}
        style={styles.sessionNameInput}
        placeholder="Session name"
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>
        {session.exercises.map((ex, idx) => {
          const exObj = data.exercises.find((e) => e.id === ex.exerciseId);
          const priorSets = getLastSessionSets(data, ex.exerciseId, session.id);

          return (
            <div
              key={ex.id || idx}
              style={{
                ...styles.exCard,
                borderLeft: ex.groupId ? "4px solid #E8622C" : "1px solid #2A2722",
              }}
            >
              <ExerciseLogger
                name={exObj?.name || "Unknown Move"}
                category={exObj?.category}
                sets={ex.sets}
                priorSets={priorSets}
                onChange={(sets) => updateExerciseSets(idx, sets)}
                startTimer={startTimer}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  style={styles.miniBtn}
                  onClick={() => {
                    const nextSession = [...session.exercises];
                    nextSession[idx].groupId = idx > 0 ? nextSession[idx - 1].groupId || uid() : uid();
                    if (idx > 0) nextSession[idx - 1].groupId = nextSession[idx].groupId;
                    setSession({ ...session, exercises: nextSession });
                  }}
                >
                  {ex.groupId ? "Linked in Superset" : "Link as Superset"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {!showAdd ? (
        <button style={styles.dashedBtn} onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Add Exercise
        </button>
      ) : (
        <div style={styles.pickerWrap}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Select Exercise</span>
            <button style={{ background: "none", border: "none", color: "#8B8680" }} onClick={() => setShowAdd(false)}>
              <X size={16} />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 180, overflowY: "auto" }}>
            {data.exercises.map((e) => (
              <button key={e.id} style={styles.pickRow} onClick={() => addExercise(e.id)}>
                <span>{e.name}</span>
                <span style={styles.tag}>{e.category}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {session.exercises.length > 0 && (
        <button style={styles.finishBtn} onClick={finish}>
          <Check size={18} /> Finish Workout
        </button>
      )}
    </div>
  );
}

function ExerciseLogger({ name, category, sets, priorSets, onChange, startTimer }) {
  const defaultRest = ["Chest", "Back", "Legs", "Olympic"].includes(category) ? 180 : 90;

  const copyPrior = () => {
    if (priorSets) {
      onChange(priorSets.map((s) => ({ ...s })));
    }
  };

  const addSet = () => {
    onChange([...sets, { weight: "", reps: "", rpe: "8" }]);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={styles.exCardTitle}>{name}</div>
        {priorSets && (
          <button style={styles.miniBtn} onClick={copyPrior}>
            <Copy size={12} /> Copy Last
          </button>
        )}
      </div>

      {sets.length > 0 && (
        <div style={styles.setHeaderRow}>
          <span style={{ width: 22 }}>#</span>
          <span style={{ flex: 1 }}>Kg</span>
          <span style={{ flex: 1 }}>Reps</span>
          <span style={{ flex: 1 }}>RPE</span>
          <span style={{ width: 34 }}>Rest</span>
        </div>
      )}

      {sets.map((s, i) => (
        <div key={i} style={styles.setRow}>
          <span style={styles.setIndex}>{i + 1}</span>
          <input
            placeholder={priorSets?.[i]?.weight ?? "0"}
            value={s.weight || ""}
            onChange={(e) => {
              const nextSets = [...sets];
              nextSets[i].weight = e.target.value;
              onChange(nextSets);
            }}
            style={styles.setInput}
            type="number"
          />
          <input
            placeholder={priorSets?.[i]?.reps ?? "0"}
            value={s.reps || ""}
            onChange={(e) => {
              const nextSets = [...sets];
              nextSets[i].reps = e.target.value;
              onChange(nextSets);
            }}
            style={styles.setInput}
            type="number"
          />
          <input
            placeholder={priorSets?.[i]?.rpe ?? "8"}
            value={s.rpe || ""}
            onChange={(e) => {
              const nextSets = [...sets];
              nextSets[i].rpe = e.target.value;
              onChange(nextSets);
            }}
            style={styles.setInput}
            type="number"
          />
          <button style={styles.checkBtn} onClick={() => startTimer(defaultRest)}>
            <Check size={14} />
          </button>
        </div>
      ))}

      <button style={styles.addSetBtn} onClick={addSet}>
        <Plus size={14} /> Add Set
      </button>
    </div>
  );
}

function ProgressTab({ data }) {
  const radarData = CATEGORIES.map((cat) => {
    const totalVolume = data.sessions.reduce((acc, session) => {
      return (
        acc +
        session.exercises.reduce((exAcc, ex) => {
          const exObj = data.exercises.find((e) => e.id === ex.exerciseId);
          if (exObj?.category === cat) {
            return (
              exAcc +
              ex.sets.reduce(
                (setAcc, s) => setAcc + (Number(s.weight || 0) * Number(s.reps || 0)),
                0
              )
            );
          }
          return exAcc;
        }, 0)
      );
    }, 0);
    return { subject: cat, Volume: totalVolume };
  });

  return (
    <div style={styles.pad}>
      <div style={styles.sectionLabel}>VOLUME DISTRIBUTION (RADAR)</div>
      <div style={styles.chartCard}>
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
            <PolarGrid stroke="#2A2722" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: "#8B8680", fontSize: 11 }} />
            <Radar name="Volume" dataKey="Volume" stroke="#E8622C" fill="#E8622C" fillOpacity={0.4} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function HistoryPlaceholder({ data }) {
  return (
    <div style={styles.pad}>
      <div style={styles.sectionLabel}>PAST LOGS</div>
      {data.sessions.length === 0 ? (
        <div style={styles.emptyHint}>No sessions logged yet. Complete a session in the Train tab.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.sessions.map((s) => (
            <div key={s.id} style={styles.exCard}>
              <div style={styles.exCardTitle}>{s.name}</div>
              <div style={styles.cardSub}>{new Date(s.date).toLocaleDateString()} · {s.exercises.length} movements</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LibraryTab({ data, persist }) {
  return (
    <div style={styles.pad}>
      <div style={styles.sectionLabel}>AVAILABLE EXERCISES ({data.exercises.length})</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {data.exercises.map((e) => (
          <div key={e.id} style={styles.libraryRow}>
            <span>{e.name}</span>
            <span style={styles.tag}>{e.category}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FloatingTimer({ timer, onClose }) {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, Math.floor((timer.endTime - Date.now()) / 1000)));

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((timer.endTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div style={styles.floatingTimer}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <TimerReset size={18} />
        <span style={{ fontWeight: 700, fontSize: 16 }}>{formatTime(timeLeft)}</span>
      </div>
      <button style={styles.miniBtn} onClick={onClose}>
        <X size={14} />
      </button>
    </div>
  );
}

function BottomNav({ tab, setTab, hasActive }) {
  const items = [
    { id: "train", label: "Train", icon: Dumbbell },
    { id: "history", label: "History", icon: History },
    { id: "progress", label: "Progress", icon: TrendingUp },
    { id: "library", label: "Library", icon: Library },
  ];
  return (
    <div style={styles.nav}>
      {items.map((it) => {
        const Icon = it.icon;
        const active = tab === it.id;
        return (
          <button
            key={it.id}
            onClick={() => setTab(it.id)}
            style={{ ...styles.navBtn, color: active ? "#E8622C" : "#8B8680" }}
          >
            <div style={{ position: "relative" }}>
              <Icon size={20} />
              {it.id === "train" && hasActive && <span style={styles.navDot} />}
            </div>
            <span style={{ fontSize: 11, marginTop: 3 }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function getLastSessionSets(data, exerciseId, excludeSessionId) {
  const past = data.sessions
    .filter((s) => s.id !== excludeSessionId)
    .filter((s) => s.exercises.some((e) => e.exerciseId === exerciseId));
  return past.length > 0 ? past[past.length - 1].exercises.find((e) => e.exerciseId === exerciseId)?.sets : null;
}

const globalCss = `
  * { box-sizing: border-box; }
  body { margin: 0; background: #121110; }
  input:focus { outline: 2px solid #E8622C; }
  button { cursor: pointer; font-family: inherit; }
  .spin { animation: spin 0.9s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

const styles = {
  app: { fontFamily: "system-ui, sans-serif", background: "#121110", color: "#F5F3EE", minHeight: "100vh", maxWidth: 480, margin: "0 auto", position: "relative" },
  loadingWrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#121110" },
  header: { padding: "16px 16px 12px", borderBottom: "1px solid #211F1B" },
  headerTitle: { fontWeight: 800, fontSize: 18, letterSpacing: 1.2, color: "#E8622C" },
  headerSub: { fontSize: 11, color: "#8B8680" },
  content: { paddingBottom: 110 },
  pad: { padding: "16px" },
  sectionLabel: { fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: "#8B8680", marginBottom: 10 },
  bigCta: { width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#E8622C", color: "#fff", border: "none", borderRadius: 12, padding: "15px", fontWeight: 700 },
  exCard: { background: "#1C1A17", border: "1px solid #2A2722", borderRadius: 12, padding: "12px", marginBottom: 10 },
  exCardTitle: { fontWeight: 700, fontSize: 14.5 },
  cardSub: { fontSize: 12, color: "#8B8680" },
  sessionNameInput: { background: "transparent", border: "none", color: "#F5F3EE", fontSize: 20, fontWeight: 700, width: "100%" },
  setHeaderRow: { display: "flex", gap: 6, fontSize: 10.5, color: "#5F5C56", letterSpacing: 0.5, marginBottom: 4 },
  setRow: { display: "flex", gap: 6, alignItems: "center", marginBottom: 6 },
  setIndex: { width: 22, color: "#5B7C99", fontWeight: 700, fontSize: 12 },
  setInput: { flex: 1, background: "#141210", border: "1px solid #2A2722", color: "#F5F3EE", borderRadius: 8, padding: "8px 6px", fontSize: 13, width: 0 },
  addSetBtn: { width: "100%", background: "transparent", border: "1px dashed #33302A", color: "#B9B5AC", padding: "8px", borderRadius: 8, marginTop: 4 },
  dashedBtn: { width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "transparent", border: "1.5px dashed #3A3730", color: "#E8622C", borderRadius: 12, padding: "12px", fontWeight: 700, marginTop: 12 },
  checkBtn: { width: 34, height: 34, background: "#5FBF8E", color: "#0E1A14", border: "none", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" },
  finishBtn: { width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#5FBF8E", color: "#0E1A14", border: "none", borderRadius: 12, padding: "14px", fontWeight: 700, marginTop: 16 },
  miniBtn: { background: "transparent", border: "1px solid #33302A", color: "#8B8680", padding: "4px 8px", borderRadius: 6, fontSize: 11, display: "flex", alignItems: "center", gap: 4 },
  tag: { fontSize: 10.5, color: "#5B7C99", border: "1px solid #263442", borderRadius: 6, padding: "2px 6px" },
  chartCard: { background: "#1C1A17", border: "1px solid #2A2722", borderRadius: 14, padding: 14 },
  libraryRow: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#1C1A17", border: "1px solid #2A2722", borderRadius: 8, padding: "8px 12px", fontSize: 13 },
  pickerWrap: { background: "#1C1A17", border: "1px solid #2A2722", borderRadius: 12, padding: 12, marginTop: 10 },
  pickRow: { display: "flex", justifyContent: "space-between", background: "transparent", border: "none", color: "#F5F3EE", padding: "8px 4px", fontSize: 13, textAlign: "left" },
  emptyHint: { color: "#8B8680", fontSize: 13, lineHeight: 1.5, marginTop: 12 },
  floatingTimer: { position: "fixed", bottom: 68, left: 16, right: 16, maxWidth: 448, margin: "0 auto", background: "#1C1A17", border: "1.5px solid #E8622C", borderRadius: 12, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.5)", zIndex: 100 },
  nav: { position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 480, margin: "0 auto", display: "flex", background: "#17150F", borderTop: "1px solid #211F1B", padding: "8px 4px 12px", zIndex: 50 },
  navBtn: { flex: 1, background: "transparent", border: "none", display: "flex", flexDirection: "column", alignItems: "center", padding: "4px 0" },
  navDot: { position: "absolute", top: -2, right: -4, width: 6, height: 6, borderRadius: "50%", background: "#5FBF8E" },
};