import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import ChallengeManager from "./ChallengeManager.jsx";
import { ShieldCheck, Users, Inbox, RefreshCw, Search, AlertCircle } from "lucide-react";

export default function AdminDashboard() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [tab, setTab] = useState("overview");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setSession(data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) { setProfile(null); setMembers([]); setMessages([]); }
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!session?.user) { setProfile(null); setLoading(false); return; }
      setLoading(true); setError("");
      const { data: me, error: profileError } = await supabase
        .from("profiles").select("display_name, role").eq("id", session.user.id).maybeSingle();
      if (!alive) return;
      setProfile(me);
      if (profileError) { setError(profileError.message); setLoading(false); return; }
      if (me?.role !== "admin") { setLoading(false); return; }

      const [memberResult, messageResult] = await Promise.all([
        supabase.from("profiles").select("id, display_name, role, created_at").order("created_at", { ascending: false }).limit(200),
        supabase.from("contact_messages").select("id, name, email, subject, message, created_at").order("created_at", { ascending: false }).limit(100)
      ]);
      if (!alive) return;
      if (memberResult.error || messageResult.error) {
        setError(memberResult.error?.message || messageResult.error?.message || "Could not load admin data.");
      } else {
        setMembers(memberResult.data || []);
        setMessages(messageResult.data || []);
      }
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, [session]);

  const filteredMembers = useMemo(() => members.filter(m =>
    (m.display_name || "").toLowerCase().includes(query.toLowerCase()) ||
    m.id.toLowerCase().includes(query.toLowerCase()) ||
    m.role.toLowerCase().includes(query.toLowerCase())
  ), [members, query]);

  if (!session || profile?.role !== "admin") return null;

  return <section className="admin-dashboard" id="admin-dashboard">
    <div className="wrap">
      <div className="kicker">ADMINISTRATION / RESTRICTED AREA</div>
      <div className="admin-heading">
        <div><h2><ShieldCheck size={25}/> Admin <em>console.</em></h2><p>Signed in as {profile.display_name || session.user.email}. Data is protected by Supabase row-level security.</p></div>
        <button className="portal-secondary" onClick={() => { setSession({ ...session }); }}><RefreshCw size={14}/> Refresh</button>
      </div>
      {loading ? <p className="admin-state">Loading secured admin data…</p> : error ? <p className="admin-state error"><AlertCircle size={16}/>{error}</p> : <>
        <div className="admin-stats">
          <article><Users/><small>REGISTERED PROFILES</small><strong>{members.length}</strong></article>
          <article><Inbox/><small>CONTACT MESSAGES</small><strong>{messages.length}</strong></article>
          <article><ShieldCheck/><small>YOUR ACCESS</small><strong>ADMIN</strong></article>
        </div>
        <div className="admin-tabs">
          <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>Overview</button>
          <button className={tab === "members" ? "active" : ""} onClick={() => setTab("members")}>Members ({members.length})</button>
          <button className={tab === "inbox" ? "active" : ""} onClick={() => setTab("inbox")}>Inbox ({messages.length})</button>
          <button className={tab === "challenges" ? "active" : ""} onClick={() => setTab("challenges")}>Challenges</button>
        </div>
        {tab === "overview" && <div className="admin-columns">
          <article className="admin-panel"><h3>Recent members</h3>{members.slice(0,5).map(m=><div className="admin-list-row" key={m.id}><span>{m.display_name || "Unnamed member"}<small>{m.id}</small></span><b>{m.role}</b></div>)}{!members.length && <p>No profiles found.</p>}</article>
          <article className="admin-panel"><h3>Latest messages</h3>{messages.slice(0,5).map(m=><div className="admin-list-row" key={m.id}><span>{m.subject}<small>{m.name} · {m.email}</small></span><time>{new Date(m.created_at).toLocaleDateString()}</time></div>)}{!messages.length && <p>No messages yet.</p>}</article>
        </div>}
        {tab === "members" && <article className="admin-panel"><div className="admin-panel-head"><h3>Member directory</h3><label className="admin-search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, ID, or role"/></label></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Display name</th><th>Role</th><th>Joined</th><th>User ID</th></tr></thead><tbody>{filteredMembers.map(m=><tr key={m.id}><td>{m.display_name}</td><td><span className={m.role === "admin" ? "admin-role" : "member-role"}>{m.role}</span></td><td>{new Date(m.created_at).toLocaleDateString()}</td><td><code>{m.id}</code></td></tr>)}</tbody></table>{!filteredMembers.length && <p>No matching members.</p>}</div></article>}
        {tab === "challenges" && <ChallengeManager />}
        {tab === "inbox" && <div className="admin-inbox">{messages.map(m=><article className="admin-panel message-card" key={m.id}><div className="message-meta"><span>{m.name} · <a href={`mailto:${encodeURIComponent(m.email)}`}>{m.email}</a></span><time>{new Date(m.created_at).toLocaleString()}</time></div><h3>{m.subject}</h3><p>{m.message}</p></article>)}{!messages.length && <article className="admin-panel">Your inbox is empty.</article>}</div>}
        <p className="admin-footnote">Member management is read-only in this release. Role changes and account deletion are intentionally not exposed in the browser.</p>
      </>}
    </div>
  </section>;
}
