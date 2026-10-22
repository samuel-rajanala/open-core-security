import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { ArrowUpRight, CheckCircle2, Code2, LockKeyhole, Send, X } from "lucide-react";

export default function ChallengeBoard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState(null);
  const [flag, setFlag] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data, error } = await supabase
        .from("challenges")
        .select("id, title, description, category, difficulty, points")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (!alive) return;
      if (error) setError(error.message);
      else setItems(data || []);
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, []);

  async function submitFlag(event) {
    event.preventDefault();
    if (!active || !flag.trim()) return;
    setSending(true);
    setFeedback(null);
    const { data, error } = await supabase.functions.invoke("submit-flag", {
      body: { challenge_id: active.id, flag: flag.trim() },
    });
    if (error) {
      let message = error.message || "Submission failed.";
      try {
        const details = await error.context?.json();
        if (details?.error) message = details.error;
      } catch { /* use the invocation error */ }
      setFeedback({ type: "error", message });
    } else if (data?.correct) {
      setFeedback({ type: "success", message: data.alreadySolved ? "You've already solved this challenge." : `Correct flag! ${data.pointsAwarded} points awarded.` });
    } else {
      setFeedback({ type: "error", message: data?.message || data?.error || "Incorrect flag. Review the evidence and try again." });
    }
    setSending(false);
  }

  return <section className="challenge-board" id="challenges">
    <div className="wrap">
      <div className="kicker">CHALLENGE LIBRARY</div>
      <h2>Community <em>challenges.</em></h2>
      <p>Practice security thinking with community-published exercises. Work only in systems you own or are authorized to assess.</p>
      {loading ? <p>Loading challenges...</p> : error ? <p role="alert">{error}</p> :
        items.length === 0 ? <p>No published challenges yet.</p> :
        <div className="challenge-board-grid">{items.map(item =>
          <article className="challenge-board-card" key={item.id}>
            <small>{item.category} · {item.difficulty} · {item.points} points</small>
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
        <div className="kicker">CONTROLLED LAB / EXERCISE</div>
        <h2 id="challenge-modal-title">{active.title}</h2>
        <p>{active.description}</p>
        <div className="lab-instructions">
          <h3><Code2 size={17}/> Your task</h3>
          <p>Inspect the simulated HTTP response below. Identify the three missing browser security headers that would help protect a website against content injection, clickjacking, and MIME-type sniffing.</p>
          <div className="lab-response">
            <div className="lab-response-head"><span><LockKeyhole size={14}/> SIMULATED RESPONSE</span><span>HTTP/1.1 200 OK</span></div>
            <pre>{`HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Server: OpenCore-Lab
Cache-Control: no-store
Referrer-Policy: strict-origin-when-cross-origin

<!doctype html>
<html>
  <head><title>Open Core Demo</title></head>
  <body><h1>Welcome to the lab</h1></body>
</html>`}</pre>
          </div>
          <p className="lab-hint">Flag format: <code>OCS&#123;header_one_header_two_header_three&#125;</code>. Use lowercase header names with underscores, in alphabetical order. Replace hyphens with underscores.</p>
        </div>
        <form className="flag-submit-form" onSubmit={submitFlag}>
          <label htmlFor="challenge-flag">Submit your flag</label>
          <div><input id="challenge-flag" value={flag} onChange={e => setFlag(e.target.value)} placeholder="OCS{...}" autoComplete="off" maxLength={256}/><button type="submit" disabled={sending || !flag.trim()}>{sending ? "Checking..." : <><Send size={15}/> Submit flag</>}</button></div>
        </form>
        {feedback && <p className={`flag-feedback ${feedback.type}`} role="status">{feedback.type === "success" && <CheckCircle2 size={16}/>} {feedback.message}</p>}
        <p className="lab-safety-note">This is a simulated exercise, not a live website. No external systems are contacted.</p>
      </section>
    </div>}
  </section>;
}
