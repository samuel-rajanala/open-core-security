import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { CHALLENGE_LABS } from "../data/challengeLabs.js";
import { ArrowUpRight, CheckCircle2, Code2, LockKeyhole, Send, X, Search, Filter, BookOpen } from "lucide-react";

const difficultyLabel = (value) => ({ beginner: "Easy", intermediate: "Medium", advanced: "Hard" }[String(value || "").toLowerCase()] || value || "Practice");
const normalizeTitle = (value) => String(value || "").normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
const getLabForChallenge = (title) => {
  const wanted = normalizeTitle(title);
  return Object.entries(CHALLENGE_LABS).find(([labTitle]) => normalizeTitle(labTitle) === wanted)?.[1] || null;
};

export default function ChallengeBoard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState(null);
  const [flag, setFlag] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("all");

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data, error } = await supabase.from("challenges")
        .select("id, title, description, category, difficulty, points")
        .eq("is_published", true).order("created_at", { ascending: false });
      if (!alive) return;
      if (error) setError(error.message);
      else setItems(data || []);
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, []);

  const visibleItems = useMemo(() => items.filter(item => {
    const matchesDifficulty = difficulty === "all" || item.difficulty === difficulty;
    const text = `${item.title} ${item.description} ${item.category}`.toLowerCase();
    return matchesDifficulty && text.includes(search.toLowerCase().trim());
  }), [items, difficulty, search]);

  // Match titles defensively: database text can contain extra whitespace or Unicode variants.
  const lab = active ? getLabForChallenge(active.title) : null;

  async function submitFlag(event) {
    event.preventDefault();
    if (!active || !flag.trim()) return;
    setSending(true); setFeedback(null);
    const { data, error } = await supabase.functions.invoke("submit-flag", {
      body: { challenge_id: active.id, flag: flag.trim() },
    });
    if (error) {
      let message = error.message || "Submission failed.";
      try { const details = await error.context?.json(); if (details?.error) message = details.error; } catch {}
      setFeedback({ type: "error", message });
    } else if (data?.correct) {
      setFeedback({ type: "success", message: data.alreadySolved ? "You've already solved this challenge." : `Correct flag! ${data.pointsAwarded} points awarded.` });
    } else {
      setFeedback({ type: "error", message: data?.message || data?.error || "Incorrect flag. Review the evidence and try again." });
    }
    setSending(false);
  }

  const counts = {
    beginner: items.filter(x => x.difficulty === "beginner").length,
    intermediate: items.filter(x => x.difficulty === "intermediate").length,
    advanced: items.filter(x => x.difficulty === "advanced").length,
  };

  return <section className="challenge-board" id="challenges">
    <div className="wrap">
      <div className="kicker">CHALLENGE LIBRARY</div>
      <h2>Community <em>challenges.</em></h2>
      <p>Practice in controlled labs, build practical security skills, and earn points. Every target and artifact is simulated; no external systems are contacted.</p>
      <div className="challenge-library-toolbar">
        <label className="challenge-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search challenges or categories…"/></label>
        <div className="challenge-difficulty-filters" aria-label="Filter by difficulty">
          {[["all","All",items.length],["beginner","Easy",counts.beginner],["intermediate","Medium",counts.intermediate],["advanced","Hard",counts.advanced]].map(([value,label,count])=>
            <button key={value} className={difficulty===value?"active":""} onClick={()=>setDifficulty(value)}>{label}<span>{count}</span></button>
          )}
        </div>
      </div>
      {loading ? <p>Loading challenges…</p> : error ? <p role="alert">{error}</p> :
        visibleItems.length === 0 ? <p>No challenges match those filters.</p> :
        <div className="challenge-board-grid">{visibleItems.map(item =>
          <article className="challenge-board-card" key={item.id}>
            <div className="challenge-card-meta"><span>{item.category}</span><b className={`difficulty-${item.difficulty}`}>{difficultyLabel(item.difficulty)}</b><span>{item.points} PTS</span></div>
            <h3>{item.title}</h3><p>{item.description}</p>
            <button className="challenge-open-btn" onClick={() => { setActive(item); setFlag(""); setFeedback(null); }}>
              Open challenge <ArrowUpRight size={15}/>
            </button>
          </article>
        )}</div>}
    </div>
    {active && <div className="challenge-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setActive(null); }}>
      <section className="challenge-modal" role="dialog" aria-modal="true" aria-labelledby="challenge-modal-title">
        <button className="challenge-modal-close" onClick={() => setActive(null)} aria-label="Close challenge"><X/></button>
        <div className="kicker">CONTROLLED LAB / {difficultyLabel(active.difficulty).toUpperCase()} · {active.points} POINTS</div>
        <h2 id="challenge-modal-title">{active.title}</h2>
        <p>{active.description}</p>
        <div className="lab-instructions">
          <h3><Code2 size={17}/> Your task</h3>
          <p>{lab ? lab.task : "This challenge scenario is not configured yet. Please contact the Open Core Security team."}</p>
          <div className="lab-response">
            <div className="lab-response-head"><span><LockKeyhole size={14}/> SIMULATED EVIDENCE</span><span>LOCAL EXERCISE</span></div>
            <pre>{lab ? lab.evidence : "Scenario unavailable — challenge title did not match a configured lab."}</pre>
          </div>
          <p className="lab-hint">{lab ? lab.hint : "Please do not guess a flag. Contact the challenge administrator so this lab can be configured."}</p>
        </div>
        <form className="flag-submit-form" onSubmit={submitFlag}>
          <label htmlFor="challenge-flag">Submit your flag</label>
          <div><input id="challenge-flag" value={flag} onChange={e=>setFlag(e.target.value)} placeholder="OCS{...}" autoComplete="off" maxLength={256}/><button type="submit" disabled={sending || !flag.trim()}>{sending ? "Checking…" : <><Send size={15}/> Submit flag</>}</button></div>
        </form>
        {feedback && <p className={`flag-feedback ${feedback.type}`} role="status">{feedback.type === "success" && <CheckCircle2 size={16}/>} {feedback.message}</p>}
        {feedback?.type === "success" && lab?.lesson && <div className="lab-debrief"><h3><BookOpen size={16}/> Learning notes</h3><p>{lab.lesson}</p></div>}
        <p className="lab-safety-note">This is a simulated exercise, not a live website. No external systems are contacted.</p>
      </section>
    </div>}
  </section>;
}
