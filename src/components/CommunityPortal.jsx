import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { LogIn, LogOut, UserPlus, ShieldCheck, Send, RefreshCw } from "lucide-react";

export default function CommunityPortal() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [authForm, setAuthForm] = useState({ email: "", password: "", name: "" });
  const [contact, setContact] = useState({ name: "", email: "", subject: "", message: "" });

  useEffect(() => {
    if (!supabase) return undefined;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setSession(data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) setProfile(null);
    });
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user || !supabase) return;
    let alive = true;
    supabase.from("profiles").select("display_name, role").eq("id", session.user.id).single()
      .then(({ data, error }) => {
        if (alive) {
          setProfile(data || null);
          if (error) setNotice("Signed in, but profile details could not be loaded.");
        }
      });
    return () => { alive = false; };
  }, [session]);

  async function authenticate(event) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setNotice("");
    try {
      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email: authForm.email.trim(),
          password: authForm.password,
          options: { data: { display_name: authForm.name.trim() } },
        });
        if (error) throw error;
        setNotice(data.session
          ? "Account created. You're signed in."
          : "Account created. Check your email to confirm your address before signing in.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authForm.email.trim(),
          password: authForm.password,
        });
        if (error) throw error;
        setNotice("Welcome back.");
      }
    } catch (error) {
      setNotice(error.message || "Authentication failed.");
    } finally { setBusy(false); }
  }

  async function signOut() {
    setBusy(true); setNotice("");
    const { error } = await supabase.auth.signOut();
    setNotice(error ? error.message : "You've signed out.");
    setBusy(false);
  }

  async function sendContact(event) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setNotice("");
    const payload = Object.fromEntries(Object.entries(contact).map(([key, value]) => [key, value.trim()]));
    const { error } = await supabase.from("contact_messages").insert(payload);
    setNotice(error ? error.message : "Message sent. Thanks for reaching out!");
    if (!error) setContact({ name: "", email: "", subject: "", message: "" });
    setBusy(false);
  }

  return <section className="portal" id="portal">
    <div className="wrap">
      <div className="kicker">04 / COMMUNITY PORTAL</div>
      <div className="portal-heading">
        <div><h2>Get connected. <em>Get involved.</em></h2><p>Join the community or send the organizers a message.</p></div>
        {session && <div className="portal-user"><span>{profile?.role === "admin" ? <ShieldCheck size={15}/> : null}{profile?.display_name || session.user.email}</span><button className="portal-secondary" onClick={signOut} disabled={busy}><LogOut size={14}/> Sign out</button></div>}
      </div>
      {!isSupabaseConfigured ? <div className="portal-notice">Supabase is not configured yet. The site administrator needs to add the project URL and publishable key to the deployment environment.</div> : <div className="portal-grid">
        <div className="portal-panel">
          {session ? <>
            <div className="portal-kicker">{profile?.role === "admin" ? "ADMINISTRATOR ACCOUNT" : "MEMBER ACCOUNT"}</div>
            <h3>You're connected.</h3>
            <p>Signed in as <strong>{session.user.email}</strong>.</p>
            {profile?.role === "admin" && <div className="portal-admin"><ShieldCheck size={17}/> Administrator access confirmed. Admin management tools are the next build stage.</div>}
            <button className="portal-secondary" onClick={() => { setNotice(""); setProfile(null); supabase.from("profiles").select("display_name, role").eq("id", session.user.id).single().then(({data})=>setProfile(data)); }}><RefreshCw size={14}/> Refresh profile</button>
          </> : <>
            <div className="portal-kicker">MEMBER ACCESS</div>
            <h3>{mode === "login" ? "Welcome back." : "Create your account."}</h3>
            <div className="portal-tabs"><button className={mode === "login" ? "active" : ""} onClick={() => {setMode("login");setNotice("");}}>Sign in</button><button className={mode === "register" ? "active" : ""} onClick={() => {setMode("register");setNotice("");}}>Create account</button></div>
            <form className="portal-form" onSubmit={authenticate}>
              {mode === "register" && <label>Display name<input required minLength="2" maxLength="80" autoComplete="name" value={authForm.name} onChange={e=>setAuthForm({...authForm,name:e.target.value})} placeholder="Your name"/></label>}
              <label>Email address<input required type="email" autoComplete="email" value={authForm.email} onChange={e=>setAuthForm({...authForm,email:e.target.value})} placeholder="you@example.com"/></label>
              <label>Password<input required type="password" minLength="8" autoComplete={mode === "login" ? "current-password" : "new-password"} value={authForm.password} onChange={e=>setAuthForm({...authForm,password:e.target.value})} placeholder="At least 8 characters"/></label>
              <button className="portal-submit" disabled={busy}>{mode === "login" ? <LogIn size={15}/> : <UserPlus size={15}/>} {busy ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}</button>
            </form>
          </>}
        </div>
        <div className="portal-panel">
          <div className="portal-kicker">CONTACT THE ORGANIZERS</div><h3>Send a message.</h3>
          <form className="portal-form" onSubmit={sendContact}>
            <label>Your name<input required minLength="2" maxLength="100" value={contact.name} onChange={e=>setContact({...contact,name:e.target.value})} placeholder="Your name"/></label>
            <label>Email address<input required type="email" maxLength="254" value={contact.email} onChange={e=>setContact({...contact,email:e.target.value})} placeholder="you@example.com"/></label>
            <label>Subject<input required minLength="3" maxLength="160" value={contact.subject} onChange={e=>setContact({...contact,subject:e.target.value})} placeholder="What is this about?"/></label>
            <label>Message<textarea required minLength="10" maxLength="5000" rows="4" value={contact.message} onChange={e=>setContact({...contact,message:e.target.value})} placeholder="Tell us a little more..."/></label>
            <button className="portal-submit" disabled={busy}><Send size={15}/> {busy ? "Sending..." : "Send message"}</button>
          </form>
        </div>
      </div>}
      {notice && <p className="portal-notice" role="status">{notice}</p>}
      <p className="portal-footnote">Use a unique password. Open Core Security will never ask you to share your password or authentication codes.</p>
    </div>
  </section>;
}
