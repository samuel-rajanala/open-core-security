import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Users, Trophy, Copy, RefreshCw, UserPlus, Plus } from "lucide-react";

export default function TeamHub() {
  const [team, setTeam] = useState(null);
  const [individuals, setIndividuals] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamName, setTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!supabase) return;
    const [mine, people, groups] = await Promise.all([
      supabase.rpc("get_my_team"),
      supabase.rpc("get_individual_leaderboard"),
      supabase.rpc("get_team_leaderboard")
    ]);
    if (mine.error || people.error || groups.error) {
      setNotice(mine.error?.message || people.error?.message || groups.error?.message || "Could not load scoring data.");
      return;
    }
    setTeam(mine.data || null);
    setIndividuals(people.data || []);
    setTeams(groups.data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(kind) {
    setBusy(true); setNotice("");
    const { data, error } = await supabase.rpc(kind === "create" ? "create_team" : "join_team", {
      [kind === "create" ? "p_name" : "p_invite_code"]: kind === "create" ? teamName.trim() : inviteCode.trim()
    });
    if (error) setNotice(error.message);
    else {
      setNotice(kind === "create" ? "Team created. Share this invite code with your teammates." : "You joined the team.");
      setTeam(data);
      setTeamName(""); setInviteCode("");
      await load();
    }
    setBusy(false);
  }

  return <section className="team-hub">
    <div className="team-hub-head"><div><div className="portal-kicker">COMMUNITY SCORING</div><h3><Users size={19}/> Teams & leaderboards</h3><p>Earn individual points and contribute to your team's total through verified challenge solves.</p></div><button className="portal-secondary" onClick={load}><RefreshCw size={13}/> Refresh</button></div>
    {team ? <div className="team-current"><div><small>YOUR TEAM</small><strong>{team.name}</strong><span>Membership is locked to protect historical team scores.</span></div><div className="team-invite"><small>INVITE CODE</small><code>{team.invite_code}</code><button className="portal-secondary" onClick={() => { navigator.clipboard?.writeText(team.invite_code); setNotice("Invite code copied."); }}><Copy size={13}/> Copy</button></div></div> :
      <div className="team-actions">
        <form onSubmit={e => { e.preventDefault(); act("create"); }}><label>Create a team<input value={teamName} onChange={e=>setTeamName(e.target.value)} minLength="2" maxLength="40" required placeholder="Team name"/></label><button className="portal-submit" disabled={busy}><Plus size={14}/> Create team</button></form>
        <form onSubmit={e => { e.preventDefault(); act("join"); }}><label>Join with invite code<input value={inviteCode} onChange={e=>setInviteCode(e.target.value)} maxLength="20" required placeholder="Enter invite code"/></label><button className="portal-submit" disabled={busy}><UserPlus size={14}/> Join team</button></form>
      </div>}
    <div className="team-leaderboards">
      <article className="admin-panel"><h4><Trophy size={16}/> Individual leaderboard</h4><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>#</th><th>Participant</th><th>Points</th><th>Solves</th></tr></thead><tbody>{individuals.map((p,i)=><tr key={p.user_id}><td>{i+1}</td><td>{p.display_name}</td><td>{p.points}</td><td>{p.solves}</td></tr>)}</tbody></table>{!individuals.length&&<p>No scored participants yet.</p>}</div></article>
      <article className="admin-panel"><h4><Users size={16}/> Team leaderboard</h4><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>#</th><th>Team</th><th>Points</th><th>Solves</th><th>Members</th></tr></thead><tbody>{teams.map((t,i)=><tr key={t.team_id}><td>{i+1}</td><td>{t.team_name}</td><td>{t.points}</td><td>{t.solves}</td><td>{t.member_count}</td></tr>)}</tbody></table>{!teams.length&&<p>No teams yet.</p>}</div></article>
    </div>
    {notice && <p className="portal-notice" role="status">{notice}</p>}
    <p className="portal-footnote">Scores are calculated from successful server-verified submissions only. Failed attempts earn zero points. Team membership cannot be changed by members after joining.</p>
  </section>;
}
