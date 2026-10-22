import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Plus, Pencil, Trash2, Eye, EyeOff, Save, X, RefreshCw, AlertCircle } from "lucide-react";

const emptyForm = { title: "", description: "", category: "", difficulty: "beginner", points: 100, is_published: false };

export default function ChallengeManager() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("all");

  async function loadChallenges() {
    setLoading(true); setError("");
    const { data, error: loadError } = await supabase
      .from("challenges")
      .select("id, title, description, category, difficulty, points, is_published, created_at")
      .order("created_at", { ascending: false });
    if (loadError) setError(loadError.message);
    else setItems(data || []);
    setLoading(false);
  }

  useEffect(() => { loadChallenges(); }, []);

  function update(field, value) {
    setForm(current => ({ ...current, [field]: value }));
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({ title: item.title, description: item.description, category: item.category, difficulty: item.difficulty, points: item.points, is_published: item.is_published });
    setNotice(""); setError("");
    document.getElementById("challenge-editor")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function resetForm() {
    setEditingId(null); setForm(emptyForm); setError(""); setNotice("");
  }

  async function saveChallenge(event) {
    event.preventDefault();
    setError(""); setNotice("");
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      difficulty: form.difficulty,
      points: Number(form.points),
      is_published: Boolean(form.is_published)
    };
    if (!payload.title || !payload.description || !payload.category) {
      setError("Title, description, and category are required."); return;
    }
    if (!Number.isInteger(payload.points) || payload.points < 1 || payload.points > 100000) {
      setError("Points must be a whole number between 1 and 100,000."); return;
    }
    setSaving(true);
    const result = editingId
      ? await supabase.from("challenges").update(payload).eq("id", editingId).select("id").maybeSingle()
      : await supabase.from("challenges").insert(payload).select("id").maybeSingle();
    setSaving(false);
    if (result.error) { setError(result.error.message); return; }
    if (!result.data) { setError("No row was changed. Check that your admin account has the required challenges-table policy."); return; }
    const successMessage = editingId ? "Challenge updated." : "Challenge created.";
    resetForm();
    setNotice(successMessage);
    await loadChallenges();
  }

  async function togglePublished(item) {
    setError(""); setNotice("");
    const { data, error: updateError } = await supabase.from("challenges")
      .update({ is_published: !item.is_published }).eq("id", item.id).select("id").maybeSingle();
    if (updateError) { setError(updateError.message); return; }
    if (!data) { setError("No row was changed. Verify the admin UPDATE policy on challenges."); return; }
    setNotice(item.is_published ? "Challenge unpublished." : "Challenge published.");
    await loadChallenges();
  }

  async function deleteChallenge(item) {
    if (!window.confirm(`Delete "${item.title}" permanently? This cannot be undone.`)) return;
    setError(""); setNotice("");
    const { data, error: deleteError } = await supabase.from("challenges").delete().eq("id", item.id).select("id").maybeSingle();
    if (deleteError) { setError(deleteError.message); return; }
    if (!data) { setError("No row was deleted. Verify the admin DELETE policy on challenges."); return; }
    setNotice("Challenge deleted.");
    if (editingId === item.id) resetForm();
    await loadChallenges();
  }

  const shown = items.filter(item => filter === "all" || (filter === "published" ? item.is_published : !item.is_published));

  return <section className="challenge-manager">
    <div className="challenge-manager-head">
      <div><span className="portal-kicker">CONTENT / CHALLENGE LIBRARY</span><h3>Challenge management</h3><p>Create and maintain the challenges members can access.</p></div>
      <button className="portal-secondary" onClick={loadChallenges} disabled={loading}><RefreshCw size={14}/> Refresh</button>
    </div>

    <div className="challenge-manager-grid">
      <form id="challenge-editor" className="admin-panel challenge-editor" onSubmit={saveChallenge}>
        <div className="challenge-editor-title"><h4>{editingId ? "Edit challenge" : "Create a challenge"}</h4>{editingId && <button type="button" className="challenge-icon-button" onClick={resetForm} aria-label="Cancel editing"><X size={16}/></button>}</div>
        <label>CHALLENGE TITLE<input value={form.title} onChange={e=>update("title",e.target.value)} maxLength={120} placeholder="e.g. The Lost Packet" required /></label>
        <label>DESCRIPTION<textarea value={form.description} onChange={e=>update("description",e.target.value)} rows={5} maxLength={5000} placeholder="Explain the scenario, objective, and what participants should submit…" required /></label>
        <div className="challenge-form-row">
          <label>CATEGORY<input value={form.category} onChange={e=>update("category",e.target.value)} maxLength={60} placeholder="Web Exploitation" required /></label>
          <label>DIFFICULTY<select value={form.difficulty} onChange={e=>update("difficulty",e.target.value)}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
        </div>
        <div className="challenge-form-row">
          <label>POINTS<input type="number" min="1" max="100000" step="1" value={form.points} onChange={e=>update("points",e.target.value)} required /></label>
          <label className="challenge-publish-toggle"><input type="checkbox" checked={form.is_published} onChange={e=>update("is_published",e.target.checked)}/> Publish immediately</label>
        </div>
        <div className="challenge-form-actions"><button className="portal-submit" type="submit" disabled={saving}>{saving ? "Saving…" : <><Save size={14}/> {editingId ? "Save changes" : "Create challenge"}</>}</button>{editingId && <button className="portal-secondary" type="button" onClick={resetForm}>Cancel</button>}</div>
      </form>

      <div className="challenge-library">
        <div className="challenge-library-head"><div><h4>Challenge library</h4><small>{items.length} total</small></div><div className="challenge-filters">{[["all","All"],["published","Published"],["draft","Drafts"]].map(([key,label])=><button type="button" key={key} className={filter===key?"active":""} onClick={()=>setFilter(key)}>{label}</button>)}</div></div>
        {loading ? <p className="admin-state">Loading challenges…</p> : shown.length ? shown.map(item=><article className="challenge-item" key={item.id}>
          <div className="challenge-item-top"><span className={item.is_published?"challenge-status live":"challenge-status draft"}>{item.is_published?"PUBLISHED":"DRAFT"}</span><span className="challenge-points">{item.points} PTS</span></div>
          <h5>{item.title}</h5><p>{item.description}</p>
          <div className="challenge-item-meta"><span>{item.category}</span><span>{item.difficulty}</span><span>{new Date(item.created_at).toLocaleDateString()}</span></div>
          <div className="challenge-item-actions"><button type="button" onClick={()=>startEdit(item)}><Pencil size={13}/> Edit</button><button type="button" onClick={()=>togglePublished(item)}>{item.is_published?<><EyeOff size={13}/> Unpublish</>:<><Eye size={13}/> Publish</>}</button><button type="button" className="danger" onClick={()=>deleteChallenge(item)}><Trash2 size={13}/> Delete</button></div>
        </article>) : <div className="challenge-empty">No {filter==="all"?"":filter+" "}challenges yet. Create your first one using the form.</div>}
      </div>
    </div>
    {error && <p className="challenge-feedback error"><AlertCircle size={15}/>{error}</p>}
    {notice && <p className="challenge-feedback success">{notice}</p>}
    <p className="admin-footnote">Only authenticated admins can perform these operations. Supabase row-level security remains the enforcement layer; the interface does not grant privileges.</p>
  </section>;
}
