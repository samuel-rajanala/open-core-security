import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function ChallengeBoard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const { data, error } = await supabase
        .from("challenges")
        .select("id, title, description, category, difficulty, points")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) setError(error.message);
      else setItems(data || []);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, []);

  return <section className="challenge-board" id="challenges">
    <div className="wrap">
      <div className="kicker">04 / PRACTICAL LEARNING</div>
      <h2>Community <em>challenges.</em></h2>
      <p>Practice security thinking with community-published exercises. Work only in systems you own or are authorized to assess.</p>
      {loading ? <p>Loading challenges...</p> : error ? <p role="alert">{error}</p> :
        items.length === 0 ? <p>No published challenges yet.</p> :
        <div className="challenge-board-grid">{items.map(item =>
          <article className="challenge-board-card" key={item.id}>
            <small>{item.category} · {item.difficulty} · {item.points} points</small>
            <h3>{item.title}</h3><p>{item.description}</p>
          </article>
        )}</div>}
    </div>
  </section>;
}
