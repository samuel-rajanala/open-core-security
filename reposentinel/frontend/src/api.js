const API=import.meta.env.VITE_API_URL||"http://localhost:8000";
async function post(path,body){
 const r=await fetch(API+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
 const d=await r.json().catch(()=>({}));
 if(!r.ok) throw new Error(d.detail||"Request failed ("+r.status+")");
 return d;
}
export const api={
 health:()=>fetch(API+"/api/health").then(r=>r.json()),
 analyze:repo_url=>post("/api/analyze",{repo_url}),
 issue:(repo_url,issue_number)=>post("/api/issue",{repo_url,issue_number:Number(issue_number)}),
 plan:payload=>post("/api/plan",payload),
 patch:payload=>post("/api/patch",payload),
 security:(repo_url)=>post("/api/security",{repo_url,issue_number:1}),
 verify:(repo_url,branch)=>post("/api/verify",{repo_url,branch})
};
