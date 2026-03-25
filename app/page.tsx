"use client";
import { useState, useRef, useEffect } from "react";

const VERTICALS = ["SaaS","Fintech","HealthTech","AI/ML","Consumer","EdTech","CleanTech","Marketplace","DeepTech","Other"];
const STAGES = ["Pre-Seed","Seed","Series A","Series B","Series C+"];
const ACCENT = "#00f5a0";
const BG = "#0d0d0d";
const CARD = "#161616";
const BORDER = "#2a2a2a";

// Storage helpers
const store = {
  async get(key: string) {
    try {
      const r = await (window as any).storage.get(key);
      return r ? JSON.parse(r.value) : null;
    } catch { return null; }
  },
  async set(key: string, val: unknown) {
    try { await (window as any).storage.set(key, JSON.stringify(val)); } catch {}
  },
  async del(key: string) {
    try { await (window as any).storage.delete(key); } catch {}
  }
};

export default function FundFlow() {
  const [view, setView] = useState("home");
  const [companies, setCompanies] = useState<any[]>([]);
  const [investors, setInvestors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [investorAccount, setInvestorAccount] = useState(null);
  const [founderAccount, setFounderAccount] = useState(null);
  const [filterVertical, setFilterVertical] = useState("All");
  const [filterStage, setFilterStage] = useState("All");
  const [showSaved, setShowSaved] = useState(false);
  const [contactModal, setContactModal] = useState(null);
  const [authModal, setAuthModal] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [authForm, setAuthForm] = useState({ name:"", firm:"", email:"", password:"", schedulingLink:"", focusVerticals:[], focusStages:[] });
  const [loginForm, setLoginForm] = useState({ email:"", password:"" });
  const [founderForm, setFounderForm] = useState({ name:"", company:"", logoDataUrl:"", vertical:"SaaS", stage:"Seed", roundAmount:"", description:"", fundraising:true, email:"", password:"", schedulingLink:"" });
  const [contactForm, setContactForm] = useState({ message:"" });
  const [authError, setAuthError] = useState("");
  const [recoveredPassword, setRecoveredPassword] = useState("");
  const [founderSubmitting, setFounderSubmitting] = useState(false);
  const logoRef = useRef();

const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(""), 3500); };
  
  useEffect(() => {
    (async () => {
      setLoading(true);
      const cos = await store.get("ff:companies") || [];
      const invs = await store.get("ff:investors") || [];
      setCompanies(cos);
      setInvestors(invs);
      const inv = await store.get("ff:session:investor");
      if (inv) { setInvestorAccount(inv); setView("investor"); }
      const fnd = await store.get("ff:session:founder");
      if (fnd) { setFounderAccount(fnd); }
      setLoading(false);
    })();
  }, []);

  const saveCompanies = async (list: any[]) => { setCompanies(list); await store.set("ff:companies", list); };
  const saveInvestors = async (list: any[]) => { setInvestors(list); await store.set("ff:investors", list); };

  const scoreMatches = async (cos, investor) => {
    if (!investor || !cos.length) return;
    setLoadingMatch(true);
    try {
      const prompt = `You are a VC analyst. Score how well each startup matches this investor's thesis.
Investor: ${investor.name}, ${investor.firm||"Independent"}
Focus verticals: ${investor.focusVerticals?.length ? investor.focusVerticals.join(", ") : "All"}
Focus stages: ${investor.focusStages?.length ? investor.focusStages.join(", ") : "All"}
Startups:
${cos.filter(c=>c.fundraising).map((c,i)=>`${i+1}. id="${c.id}" | ${c.name} | ${c.vertical} | ${c.stage} | ${c.roundAmount} | "${c.description}"`).join("\n")}
Return ONLY a JSON array, no markdown. Each item: {"id":"...","score":85,"reason":"One sentence"}. Score 0-100.`;
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000, messages:[{role:"user",content:prompt}] })
      });
      const data = await res.json();
      const text = data.content?.find(b=>b.type==="text")?.text || "[]";
      const scores = JSON.parse(text.replace(/```json|```/g,"").trim());
      setCompanies(prev => prev.map(c => { const sc = scores.find(x=>x.id===c.id); return sc?{...c,matchScore:sc.score,matchReason:sc.reason}:c; }));
    } catch(e) { console.error(e); }
    setLoadingMatch(false);
  };

  const handleInvestorSignup = async () => {
    setAuthError("");
    if (!authForm.name || !authForm.email || !authForm.password) return setAuthError("Please fill all required fields.");
    if (investors.find(i=>i.email.toLowerCase()===authForm.email.toLowerCase())) return setAuthError("An account with this email already exists.");
    const acc = { id:`inv-${Date.now()}`, ...authForm, createdAt: new Date().toISOString() };
    const updated = [...investors, acc] as never[];
    await saveInvestors(updated);
    await store.set("ff:session:investor", acc);
    setInvestorAccount(acc);
    setAuthModal(null); setView("investor");
    showToast(`Welcome, ${acc.name}!`);
    await scoreMatches(companies, acc);
  };

  const handleInvestorLogin = async () => {
    setAuthError("");
    if (!loginForm.email || !loginForm.password) return setAuthError("Please enter your email and password.");
    const acc = investors.find(i=>i.email.toLowerCase()===loginForm.email.toLowerCase() && i.password===loginForm.password);
    if (!acc) return setAuthError("Incorrect email or password.");
    await store.set("ff:session:investor", acc);
    setInvestorAccount(acc);
    setAuthModal(null); setView("investor");
    showToast(`Welcome back, ${acc.name}!`);
    await scoreMatches(companies, acc);
  };

  const handleFounderLogin = async () => {
    setAuthError("");
    if (!loginForm.email || !loginForm.password) return setAuthError("Please enter your email and password.");
    const co = companies.find(c=>c.founderEmail.toLowerCase()===loginForm.email.toLowerCase() && c.password===loginForm.password);
    if (!co) return setAuthError("Incorrect email or password.");
    await store.set("ff:session:founder", co);
    setFounderAccount(co);
    setAuthModal(null); setView("founder-dashboard");
    showToast(`Welcome back, ${co.founderName}!`);
  };

  const handleFounderSubmit = async () => {
    setFounderError("");
    if (!founderForm.name || !founderForm.company || !founderForm.email || !founderForm.password)
      return setFounderError("Please fill all required fields: Founder Name, Company Name, Email and Password.");
    if (companies.find(c=>c.founderEmail.toLowerCase()===founderForm.email.toLowerCase()))
      return setFounderError("An account with this email already exists.");
    setFounderSubmitting(true);
    const co = {
      id:`co-${Date.now()}`, name:founderForm.company, logoDataUrl:founderForm.logoDataUrl,
      vertical:founderForm.vertical, stage:founderForm.stage, roundAmount:founderForm.roundAmount,
      description:founderForm.description, fundraising:founderForm.fundraising,
      founderEmail:founderForm.email, founderName:founderForm.name,
      schedulingLink:founderForm.schedulingLink, password:founderForm.password,
      bookmarked:false, matchScore:null, matchReason:"", createdAt:new Date().toISOString()
    };
    const updated = [...companies, co];
    await saveCompanies(updated);
    await store.set("ff:session:founder", co);
    setFounderAccount(co);
    setFounderSubmitting(false);
    setView("founder-dashboard");
    showToast("🎉 Profile published!");
  };

  const toggleBookmark = async (id) => {
    const updated = companies.map(c=>c.id===id?{...c,bookmarked:!c.bookmarked}:c);
    await saveCompanies(updated);
  };

  const sendContactRequest = async () => {
    const co = contactModal;
    const sched = co.schedulingLink || investorAccount?.schedulingLink || "";
    const subj = encodeURIComponent(`Investor Intro: ${investorAccount?.firm||investorAccount?.name} wants to connect`);
    const body = encodeURIComponent(`Hi ${co.founderName},\n\n${investorAccount?.name} from ${investorAccount?.firm||"an investment firm"} is interested in connecting with you about ${co.name}.\n\n${contactForm.message?`Message: ${contactForm.message}\n\n`:""}${sched?`Schedule a call: ${sched}\n\n`:""}\nBest,\nFundFlow`);
    window.open(`mailto:${co.founderEmail}?subject=${subj}&body=${body}`);
    showToast(`📧 Email triggered to ${co.founderName}!`);
    setContactModal(null); setContactForm({message:""});
  };

  const signOutInvestor = async () => { await store.del("ff:session:investor"); setInvestorAccount(null); setView("home"); };
  const signOutFounder = async () => { await store.del("ff:session:founder"); setFounderAccount(null); setView("home"); };
  const openModal = (type) => { setAuthError(""); setLoginForm({email:"",password:""}); setAuthForm({name:"",firm:"",email:"",password:"",schedulingLink:"",focusVerticals:[],focusStages:[]}); setAuthModal(type); };

  const filtered = companies.filter(c => {
    if (!c.fundraising) return false;
    if (showSaved && !c.bookmarked) return false;
    if (filterVertical !== "All" && c.vertical !== filterVertical) return false;
    if (filterStage !== "All" && c.stage !== filterStage) return false;
    return true;
  }).sort((a,b)=>(b.matchScore||0)-(a.matchScore||0));

  const scoreColor = s => s>=80?"#00f5a0":s>=60?"#f5c400":"#ff6b6b";

  const Logo = ({url, name, size=44}) => url
    ? <img src={url} alt={name} style={{width:size,height:size,borderRadius:10,objectFit:"cover",border:`1px solid ${BORDER}`,flexShrink:0}}/>
    : <div style={{width:size,height:size,borderRadius:10,background:"#222",border:`1px solid ${BORDER}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.4,flexShrink:0,color:"#555"}}>?</div>;

  const CheckList = ({items, selected, onChange}) => (
    <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>
      {items.map(i=>{const on=selected.includes(i);return <button key={i} onClick={()=>onChange(on?selected.filter(x=>x!==i):[...selected,i])} style={{background:on?"#001a0f":"#1a1a1a",border:`1px solid ${on?ACCENT+"66":BORDER}`,color:on?ACCENT:"#aaa",padding:"5px 12px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:on?700:400}}>{i}</button>;})}
    </div>
  );

  const s = {
    app:{background:BG,minHeight:"100vh",fontFamily:"'Inter',sans-serif",color:"#e8e8e8"},
    nav:{background:"#111",borderBottom:`1px solid ${BORDER}`,padding:"0 24px",height:60,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100},
    logo:{fontSize:22,fontWeight:800,color:ACCENT,letterSpacing:"-0.5px",cursor:"pointer"},
    navBtn:{background:"transparent",border:`1px solid ${BORDER}`,color:"#e8e8e8",padding:"7px 14px",borderRadius:8,cursor:"pointer",fontSize:13,marginLeft:6},
    navBtnPrimary:{background:ACCENT,border:"none",color:"#000",padding:"7px 14px",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:700,marginLeft:6},
    page:{maxWidth:1100,margin:"0 auto",padding:"40px 24px"},
    h1:{fontSize:42,fontWeight:800,lineHeight:1.1,margin:0},
    sub:{color:"#888",fontSize:16,marginTop:12},
    card:{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:24,marginBottom:16},
    input:{background:"#1a1a1a",border:`1px solid ${BORDER}`,color:"#e8e8e8",padding:"10px 14px",borderRadius:10,width:"100%",fontSize:14,boxSizing:"border-box",marginBottom:12},
    label:{fontSize:12,color:"#888",marginBottom:4,display:"block"},
    btn:{background:ACCENT,border:"none",color:"#000",padding:"12px 24px",borderRadius:10,cursor:"pointer",fontSize:14,fontWeight:700},
    btnOutline:{background:"transparent",border:`1px solid ${BORDER}`,color:"#e8e8e8",padding:"10px 20px",borderRadius:10,cursor:"pointer",fontSize:13},
    grid:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:20},
    companyCard:{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:24,display:"flex",flexDirection:"column",gap:12},
    tag:{background:"#1e1e1e",border:`1px solid ${BORDER}`,borderRadius:6,padding:"3px 10px",fontSize:12,color:"#aaa",display:"inline-block"},
    tagAccent:{background:"#001a0f",border:`1px solid #00f5a044`,borderRadius:6,padding:"3px 10px",fontSize:12,color:ACCENT,display:"inline-block"},
    modal:{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20},
    modalBox:{background:"#161616",border:`1px solid ${BORDER}`,borderRadius:20,padding:32,maxWidth:520,width:"100%",maxHeight:"85vh",overflowY:"auto"},
    select:{background:"#1a1a1a",border:`1px solid ${BORDER}`,color:"#e8e8e8",padding:"10px 14px",borderRadius:10,fontSize:14,boxSizing:"border-box",marginBottom:12,width:"100%"},
    toast:{position:"fixed",bottom:32,left:"50%",transform:"translateX(-50%)",background:"#1a1a1a",border:`1px solid ${ACCENT}44`,color:ACCENT,padding:"12px 24px",borderRadius:12,fontSize:14,zIndex:999,fontWeight:600,boxShadow:"0 4px 24px rgba(0,0,0,0.5)"},
    error:{background:"#1a0a0a",border:"1px solid #ff6b6b44",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#ff6b6b",marginBottom:12},
    divider:{display:"flex",alignItems:"center",gap:12,margin:"16px 0"},
    dividerLine:{flex:1,height:1,background:BORDER},
    dividerText:{fontSize:12,color:"#555"},
  };

  const NavBar = ({right}) => (
    <nav style={s.nav}>
      <span style={s.logo} onClick={()=>setView("home")}>FundFlow</span>
      <div style={{display:"flex",alignItems:"center"}}>{right}</div>
    </nav>
  );

  const handleRecovery = () => {
    setAuthError("");
    if (!loginForm.email) return setAuthError("Please enter your email address.");
    const role = authModal === "recover-investor" ? "investor" : "founder";
    let account = null;
    if (role === "investor") account = investors.find(i=>i.email.toLowerCase()===loginForm.email.toLowerCase());
    else account = companies.find(c=>c.founderEmail.toLowerCase()===loginForm.email.toLowerCase());
    if (!account) return setAuthError("No account found with that email.");
    const pw = role === "investor" ? account.password : account.password;
    setAuthError("");
    setRecoveredPassword(pw);
  };

  const renderModal = () => {
    if (!authModal) return null;

    if (authModal === "recover-investor" || authModal === "recover-founder") return (
      <div style={s.modal} onClick={()=>{setAuthModal(null);setRecoveredPassword("");}}>
        <div style={s.modalBox} onClick={e=>e.stopPropagation()}>
          <h2 style={{margin:"0 0 4px",fontWeight:800}}>Recover Password</h2>
          <p style={{color:"#888",fontSize:13,marginTop:0,marginBottom:20}}>Enter your email and we'll show your password.</p>
          {authError && <div style={s.error}>{authError}</div>}
          {recoveredPassword ? (
            <div>
              <div style={{background:"#001a0f",border:`1px solid #00f5a044`,borderRadius:10,padding:16,marginBottom:16,textAlign:"center"}}>
                <div style={{fontSize:12,color:"#888",marginBottom:6}}>Your password is</div>
                <div style={{fontSize:20,fontWeight:800,color:ACCENT,letterSpacing:"0.05em"}}>{recoveredPassword}</div>
              </div>
              <button style={{...s.btn,width:"100%"}} onClick={()=>{setAuthModal(authModal==="recover-investor"?"investor-login":"founder-login");setRecoveredPassword("");}}>Back to Login →</button>
            </div>
          ) : (
            <div>
              <label style={s.label}>Email *</label>
              <input style={s.input} placeholder="you@company.com" value={loginForm.email} onChange={e=>setLoginForm(f=>({...f,email:e.target.value}))} autoFocus/>
              <button style={{...s.btn,width:"100%",marginTop:4}} onClick={handleRecovery}>Show My Password →</button>
              <div style={s.divider}><div style={s.dividerLine}/><span style={s.dividerText}>remembered it?</span><div style={s.dividerLine}/></div>
              <button style={{...s.btnOutline,width:"100%",boxSizing:"border-box"}} onClick={()=>openModal(authModal==="recover-investor"?"investor-login":"founder-login")}>Back to Login</button>
            </div>
          )}
        </div>
      </div>
    );

    if (authModal === "investor-login") return (
      <div style={s.modal} onClick={()=>setAuthModal(null)}>
        <div style={s.modalBox} onClick={e=>e.stopPropagation()}>
          <h2 style={{margin:"0 0 4px",fontWeight:800}}>Investor Login</h2>
          <p style={{color:"#888",fontSize:13,marginTop:0,marginBottom:20}}>Welcome back.</p>
          {authError && <div style={s.error}>{authError}</div>}
          <label style={s.label}>Email *</label>
          <input style={s.input} placeholder="jane@sequoia.com" value={loginForm.email} onChange={e=>setLoginForm(f=>({...f,email:e.target.value}))}/>
          <label style={s.label}>Password *</label>
          <input style={s.input} type="password" placeholder="••••••••" value={loginForm.password} onChange={e=>setLoginForm(f=>({...f,password:e.target.value}))}/>
          <button style={{...s.btn,width:"100%",marginTop:4}} onClick={handleInvestorLogin}>Log In →</button>
          <button style={{background:"none",border:"none",color:"#888",fontSize:12,cursor:"pointer",marginTop:8,textDecoration:"underline",padding:0}} onClick={()=>openModal("recover-investor")}>Forgot password?</button>
          <div style={s.divider}><div style={s.dividerLine}/><span style={s.dividerText}>don't have an account?</span><div style={s.dividerLine}/></div>
          <button style={{...s.btnOutline,width:"100%",boxSizing:"border-box"}} onClick={()=>openModal("investor-signup")}>Create Investor Account</button>
        </div>
      </div>
    );
    if (authModal === "investor-signup") return (
      <div style={s.modal} onClick={()=>setAuthModal(null)}>
        <div style={s.modalBox} onClick={e=>e.stopPropagation()}>
          <h2 style={{margin:"0 0 4px",fontWeight:800}}>Create Investor Account</h2>
          <p style={{color:"#888",fontSize:13,marginTop:0,marginBottom:20}}>Your preferences power AI match scoring.</p>
          {authError && <div style={s.error}>{authError}</div>}
          <label style={s.label}>Full Name *</label>
          <input style={s.input} placeholder="Jane Smith" value={authForm.name} onChange={e=>setAuthForm(f=>({...f,name:e.target.value}))}/>
          <label style={s.label}>Firm Name</label>
          <input style={s.input} placeholder="Sequoia Capital" value={authForm.firm} onChange={e=>setAuthForm(f=>({...f,firm:e.target.value}))}/>
          <label style={s.label}>Email *</label>
          <input style={s.input} placeholder="jane@sequoia.com" value={authForm.email} onChange={e=>setAuthForm(f=>({...f,email:e.target.value}))}/>
          <label style={s.label}>Scheduling Link</label>
          <input style={s.input} placeholder="https://calendly.com/jane" value={authForm.schedulingLink} onChange={e=>setAuthForm(f=>({...f,schedulingLink:e.target.value}))}/>
          <label style={s.label}>Focus Verticals</label>
          <CheckList items={VERTICALS} selected={authForm.focusVerticals} onChange={v=>setAuthForm(f=>({...f,focusVerticals:v}))}/>
          <label style={s.label}>Focus Stages</label>
          <CheckList items={STAGES} selected={authForm.focusStages} onChange={v=>setAuthForm(f=>({...f,focusStages:v}))}/>
          <label style={s.label}>Password *</label>
          <input style={s.input} type="password" placeholder="••••••••" value={authForm.password} onChange={e=>setAuthForm(f=>({...f,password:e.target.value}))}/>
          <button style={{...s.btn,width:"100%",marginTop:4}} onClick={handleInvestorSignup}>Create Account →</button>
          <div style={s.divider}><div style={s.dividerLine}/><span style={s.dividerText}>already have an account?</span><div style={s.dividerLine}/></div>
          <button style={{...s.btnOutline,width:"100%",boxSizing:"border-box"}} onClick={()=>openModal("investor-login")}>Log In</button>
        </div>
      </div>
    );
    if (authModal === "founder-login") return (
      <div style={s.modal} onClick={()=>setAuthModal(null)}>
        <div style={s.modalBox} onClick={e=>e.stopPropagation()}>
          <h2 style={{margin:"0 0 4px",fontWeight:800}}>Founder Login</h2>
          <p style={{color:"#888",fontSize:13,marginTop:0,marginBottom:20}}>Access your company dashboard.</p>
          {authError && <div style={s.error}>{authError}</div>}
          <label style={s.label}>Email *</label>
          <input style={s.input} placeholder="you@company.com" value={loginForm.email} onChange={e=>setLoginForm(f=>({...f,email:e.target.value}))}/>
          <label style={s.label}>Password *</label>
          <input style={s.input} type="password" placeholder="••••••••" value={loginForm.password} onChange={e=>setLoginForm(f=>({...f,password:e.target.value}))}/>
          <button style={{...s.btn,width:"100%",marginTop:4}} onClick={handleFounderLogin}>Log In →</button>
          <button style={{background:"none",border:"none",color:"#888",fontSize:12,cursor:"pointer",marginTop:8,textDecoration:"underline",padding:0}} onClick={()=>openModal("recover-founder")}>Forgot password?</button>
          <div style={s.divider}><div style={s.dividerLine}/><span style={s.dividerText}>don't have an account?</span><div style={s.dividerLine}/></div>
          <button style={{...s.btnOutline,width:"100%",boxSizing:"border-box"}} onClick={()=>{setAuthModal(null);setView("founder");}}>List Your Company</button>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div style={{...s.app,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}>
      <div style={{color:ACCENT,fontSize:22,fontWeight:800}}>FundFlow</div>
      <div style={{color:"#555",fontSize:13}}>Loading…</div>
    </div>
  );

  if (view === "home") return (
    <div style={s.app}>
      <NavBar right={<>
        <button style={s.navBtn} onClick={()=>openModal("founder-login")}>Founder Login</button>
        <button style={s.navBtn} onClick={()=>openModal("investor-login")}>Investor Login</button>
        <button style={s.navBtnPrimary} onClick={()=>setView("founder")}>List Your Company</button>
      </>}/>
      <div style={{...s.page,textAlign:"center",paddingTop:100}}>
        <div style={{display:"inline-block",background:"#001a0f",border:`1px solid #00f5a044`,borderRadius:6,padding:"3px 10px",fontSize:12,color:ACCENT,marginBottom:20}}>🚀 The fundraising network</div>
        <h1 style={s.h1}>Where founders meet<br/><span style={{color:ACCENT}}>the right investors.</span></h1>
        <p style={s.sub}>Post your company. Investors discover, get AI-matched, and connect — right in the app.</p>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:28,marginBottom:4}}>
          <span style={{fontSize:12,color:"#555"}}>Powered by</span>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <svg width="20" height="20" viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="48" stroke="white" strokeWidth="4" fill="none"/><path d="M50 20 C35 20,25 32,28 45 C20 42,12 50,18 60 C12 65,15 78,28 78 C30 88,42 95,50 90 C58 95,70 88,72 78 C85 78,88 65,82 60 C88 50,80 42,72 45 C75 32,65 20,50 20Z" stroke="white" strokeWidth="3.5" fill="none"/></svg>
            <span style={{fontSize:13,fontWeight:700,color:"white",letterSpacing:"0.12em"}}>MERCURY</span>
          </div>
        </div>
        <div style={{display:"flex",gap:12,justifyContent:"center",marginTop:28}}>
          <button style={s.btn} onClick={()=>setView("founder")}>I'm a Founder →</button>
          <button style={s.btnOutline} onClick={()=>openModal("investor-signup")}>I'm an Investor →</button>
        </div>
      </div>
      {renderModal()}
      {toastMsg && <div style={s.toast}>{toastMsg}</div>}
    </div>
  );

  if (view === "founder") return (
    <div style={s.app}>
      <NavBar right={<><button style={s.navBtn} onClick={()=>openModal("founder-login")}>Founder Login</button><button style={s.navBtn} onClick={()=>setView("home")}>← Back</button></>}/>
      <div style={{...s.page,maxWidth:600}}>
        <h1 style={{...s.h1,fontSize:32,marginBottom:8}}>List Your <span style={{color:ACCENT}}>Company</span></h1>
        <p style={s.sub}>Fill in your details to be discovered by investors on FundFlow.</p>
        <div style={{...s.card,marginTop:32}}>
          <label style={s.label}>Founder Name *</label>
          <input style={s.input} placeholder="Alex Johnson" value={founderForm.name} onChange={e=>setFounderForm(f=>({...f,name:e.target.value}))}/>
          <label style={s.label}>Company Name *</label>
          <input style={s.input} placeholder="AcmeCorp" value={founderForm.company} onChange={e=>setFounderForm(f=>({...f,company:e.target.value}))}/>
          <label style={s.label}>Company Logo (JPG, PNG)</label>
          <div style={{marginBottom:12}}>
            {founderForm.logoDataUrl && <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
              <img src={founderForm.logoDataUrl} alt="logo" style={{width:64,height:64,borderRadius:12,objectFit:"cover",border:`1px solid ${BORDER}`}}/>
              <button style={{...s.btnOutline,fontSize:12,padding:"6px 12px"}} onClick={()=>{setFounderForm(f=>({...f,logoDataUrl:""}));if(logoRef.current)logoRef.current.value="";}}>Remove</button>
            </div>}
            <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/jpg,image/webp" style={{...s.input,padding:"8px 14px",cursor:"pointer"}} onChange={async e=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=()=>setFounderForm(f=>({...f,logoDataUrl:r.result}));r.readAsDataURL(file);}}/>
          </div>
          <label style={s.label}>Vertical</label>
          <select style={s.select} value={founderForm.vertical} onChange={e=>setFounderForm(f=>({...f,vertical:e.target.value}))}>{VERTICALS.map(v=><option key={v}>{v}</option>)}</select>
          <label style={s.label}>Stage</label>
          <select style={s.select} value={founderForm.stage} onChange={e=>setFounderForm(f=>({...f,stage:e.target.value}))}>{STAGES.map(st=><option key={st}>{st}</option>)}</select>
          <label style={s.label}>Round Amount</label>
          <input style={s.input} placeholder="e.g. $2M" value={founderForm.roundAmount} onChange={e=>setFounderForm(f=>({...f,roundAmount:e.target.value}))}/>
          <label style={s.label}>Short Description</label>
          <textarea style={{...s.input,height:80,resize:"vertical"}} placeholder="We build..." value={founderForm.description} onChange={e=>setFounderForm(f=>({...f,description:e.target.value}))}/>
          <label style={s.label}>Pitch Deck (PDF or PPTX)</label>
          <input type="file" accept=".pdf,.pptx,.ppt" style={{...s.input,padding:"8px 14px",cursor:"pointer"}}/>
          <label style={s.label}>Your Email *</label>
          <input style={s.input} placeholder="you@company.com" value={founderForm.email} onChange={e=>setFounderForm(f=>({...f,email:e.target.value}))}/>
          <label style={s.label}>Scheduling Link</label>
          <input style={s.input} placeholder="https://calendly.com/yourname" value={founderForm.schedulingLink} onChange={e=>setFounderForm(f=>({...f,schedulingLink:e.target.value}))}/>
          <label style={s.label}>Password *</label>
          <input style={s.input} type="password" placeholder="••••••••" value={founderForm.password} onChange={e=>setFounderForm(f=>({...f,password:e.target.value}))}/>
          <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:16}}>
            <input type="checkbox" id="fr" checked={founderForm.fundraising} onChange={e=>setFounderForm(f=>({...f,fundraising:e.target.checked}))} style={{accentColor:ACCENT,width:16,height:16}}/>
            <label htmlFor="fr" style={{fontSize:14,cursor:"pointer"}}>Currently fundraising</label>
          </div>
          {founderError && <div style={s.error}>{founderError}</div>}
          <button style={{...s.btn,width:"100%",opacity:founderSubmitting?0.6:1}} onClick={handleFounderSubmit} disabled={founderSubmitting}>{founderSubmitting?"Publishing…":"Publish Profile →"}</button>
        </div>
      </div>
      {toastMsg && <div style={s.toast}>{toastMsg}</div>}
    </div>
  );

  if (view === "founder-dashboard" && founderAccount) return (
    <div style={s.app}>
      <NavBar right={<><span style={{fontSize:13,color:"#888",marginRight:8}}>👋 {founderAccount.founderName}</span><button style={s.navBtn} onClick={signOutFounder}>Sign Out</button></>}/>
      <div style={{...s.page,maxWidth:600}}>
        <div style={{display:"inline-block",background:"#001a0f",border:`1px solid #00f5a044`,borderRadius:6,padding:"3px 10px",fontSize:12,color:ACCENT,marginBottom:16}}>✅ Profile Live</div>
        <div style={{display:"flex",gap:16,alignItems:"center",marginBottom:8}}>
          <Logo url={founderAccount.logoDataUrl} name={founderAccount.name} size={56}/>
          <h1 style={{...s.h1,fontSize:28,margin:0}}>{founderAccount.name}</h1>
        </div>
        <p style={s.sub}>Your company is now visible to investors on FundFlow.</p>
        <div style={{...s.card,marginTop:24}}>
          {[["Vertical",founderAccount.vertical],["Stage",founderAccount.stage],["Round",founderAccount.roundAmount],["Email",founderAccount.founderEmail]].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${BORDER}`}}>
              <span style={{color:"#888",fontSize:13}}>{k}</span><span style={{fontSize:13}}>{v}</span>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0"}}>
            <span style={{color:"#888",fontSize:13}}>Fundraising</span>
            <span style={{fontSize:13,color:founderAccount.fundraising?ACCENT:"#888"}}>{founderAccount.fundraising?"🟢 Active":"⚫ Paused"}</span>
          </div>
        </div>
        <p style={{color:"#666",fontSize:13,marginTop:16}}>When an investor requests to connect, you'll receive an email with their details and a scheduling link.</p>
      </div>
      {toastMsg && <div style={s.toast}>{toastMsg}</div>}
    </div>
  );

  // INVESTOR DASHBOARD
  return (
    <div style={s.app}>
      <NavBar right={<>
        {loadingMatch && <span style={{fontSize:12,color:"#888",marginRight:8}}>✨ Scoring…</span>}
        <span style={{fontSize:13,color:"#888"}}>{investorAccount?.name}{investorAccount?.firm?` · ${investorAccount.firm}`:""}</span>
        <button style={s.navBtn} onClick={()=>scoreMatches(companies,investorAccount)} disabled={loadingMatch}>↻ Rescore</button>
        <button style={s.navBtn} onClick={signOutInvestor}>Sign Out</button>
      </>}/>
      <div style={s.page}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:16,marginBottom:32}}>
          <div>
            <h1 style={{...s.h1,fontSize:28,marginBottom:8}}>Deal <span style={{color:ACCENT}}>Flow</span></h1>
            <p style={{color:"#888",fontSize:14}}>{filtered.length} {filtered.length===1?"company":"companies"} · sorted by AI match score</p>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            <select style={{...s.select,width:"auto",marginBottom:0}} value={filterVertical} onChange={e=>setFilterVertical(e.target.value)}>
              <option value="All">All Verticals</option>{VERTICALS.map(v=><option key={v}>{v}</option>)}
            </select>
            <select style={{...s.select,width:"auto",marginBottom:0}} value={filterStage} onChange={e=>setFilterStage(e.target.value)}>
              <option value="All">All Stages</option>{STAGES.map(st=><option key={st}>{st}</option>)}
            </select>
            <button style={{...(showSaved?s.btn:s.btnOutline),padding:"10px 16px"}} onClick={()=>setShowSaved(v=>!v)}>{showSaved?"★ Saved":"☆ Saved"}</button>
          </div>
        </div>
        {filtered.length===0 && <div style={{textAlign:"center",padding:"80px 0",color:"#555"}}><div style={{fontSize:48}}>🔍</div><div style={{marginTop:12,fontSize:15}}>{companies.length===0?"No companies listed yet.":"No companies match your filters."}</div></div>}
        <div style={s.grid}>
          {filtered.map(co=>(
            <div key={co.id} style={s.companyCard}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div style={{display:"flex",gap:12,alignItems:"center"}}>
                  <Logo url={co.logoDataUrl} name={co.name} size={44}/>
                  <div><div style={{fontWeight:700,fontSize:17}}>{co.name}</div><div style={{color:"#888",fontSize:12}}>{co.founderName}</div></div>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                  <button onClick={()=>toggleBookmark(co.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:co.bookmarked?ACCENT:"#555",padding:0}}>{co.bookmarked?"★":"☆"}</button>
                  {co.matchScore!==null && <div style={{background:"#111",border:`1px solid ${scoreColor(co.matchScore)}44`,borderRadius:8,padding:"3px 8px",textAlign:"center"}}><div style={{fontSize:15,fontWeight:800,color:scoreColor(co.matchScore)}}>{co.matchScore}%</div><div style={{fontSize:9,color:"#666",letterSpacing:"0.5px"}}>MATCH</div></div>}
                  {co.matchScore===null&&loadingMatch&&<div style={{fontSize:11,color:"#555"}}>…scoring</div>}
                </div>
              </div>
              <p style={{color:"#aaa",fontSize:13,lineHeight:1.5,margin:0}}>{co.description}</p>
              {co.matchReason && <div style={{background:"#0d1a12",border:`1px solid #00f5a022`,borderRadius:8,padding:"8px 12px",fontSize:12,color:"#7be8b4",lineHeight:1.4}}>✨ {co.matchReason}</div>}
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <span style={s.tag}>{co.vertical}</span>
                <span style={s.tag}>{co.stage}</span>
                {co.roundAmount&&<span style={s.tagAccent}>{co.roundAmount}</span>}
              </div>
              <button style={{...s.btn,padding:"10px",fontSize:13}} onClick={()=>setContactModal(co)}>Request to Connect</button>
            </div>
          ))}
        </div>
      </div>
      {contactModal && (
        <div style={s.modal} onClick={()=>setContactModal(null)}>
          <div style={s.modalBox} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:20}}>
              <Logo url={contactModal.logoDataUrl} name={contactModal.name} size={48}/>
              <div><h2 style={{margin:0,fontWeight:800}}>Connect with {contactModal.name}</h2><p style={{margin:0,color:"#888",fontSize:13}}>Founder: {contactModal.founderName}</p></div>
            </div>
            {contactModal.matchScore!==null && <div style={{background:"#0d1a12",border:`1px solid #00f5a022`,borderRadius:10,padding:12,marginBottom:16,display:"flex",alignItems:"center",gap:12}}><div style={{fontSize:24,fontWeight:800,color:scoreColor(contactModal.matchScore)}}>{contactModal.matchScore}%</div><div style={{fontSize:13,color:"#7be8b4"}}>{contactModal.matchReason}</div></div>}
            <div style={{background:"#111",borderRadius:10,padding:16,marginBottom:20}}>
              <div style={{fontSize:13,color:"#888",marginBottom:8}}>Your info being shared:</div>
              <div style={{fontSize:14,fontWeight:600}}>{investorAccount?.name}{investorAccount?.firm?` · ${investorAccount.firm}`:""}</div>
              <div style={{fontSize:13,color:"#aaa"}}>{investorAccount?.email}</div>
            </div>
            <label style={s.label}>Personal message (optional)</label>
            <textarea style={{...s.input,height:90,resize:"vertical"}} placeholder={`Hi ${contactModal.founderName}, I'd love to learn more…`} value={contactForm.message} onChange={e=>setContactForm(f=>({...f,message:e.target.value}))}/>
            {contactModal.schedulingLink ? <div style={{background:"#001a0f",border:`1px solid #00f5a022`,borderRadius:10,padding:12,marginBottom:16,fontSize:13,color:ACCENT}}>📅 Founder's scheduling link will be included.</div> : <div style={{background:"#1a1500",border:"1px solid #f5c50022",borderRadius:10,padding:12,marginBottom:16,fontSize:13,color:"#f5c500"}}>⚠️ Founder hasn't added a scheduling link — yours will be included instead.</div>}
            <div style={{display:"flex",gap:10}}>
              <button style={{...s.btn,flex:1}} onClick={sendContactRequest}>📧 Send Connection Request</button>
              <button style={s.btnOutline} onClick={()=>setContactModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {toastMsg && <div style={s.toast}>{toastMsg}</div>}
    </div>
  );
}
