import { useState, useRef, useEffect } from "react";

/*
 * BACKEND API NOTE
 * ─────────────────────────────────────────────────────────────────────────────
 * The audit call hits POST /api/generate-audit on YOUR server (not the browser).
 * Your server builds the prompt, calls Claude with process.env.ANTHROPIC_API_KEY,
 * and returns the JSON report. Never expose API keys in frontend code.
 *
 * Minimal Express skeleton (server-side only, never runs in the browser):
 *   // Server only — install the Anthropic Node SDK on your server (not in the browser)
 *   app.post("/api/generate-audit", async (req, res) => {
 *     // require the SDK via your server bundler / package.json
 *     const client = new AnthropicClient({ apiKey: process.env.ANTHROPIC_API_KEY });
 *     const msg = await client.messages.create({
 *       model: "claude-sonnet-4-20250514", max_tokens: 2000,
 *       messages: [{ role: "user", content: req.body.prompt }],
 *     });
 *     res.json(JSON.parse(msg.content[0].text));
 *   });
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Global styles ─────────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=IBM+Plex+Mono:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --ink:#0a0a0f;--panel:#111118;--surface:#16161f;
      --border:#242430;--border-bright:#3a3a50;
      --amber:#f5a623;--amber-dim:#c47d0e;--amber-glow:rgba(245,166,35,0.12);
      --green:#00d68f;--red:#ff4757;--blue:#4a9eff;
      --text:#e8e8f0;--muted:#6b6b85;--dim:#3a3a50;
    }
    body{background:var(--ink);color:var(--text);font-family:'IBM Plex Mono',monospace}
    ::-webkit-scrollbar{width:4px}
    ::-webkit-scrollbar-track{background:var(--ink)}
    ::-webkit-scrollbar-thumb{background:var(--dim);border-radius:2px}
    @keyframes pulse-amber{0%,100%{box-shadow:0 0 0 0 rgba(245,166,35,0.4)}50%{box-shadow:0 0 0 8px rgba(245,166,35,0)}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
    @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
    .fade-up{animation:fadeUp .4s ease forwards}

    /* Layout */
    .main-layout{display:flex;min-height:100vh;background:var(--ink)}
    .sidebar{width:220px;flex-shrink:0;background:var(--panel);border-right:1px solid var(--border);display:flex;flex-direction:column;position:fixed;height:100vh;z-index:20;transition:transform .25s ease}
    .main-content{margin-left:220px;flex:1;min-height:100vh;overflow-y:auto}
    .mobile-bar{display:none}

    /* Responsive grids */
    .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:28px}
    .pricing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;max-width:980px;margin:0 auto}
    .form-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .table-wrap{overflow-x:auto}
    .lead-table{width:100%;border-collapse:collapse;min-width:680px}
    .page-pad{padding:32px 40px}

    @media(max-width:900px){
      .stats-grid{grid-template-columns:1fr 1fr!important}
      .pricing-grid{grid-template-columns:1fr!important;max-width:460px}
      .form-grid-2{grid-template-columns:1fr!important}
    }
    @media(max-width:640px){
      .sidebar{transform:translateX(-100%)}
      .sidebar.open{transform:translateX(0)}
      .main-content{margin-left:0!important;padding-top:52px}
      .mobile-bar{display:flex}
      .stats-grid{grid-template-columns:1fr!important}
      .page-pad{padding:20px 16px!important}
      .hide-mob{display:none!important}
    }
  `}</style>
);

// ── Static data ───────────────────────────────────────────────────────────────
const MOCK_LEADS = [
  {id:1,name:"Riverside Dental Group",url:"riversidedental.com",industry:"Healthcare",score:87,status:"hot",rev:"$2.4M",employees:28,lastAudit:"2d ago",city:"Austin, TX",goal:"More Appointments"},
  {id:2,name:"Metro Plumbing Co.",url:"metroplumbing.net",industry:"Home Services",score:72,status:"warm",rev:"$890K",employees:12,lastAudit:"5d ago",city:"Denver, CO",goal:"More Leads"},
  {id:3,name:"Oak & Stone Realty",url:"oakstone.com",industry:"Real Estate",score:91,status:"hot",rev:"$5.1M",employees:45,lastAudit:"1d ago",city:"Nashville, TN",goal:"Better Follow-Up"},
  {id:4,name:"Blue Sky Auto Repair",url:"blueskyauto.com",industry:"Automotive",score:58,status:"cold",rev:"$420K",employees:8,lastAudit:"12d ago",city:"Phoenix, AZ",goal:"Save Staff Time"},
  {id:5,name:"Harvest Kitchen",url:"harvestkitchen.co",industry:"Restaurant",score:64,status:"warm",rev:"$780K",employees:22,lastAudit:"8d ago",city:"Portland, OR",goal:"More Reviews"},
  {id:6,name:"Pinnacle Law Group",url:"pinnaclelaw.com",industry:"Legal",score:95,status:"hot",rev:"$8.3M",employees:67,lastAudit:"3h ago",city:"Chicago, IL",goal:"Better Follow-Up"},
];

const SERVICE_PACKAGES = [
  {name:"Starter Audit",price:"$97",priceNote:"one-time",color:"#6b6b85",tag:"GET STARTED",highlight:false,cta:"Order Audit",
   deliverables:["Full AI Business Audit Report","Top 3 automation opportunities","Competitor gap analysis","30-day quick-win roadmap","PDF delivered within 24 hrs"]},
  {name:"Automation Setup",price:"$497+",priceNote:"per system",color:"#f5a623",tag:"MOST POPULAR",highlight:true,cta:"Book Strategy Call",
   deliverables:["Everything in Starter Audit","Done-for-you automation build","AI chatbot or booking system","CRM + follow-up sequence","30-day onboarding support","Monthly performance check-in"]},
  {name:"Growth System",price:"$997+",priceNote:"per month",color:"#4a9eff",tag:"FULL SERVICE",highlight:false,cta:"Apply Now",
   deliverables:["Complete audit + setup","Full automation stack deployed","Review generation system","Ongoing optimization & reporting","Priority Slack/text support","Quarterly strategy reviews"]},
];

const STATUS_COLORS={hot:"#ff4757",warm:"#f5a623",cold:"#4a9eff"};
const EFFORT_COLOR={low:"#00d68f",medium:"#f5a623",high:"#ff4757"};
const SEV_COLOR={critical:"#ff4757",high:"#f5a623",medium:"#4a9eff"};
const CONF_COLOR={high:"#00d68f",medium:"#f5a623",low:"#6b6b85"};

const INDUSTRIES=["Healthcare","Legal","Real Estate","Home Services","Restaurant","Automotive","Retail","Fitness","Finance","Education","Beauty & Salon","Childcare"];
const GOALS=["More Leads","More Appointments","Better Follow-Up","More Reviews","Save Staff Time"];

// ── Shared UI components ──────────────────────────────────────────────────────
function ScoreRing({score,size=64,stroke=5}){
  const r=(size-stroke*2)/2,circ=2*Math.PI*r;
  const color=score>=80?"#00d68f":score>=60?"#f5a623":"#ff4757";
  return(
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ*(1-score/100)} strokeLinecap="round"
        style={{transform:"rotate(-90deg)",transformOrigin:"50% 50%",transition:"stroke-dashoffset 1s ease"}}/>
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        fill={color} fontSize={size*0.22} fontFamily="IBM Plex Mono" fontWeight="600">{score}</text>
    </svg>
  );
}

function Tag({children,color}){
  return <span style={{fontSize:10,letterSpacing:"0.08em",textTransform:"uppercase",fontWeight:600,padding:"3px 8px",borderRadius:3,border:`1px solid ${color}40`,color,background:`${color}12`}}>{children}</span>;
}

function StatCard({label,value,delta,accent}){
  return(
    <div style={{background:"var(--panel)",border:"1px solid var(--border)",borderRadius:8,padding:"20px 24px",position:"relative",overflow:"hidden"}}>
      <div style={{width:2,height:"100%",background:accent,position:"absolute",left:0,top:0,borderRadius:"4px 0 0 4px"}}/>
      <div style={{fontSize:11,color:"var(--muted)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>{label}</div>
      <div style={{fontSize:28,fontWeight:700,fontFamily:"Syne",color:"var(--text)"}}>{value}</div>
      {delta&&<div style={{fontSize:11,color:"var(--green)",marginTop:4}}>↑ {delta} this week</div>}
    </div>
  );
}

function Field({label,value,onChange,placeholder,type="text",disabled}){
  const [f,setF]=useState(false);
  return(
    <div>
      <label style={{fontSize:11,color:"var(--muted)",letterSpacing:"0.1em",textTransform:"uppercase",display:"block",marginBottom:6}}>{label}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
        onFocus={()=>setF(true)} onBlur={()=>setF(false)}
        style={{width:"100%",background:"var(--surface)",borderRadius:6,padding:"10px 14px",color:"var(--text)",fontFamily:"IBM Plex Mono",fontSize:13,outline:"none",border:`1px solid ${f?"var(--amber)":"var(--border)"}`,transition:"border-color .2s"}}/>
    </div>
  );
}

function Select({label,value,onChange,options,disabled}){
  return(
    <div>
      <label style={{fontSize:11,color:"var(--muted)",letterSpacing:"0.1em",textTransform:"uppercase",display:"block",marginBottom:6}}>{label}</label>
      <select value={value} onChange={e=>onChange(e.target.value)} disabled={disabled}
        style={{width:"100%",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:6,padding:"10px 14px",color:"var(--text)",fontFamily:"IBM Plex Mono",fontSize:13,outline:"none"}}>
        {options.map(o=><option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Btn({children,onClick,variant="primary",full,small,disabled,href}){
  const base={border:"none",borderRadius:6,cursor:disabled?"not-allowed":"pointer",fontFamily:"IBM Plex Mono",letterSpacing:"0.04em",fontWeight:600,transition:"all .18s",opacity:disabled?.5:1,padding:small?"7px 14px":"10px 18px",fontSize:small?11:12,width:full?"100%":undefined,textDecoration:"none",display:"inline-block"};
  const v={primary:{background:"var(--amber)",color:"var(--ink)"},ghost:{background:"transparent",color:"var(--text)",border:"1px solid var(--border-bright)"},success:{background:"rgba(0,214,143,0.12)",color:"var(--green)",border:"1px solid rgba(0,214,143,0.3)"},muted:{background:"var(--dim)",color:"var(--muted)"}};
  const s={...base,...(disabled?v.muted:v[variant])};
  if(href) return <a href={href} target="_blank" rel="noopener noreferrer" style={s}>{children}</a>;
  return <button onClick={onClick} disabled={disabled} style={s}>{children}</button>;
}

// ── Demo report builder (fires when backend is absent) ────────────────────────
function buildMockReport({bizName,url,industry,city,goal,email}){
  return{
    businessName:bizName,website:url,industry,city,goal,email,
    overallScore:66,leadScore:78,
    estimatedRevenue:"$800K–$2M",employees:"10–35",
    disclaimer:"Financial estimates are AI-generated projections based on industry benchmarks. Actual results will vary and are not guaranteed.",
    executiveSummary:`${bizName} is a ${(industry||"").toLowerCase()} business in ${city||"your area"} with solid local presence but significant gaps in digital lead capture and follow-up automation. Based on the stated goal of "${goal}", we identified 4 high-impact opportunities that top competitors are already leveraging. Closing these gaps could recover an estimated $13,200/month in lost and unrealized revenue.`,
    weaknesses:[
      {category:"Lead Capture",severity:"critical",confidence:"high",issue:"No live chat, chatbot, or after-hours lead form on website",evidence:"No chat widget script detected on homepage. Industry data: 67% of service inquiries arrive outside business hours when phone lines are closed.",impact:"Losing the majority of after-hours visitors with no way to capture their intent.",lostRevenue:"$6,800/mo"},
      {category:"Scheduling",severity:"high",confidence:"high",issue:"Appointment booking requires a phone call during business hours only",evidence:"No online booking link found on homepage, contact page, or Google Business Profile. Top-3 competitors in this market average 2.3 digital booking touchpoints.",impact:"High friction converting website visitors to booked appointments; staff time wasted on manual scheduling.",lostRevenue:"$3,200/mo"},
      {category:"Reviews & Reputation",severity:"high",confidence:"medium",issue:"No automated post-service review request system in place",evidence:`Google Business Profile shows under 40 reviews. Top ${industry} competitors in ${city||"the area"} average 180+ reviews at 4.7★, driving significantly more map-pack clicks.`,impact:"Below-average star rating reduces local visibility and consumer trust.",lostRevenue:"$2,100/mo"},
      {category:"Follow-Up / CRM",severity:"medium",confidence:"medium",issue:"No lead nurture or re-engagement email/SMS sequence detected",evidence:"No email marketing platform script detected on site. Industry benchmark: businesses that follow up 5+ times convert 80% more leads than those who follow up once.",impact:"Leads and past customers not being re-engaged; low lifetime customer value.",lostRevenue:"$1,100/mo"},
    ],
    automations:[
      {priority:1,name:"AI Lead Capture Chatbot",category:"Lead Gen",tool:"Tidio + GPT-4o mini",description:"24/7 AI chatbot that answers FAQs, qualifies leads, and books appointments automatically — even at 2 am.",roi:"$6,800/mo",effort:"low",timesSaved:"18 hrs/wk",confidence:"high",presetService:"Automation Setup $497+",profitAngle:"Captures leads you're currently losing after-hours and converts them to booked jobs without any staff involvement."},
      {priority:2,name:"Online Booking System",category:"Scheduling",tool:"Calendly Pro + Zapier",description:"Self-serve booking page synced to your calendar with automated text & email reminders to reduce no-shows by 40–60%.",roi:"$3,200/mo",effort:"low",timesSaved:"12 hrs/wk",confidence:"high",presetService:"Automation Setup $497+",profitAngle:"Eliminates phone tag, frees staff time, and reduces no-shows that cost you booked revenue."},
      {priority:3,name:"Automated Review Engine",category:"Marketing",tool:"Podium + Google SMS API",description:"Sends a personalised SMS review request 2 hours after every completed job with a 1-tap link to your Google profile.",roi:"$2,100/mo",effort:"low",timesSaved:"5 hrs/wk",confidence:"high",presetService:"Starter Audit $97",profitAngle:"More 5-star reviews = higher map pack ranking = more inbound leads without ad spend."},
      {priority:4,name:"CRM + Lead Nurture Sequence",category:"CRM",tool:"GoHighLevel",description:"Automatically tags every lead, fires a 5-step follow-up email/SMS sequence, and flags hot leads for manual outreach.",roi:"$1,100/mo",effort:"medium",timesSaved:"8 hrs/wk",confidence:"medium",presetService:"Growth System $997+",profitAngle:"Re-engages the 80% of leads who didn't convert immediately — most local businesses never follow up more than once."},
      {priority:5,name:"Social Proof & Content Engine",category:"Marketing",tool:"Buffer + Canva AI + Zapier",description:"Auto-generates and schedules weekly social posts from completed jobs, reviews, and promotions to maintain local visibility.",roi:"$900/mo",effort:"low",timesSaved:"6 hrs/wk",confidence:"medium",presetService:"Growth System $997+",profitAngle:"Consistent social presence builds trust and keeps you top-of-mind for referrals without any hourly effort."},
    ],
    totalMonthlyOpportunity:"$13,200/mo",
    quickWins:[`Add Tidio chatbot to ${url||"your website"} (1-day setup, no code needed)`,`Claim & fully optimise Google Business Profile with photos + booking link`,"Set up a free Calendly account and add the link to your site header today"],
    techStack:["WordPress (likely)","Google Analytics","Facebook Business Page"],
    competitorGap:`Top-ranked ${industry} businesses in ${city||"your market"} respond to enquiries in under 5 minutes via live chat, maintain 4.7+ star ratings with 150+ reviews, and use automated follow-up sequences that contact leads 5–7 times before giving up.`,
    thirtyDayPlan:{
      phase1:{title:"Quick Wins (Days 1–7)",actions:["Install Tidio chatbot with FAQ + lead capture flow","Add Calendly booking link to website header, Google Business Profile & email signature","Activate Podium SMS review requests triggered after each completed job"]},
      phase2:{title:"Follow-Up Automation (Days 8–21)",actions:["Connect leads to GoHighLevel CRM and build 5-step follow-up sequence","Set up automated appointment reminders (24 hr + 2 hr before) to cut no-shows","Launch re-engagement campaign to past customers inactive for 90+ days"]},
      phase3:{title:"Reporting + Optimisation (Days 22–30)",actions:["Review chatbot conversation logs; refine FAQ responses for top missed questions","Analyse booking conversion rate and A/B test booking page headline","Pull 30-day ROI report: leads captured, appointments booked, reviews earned, hours saved"]},
    },
  };
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({onScan,onViewReport}){
  const stats=[
    {label:"Audits This Month",value:"143",delta:"12%",accent:"#f5a623"},
    {label:"Hot Leads",value:"38",delta:"8 leads",accent:"#ff4757"},
    {label:"Avg Opportunity",value:"$4,200",delta:"$340",accent:"#00d68f"},
    {label:"Reports Sent",value:"89",delta:"23%",accent:"#4a9eff"},
  ];
  return(
    <div className="page-pad" style={{animation:"fadeUp .4s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28,flexWrap:"wrap",gap:12}}>
        <div>
          <h1 style={{fontFamily:"Syne",fontSize:26,fontWeight:800,letterSpacing:"-0.02em"}}>Intelligence Dashboard</h1>
          <p style={{color:"var(--muted)",fontSize:13,marginTop:4}}>Preset &amp; Profit · Audit Command Centre</p>
        </div>
        <Btn onClick={onScan}>+ NEW AUDIT</Btn>
      </div>

      <div className="stats-grid">
        {stats.map(s=><StatCard key={s.label} {...s}/>)}
      </div>

      <div style={{background:"var(--panel)",border:"1px solid var(--border)",borderRadius:8,overflow:"hidden"}}>
        <div style={{padding:"14px 24px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontFamily:"Syne",fontWeight:700,fontSize:14}}>Recent Audits</span>
          <span style={{fontSize:11,color:"var(--muted)"}}>6 of 143 shown</span>
        </div>
        <div className="table-wrap">
          <table className="lead-table">
            <thead>
              <tr style={{borderBottom:"1px solid var(--border)"}}>
                {["Business","Industry / City","Score","Status","Goal","Last Audit",""].map(h=>(
                  <th key={h} style={{padding:"10px 20px",textAlign:"left",fontSize:10,color:"var(--muted)",letterSpacing:"0.1em",textTransform:"uppercase",fontWeight:600,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_LEADS.map(lead=>(
                <tr key={lead.id} style={{borderBottom:"1px solid var(--border)",transition:"background .15s",cursor:"pointer"}}
                  onMouseEnter={e=>e.currentTarget.style.background="var(--surface)"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{padding:"13px 20px"}}>
                    <div style={{fontWeight:600,fontSize:13}}>{lead.name}</div>
                    <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{lead.url}</div>
                  </td>
                  <td style={{padding:"13px 20px"}}>
                    <div style={{fontSize:12}}>{lead.industry}</div>
                    <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{lead.city}</div>
                  </td>
                  <td style={{padding:"13px 20px"}}><ScoreRing score={lead.score} size={42} stroke={4}/></td>
                  <td style={{padding:"13px 20px"}}><Tag color={STATUS_COLORS[lead.status]}>{lead.status}</Tag></td>
                  <td style={{padding:"13px 20px",fontSize:11,color:"var(--muted)",whiteSpace:"nowrap"}}>{lead.goal}</td>
                  <td style={{padding:"13px 20px",fontSize:11,color:"var(--muted)",whiteSpace:"nowrap"}}>{lead.lastAudit}</td>
                  <td style={{padding:"13px 20px"}}><Btn onClick={()=>onViewReport(lead)} variant="ghost" small>View →</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Audit Scanner ─────────────────────────────────────────────────────────────
function AuditScanner({onComplete}){
  const [form,setForm]=useState({bizName:"",url:"",industry:"Healthcare",city:"",goal:"More Leads",tools:"",email:""});
  const [scanning,setScanning]=useState(false);
  const [phase,setPhase]=useState(0);
  const [log,setLog]=useState([]);
  const logRef=useRef(null);
  const set=k=>v=>setForm(f=>({...f,[k]:v}));

  const phases=["Initialising audit engine…","Crawling website structure…","Checking page speed & mobile UX…","Scanning for live chat & chatbot…","Detecting booking & scheduling tools…","Auditing review platform coverage…","Analysing CRM & follow-up systems…","Checking social media presence…","Running AI weakness detection…","Building automation opportunity matrix…","Calculating ROI projections…","Compiling Preset & Profit report…"];

  const addLog=msg=>setLog(p=>[...p,{t:new Date().toLocaleTimeString(),msg}]);

  const buildPrompt=()=>`You are a senior automation consultant at Preset & Profit, a business automation agency.
Analyse this local business and return a detailed audit report as a single JSON object.
Business: ${form.bizName} | Website: ${form.url} | Industry: ${form.industry} | City: ${form.city} | Primary Goal: ${form.goal} | Current Tools: ${form.tools||"Unknown"} | Contact: ${form.email}

Return ONLY valid JSON (no markdown, no preamble) matching this schema exactly:
{"businessName":string,"website":string,"industry":string,"city":string,"goal":string,"email":string,"overallScore":number,"leadScore":number,"estimatedRevenue":string,"employees":string,"disclaimer":"Financial estimates are AI-generated projections based on industry benchmarks. Actual results will vary and are not guaranteed.","executiveSummary":string,"weaknesses":[{"category":string,"severity":"critical"|"high"|"medium","confidence":"high"|"medium"|"low","issue":string,"evidence":string,"impact":string,"lostRevenue":string}],"automations":[{"priority":number,"name":string,"category":string,"tool":string,"description":string,"roi":string,"effort":"low"|"medium"|"high","timesSaved":string,"confidence":"high"|"medium"|"low","presetService":string,"profitAngle":string}],"totalMonthlyOpportunity":string,"quickWins":[string,string,string],"techStack":[string,string,string],"competitorGap":string,"thirtyDayPlan":{"phase1":{"title":string,"actions":[string,string,string]},"phase2":{"title":string,"actions":[string,string,string]},"phase3":{"title":string,"actions":[string,string,string]}}}`;

  const runScan=async()=>{
    if(!form.bizName||!form.url)return;
    setScanning(true);setLog([]);
    for(let i=0;i<phases.length;i++){setPhase(i);addLog(phases[i]);await new Promise(r=>setTimeout(r,480));}
    let report=null;
    try{
      // Frontend calls your own backend — API key lives there, never here.
      const res=await fetch("/api/generate-audit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,prompt:buildPrompt()})});
      if(!res.ok)throw new Error("backend "+res.status);
      report=await res.json();
    }catch{
      report=buildMockReport(form); // demo fallback
    }
    setScanning(false);
    onComplete(report);
  };

  useEffect(()=>{if(logRef.current)logRef.current.scrollTop=logRef.current.scrollHeight;},[log]);
  const ready=form.bizName&&form.url;

  return(
    <div className="page-pad" style={{maxWidth:760,margin:"0 auto",animation:"fadeUp .4s ease"}}>
      <h1 style={{fontFamily:"Syne",fontSize:24,fontWeight:800,marginBottom:6}}>New Business Audit</h1>
      <p style={{color:"var(--muted)",fontSize:13,marginBottom:28}}>AI weakness detection & automation opportunity mapping · Preset &amp; Profit</p>

      <div style={{background:"var(--panel)",border:"1px solid var(--border)",borderRadius:8,padding:28,display:"grid",gap:16}}>
        <div className="form-grid-2">
          <Field label="Business Name *" value={form.bizName} onChange={set("bizName")} placeholder="e.g. Riverside Dental Group" disabled={scanning}/>
          <Field label="Website URL *" value={form.url} onChange={set("url")} placeholder="e.g. riversidedental.com" disabled={scanning}/>
        </div>
        <div className="form-grid-2">
          <Select label="Industry" value={form.industry} onChange={set("industry")} options={INDUSTRIES} disabled={scanning}/>
          <Field label="City / Service Area" value={form.city} onChange={set("city")} placeholder="e.g. Austin, TX" disabled={scanning}/>
        </div>
        <div className="form-grid-2">
          <Select label="Primary Goal" value={form.goal} onChange={set("goal")} options={GOALS} disabled={scanning}/>
          <Field label="Current Tools (CRM, booking, website…)" value={form.tools} onChange={set("tools")} placeholder="e.g. WordPress, Calendly" disabled={scanning}/>
        </div>
        <Field label="Contact Email (for sending report)" type="email" value={form.email} onChange={set("email")} placeholder="owner@business.com" disabled={scanning}/>
        <button onClick={runScan} disabled={scanning||!ready} style={{width:"100%",padding:13,borderRadius:6,border:"none",cursor:(!ready||scanning)?"not-allowed":"pointer",background:scanning?"var(--dim)":ready?"var(--amber)":"var(--dim)",color:(scanning||!ready)?"var(--muted)":"var(--ink)",fontFamily:"IBM Plex Mono",fontSize:13,fontWeight:600,letterSpacing:"0.05em",transition:"all .2s"}}>
          {scanning?"◈  SCANNING IN PROGRESS…":"◈  RUN AI AUDIT"}
        </button>
      </div>

      {scanning&&(
        <div style={{marginTop:20,background:"var(--panel)",border:"1px solid var(--border)",borderRadius:8,overflow:"hidden"}}>
          <div style={{padding:"11px 20px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:"var(--amber)",animation:"pulse-amber 1.5s infinite"}}/>
            <span style={{fontSize:11,color:"var(--amber)",letterSpacing:"0.1em"}}>LIVE SCAN · {phases[phase]}</span>
          </div>
          <div ref={logRef} style={{padding:16,maxHeight:200,overflowY:"auto"}}>
            {log.map((l,i)=>(
              <div key={i} style={{fontSize:11,color:i===log.length-1?"var(--amber)":"var(--muted)",padding:"3px 0",display:"flex",gap:12}}>
                <span style={{opacity:.5}}>{l.t}</span>
                <span>{i===log.length-1?"▶ ":"✓ "}{l.msg}</span>
              </div>
            ))}
          </div>
          <div style={{height:2,background:"var(--surface)"}}>
            <div style={{height:"100%",background:"var(--amber)",width:`${((phase+1)/phases.length)*100}%`,transition:"width .5s ease"}}/>
          </div>
        </div>
      )}
    </div>
  );
}

// ── HTML export ───────────────────────────────────────────────────────────────
function buildHTML(r){
  const sc=n=>n>=80?"#00875a":n>=60?"#c47d0e":"#c0392b";
  return`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Preset & Profit Audit — ${r.businessName}</title>
<style>
body{font-family:'Segoe UI',Arial,sans-serif;background:#f7f7f5;color:#1a1a2e;margin:0;padding:0}
.hdr{background:#0a0a0f;color:#fff;padding:36px 48px}
.brand{font-size:12px;letter-spacing:.12em;color:#f5a623;text-transform:uppercase;margin-bottom:8px}
h1{font-size:26px;margin:0 0 4px;font-weight:800}
.sub{font-size:13px;color:#6b6b85}
.body{max-width:860px;margin:0 auto;padding:40px 24px}
h2{font-size:15px;font-weight:700;border-bottom:2px solid #f5a623;padding-bottom:8px;margin:32px 0 16px}
.scores{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:20px}
.sc{background:#fff;border-radius:8px;padding:18px 20px;border:1px solid #e0e0e8;flex:1;min-width:140px;text-align:center}
.sc-n{font-size:34px;font-weight:800}
.sc-l{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#6b6b85;margin-top:4px}
.exec{background:#fffbf0;border-left:4px solid #f5a623;padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:16px;font-size:14px;line-height:1.7}
.disc{background:#f0f0f8;border-radius:6px;padding:10px 14px;font-size:12px;color:#6b6b85;margin-bottom:24px}
.w{background:#fff;border-radius:8px;padding:16px 18px;margin-bottom:10px;border:1px solid #e0e0e8}
.w.critical{border-left:4px solid #ff4757}
.w.high{border-left:4px solid #f5a623}
.w.medium{border-left:4px solid #4a9eff}
.w-meta{font-size:11px;color:#6b6b85;margin-bottom:8px;text-transform:uppercase;letter-spacing:.07em}
.w h3{margin:0 0 4px;font-size:15px}
.evidence{font-size:12px;color:#555;background:#f8f8f8;padding:8px 12px;border-radius:4px;margin-top:8px}
.lost{font-size:20px;font-weight:800;color:#ff4757;float:right}
.auto{background:#fff;border-radius:8px;padding:16px 18px;margin-bottom:10px;border:1px solid #e0e0e8}
.auto h3{margin:0 0 4px;font-size:15px}
.roi{font-size:22px;font-weight:800;color:#00875a;float:right}
.profit{font-size:13px;color:#00875a;margin-top:6px}
.preset{font-size:11px;background:#fff8ec;border:1px solid #f5a623;border-radius:4px;padding:3px 9px;display:inline-block;margin-top:8px;color:#b37700}
.phase{background:#fff;border-radius:8px;padding:16px 18px;margin-bottom:10px;border:1px solid #e0e0e8}
.phase h3{margin:0 0 10px;font-size:14px;color:#f5a623}
.phase li{font-size:13px;line-height:1.8}
.cta-box{background:#0a0a0f;color:#fff;border-radius:10px;padding:28px;text-align:center;margin-top:36px}
.cta-box p{color:#6b6b85;margin:8px 0 18px;font-size:14px}
.cta-btn{background:#f5a623;color:#0a0a0f;padding:12px 28px;border-radius:6px;font-weight:700;font-size:14px;text-decoration:none;display:inline-block}
.foot{text-align:center;padding:22px;font-size:11px;color:#aaa;border-top:1px solid #e0e0e8;margin-top:36px}
.tag{display:inline-block;padding:2px 7px;border-radius:3px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.07em}
.t-r{background:#fff0f0;color:#ff4757}.t-y{background:#fff8ec;color:#c47d0e}.t-b{background:#f0f6ff;color:#4a9eff}.t-g{background:#f0faf5;color:#00875a}
@media print{body{background:#fff}}
</style></head><body>
<div class="hdr">
  <div class="brand">Preset &amp; Profit · Business Automation Agency</div>
  <h1>${r.businessName} — Automation Audit Report</h1>
  <p class="sub">${r.website} · ${r.industry}${r.city?" · "+r.city:""} · ${new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</p>
</div>
<div class="body">
  <div class="scores">
    <div class="sc"><div class="sc-n" style="color:${sc(r.overallScore)}">${r.overallScore}</div><div class="sc-l">Audit Score</div></div>
    <div class="sc"><div class="sc-n" style="color:${sc(r.leadScore)}">${r.leadScore}</div><div class="sc-l">Lead Score</div></div>
    <div class="sc"><div class="sc-n" style="color:#00875a">${r.totalMonthlyOpportunity}</div><div class="sc-l">Monthly Opportunity</div></div>
    <div class="sc"><div class="sc-n">${r.estimatedRevenue}</div><div class="sc-l">Est. Revenue</div></div>
  </div>
  <div class="exec">${r.executiveSummary}</div>
  <div class="disc">⚠ ${r.disclaimer}</div>

  <h2>Weaknesses Detected (${(r.weaknesses||[]).length})</h2>
  ${(r.weaknesses||[]).map(w=>`<div class="w ${w.severity}"><span class="lost">${w.lostRevenue}</span><div class="w-meta"><span class="tag ${w.severity==="critical"?"t-r":w.severity==="high"?"t-y":"t-b"}">${w.severity}</span> &nbsp;${w.category} · confidence: ${w.confidence}</div><h3>${w.issue}</h3><div style="font-size:13px">${w.impact}</div><div class="evidence">🔍 Evidence: ${w.evidence}</div></div>`).join("")}

  <h2>Automation Recommendations (${(r.automations||[]).length})</h2>
  ${(r.automations||[]).map(a=>`<div class="auto"><span class="roi">${a.roi}/mo</span><div class="w-meta"><span class="tag t-b">#${a.priority}</span> &nbsp;${a.category} · ${a.effort} effort · confidence: ${a.confidence}</div><h3>${a.name}</h3><p style="font-size:13px;margin:5px 0">${a.description}</p><p style="font-size:13px;color:#555">Tool: <strong>${a.tool}</strong> &nbsp;·&nbsp; Saves ${a.timesSaved}</p><p class="profit">💡 ${a.profitAngle}</p><div class="preset">Preset &amp; Profit: ${a.presetService}</div></div>`).join("")}

  <h2>Recommended 30-Day Automation Plan</h2>
  ${r.thirtyDayPlan?[r.thirtyDayPlan.phase1,r.thirtyDayPlan.phase2,r.thirtyDayPlan.phase3].map((p,i)=>`<div class="phase"><h3>Phase ${i+1}: ${p.title}</h3><ul>${p.actions.map(a=>`<li>${a}</li>`).join("")}</ul></div>`).join(""):""}

  <div class="cta-box">
    <h2 style="border:none;color:#fff;margin-bottom:0">Ready to implement these automations?</h2>
    <p>Book a free 30-minute strategy call. We build the systems; you collect the revenue.</p>
    <a class="cta-btn" href="https://presetandprofit.com/call">📞 Book Automation Strategy Call</a>
  </div>
</div>
<div class="foot">Prepared by Preset &amp; Profit · presetandprofit.com · AI-generated projections for informational purposes. Results are not guaranteed.</div>
</body></html>`;
}

// ── Report View ───────────────────────────────────────────────────────────────
function ReportView({report:r,onBack}){
  const [tab,setTab]=useState("overview");
  const [sent,setSent]=useState(false);
  if(!r)return null;

  const exportReport=()=>{
    const blob=new Blob([buildHTML(r)],{type:"text/html"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download=`preset-profit-audit-${(r.businessName||"report").replace(/\s+/g,"-").toLowerCase()}.html`;
    a.click();URL.revokeObjectURL(a.href);
  };

  const sendToClient=()=>{
    // Production: POST /api/send-report → SendGrid/Resend sends branded HTML email to r.email
    alert(`Demo mode: In production this POSTs to /api/send-report and emails the branded HTML report to ${r.email||"the client"} via SendGrid or Resend.`);
    setSent(true);
  };

  const TABS=["overview","weaknesses","automations","30-day plan"];
  const phaseColors=["#00d68f","#f5a623","#4a9eff"];

  return(
    <div className="page-pad" style={{animation:"fadeUp .4s ease"}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:22}}>
        <div>
          <button onClick={onBack} style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:12,marginBottom:8,fontFamily:"IBM Plex Mono"}}>← Back to Dashboard</button>
          <h1 style={{fontFamily:"Syne",fontSize:22,fontWeight:800,letterSpacing:"-0.01em"}}>{r.businessName}</h1>
          <div style={{display:"flex",gap:10,marginTop:6,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{fontSize:12,color:"var(--muted)"}}>{r.website}</span>
            <Tag color="#6b6b85">{r.industry}</Tag>
            {r.city&&<Tag color="#3a3a50">{r.city}</Tag>}
            {r.goal&&<Tag color="var(--amber)">{r.goal}</Tag>}
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Btn onClick={exportReport} variant="ghost">↓ Export Report</Btn>
          <Btn onClick={sendToClient} variant={sent?"success":"primary"}>{sent?"✓ Sent to Client":"→ Send This Audit to Client"}</Btn>
        </div>
      </div>

      {/* Score cards */}
      <div className="stats-grid" style={{gridTemplateColumns:"repeat(4,1fr)"}}>
        <div style={{background:"var(--panel)",border:"1px solid var(--border)",borderRadius:8,padding:18,display:"flex",alignItems:"center",gap:14}}>
          <ScoreRing score={r.overallScore} size={54} stroke={5}/>
          <div><div style={{fontSize:10,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.1em"}}>Audit Score</div><div style={{fontSize:12,marginTop:3}}>Overall Health</div></div>
        </div>
        <div style={{background:"var(--panel)",border:"1px solid var(--border)",borderRadius:8,padding:18,display:"flex",alignItems:"center",gap:14}}>
          <ScoreRing score={r.leadScore} size={54} stroke={5}/>
          <div><div style={{fontSize:10,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.1em"}}>Lead Score</div><div style={{fontSize:12,marginTop:3}}>Opportunity Fit</div></div>
        </div>
        <div style={{background:"var(--panel)",border:"1px solid var(--border)",borderRadius:8,padding:18}}>
          <div style={{fontSize:10,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>Monthly Opportunity</div>
          <div style={{fontSize:22,fontFamily:"Syne",fontWeight:800,color:"var(--green)"}}>{r.totalMonthlyOpportunity}</div>
          <div style={{fontSize:11,color:"var(--muted)",marginTop:3}}>projected recoverable rev.</div>
        </div>
        <div style={{background:"var(--panel)",border:"1px solid var(--border)",borderRadius:8,padding:18}}>
          <div style={{fontSize:10,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>Est. Annual Revenue</div>
          <div style={{fontSize:16,fontFamily:"Syne",fontWeight:700}}>{r.estimatedRevenue}</div>
          <div style={{fontSize:11,color:"var(--muted)",marginTop:3}}>{r.employees} employees</div>
        </div>
      </div>

      {/* Exec summary */}
      <div style={{background:"var(--panel)",border:"1px solid rgba(245,166,35,0.25)",borderLeft:"3px solid var(--amber)",borderRadius:8,padding:"16px 20px",marginBottom:14}}>
        <div style={{fontSize:10,color:"var(--amber)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>Executive Summary</div>
        <p style={{fontSize:13,lineHeight:1.7}}>{r.executiveSummary}</p>
      </div>

      {/* Disclaimer */}
      <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:6,padding:"10px 16px",marginBottom:20,display:"flex",gap:10,alignItems:"flex-start"}}>
        <span style={{color:"var(--amber)",fontSize:13,flexShrink:0}}>⚠</span>
        <span style={{fontSize:11,color:"var(--muted)",lineHeight:1.6}}>{r.disclaimer}</span>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:2,marginBottom:18,background:"var(--panel)",border:"1px solid var(--border)",borderRadius:8,padding:4,width:"fit-content",flexWrap:"wrap"}}>
        {TABS.map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:"7px 14px",borderRadius:6,border:"none",cursor:"pointer",fontFamily:"IBM Plex Mono",fontSize:11,letterSpacing:"0.05em",textTransform:"uppercase",background:tab===t?"var(--amber)":"transparent",color:tab===t?"var(--ink)":"var(--muted)",fontWeight:tab===t?600:400,transition:"all .15s",whiteSpace:"nowrap"}}>{t}</button>
        ))}
      </div>

      {/* Overview */}
      {tab==="overview"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div style={{background:"var(--panel)",border:"1px solid var(--border)",borderRadius:8,padding:20}}>
            <div style={{fontSize:11,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>Detected / Likely Tech Stack</div>
            {(r.techStack||[]).map(t=>(
              <div key={t} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid var(--border)"}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:"var(--blue)",flexShrink:0}}/>
                <span style={{fontSize:13}}>{t}</span>
              </div>
            ))}
          </div>
          <div style={{background:"var(--panel)",border:"1px solid var(--border)",borderRadius:8,padding:20}}>
            <div style={{fontSize:11,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>Competitor Gap</div>
            <p style={{fontSize:13,lineHeight:1.7}}>{r.competitorGap}</p>
          </div>
          <div style={{gridColumn:"1/-1",background:"var(--panel)",border:"1px solid var(--border)",borderRadius:8,padding:20}}>
            <div style={{fontSize:11,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>Quick Wins</div>
            <div style={{display:"grid",gap:10}}>
              {(r.quickWins||[]).map((q,i)=>(
                <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                  <div style={{width:24,height:24,borderRadius:"50%",background:"var(--amber-glow)",border:"1px solid var(--amber)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"var(--amber)",flexShrink:0}}>{i+1}</div>
                  <span style={{fontSize:13,paddingTop:3}}>{q}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Weaknesses */}
      {tab==="weaknesses"&&(
        <div style={{display:"grid",gap:12}}>
          {(r.weaknesses||[]).map((w,i)=>(
            <div key={i} style={{background:"var(--panel)",border:`1px solid ${SEV_COLOR[w.severity]}30`,borderLeft:`3px solid ${SEV_COLOR[w.severity]}`,borderRadius:8,padding:"18px 20px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,flexWrap:"wrap"}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
                    <Tag color={SEV_COLOR[w.severity]}>{w.severity}</Tag>
                    <Tag color={CONF_COLOR[w.confidence]}>confidence: {w.confidence}</Tag>
                    <span style={{fontSize:11,color:"var(--muted)",alignSelf:"center"}}>{w.category}</span>
                  </div>
                  <div style={{fontSize:14,fontWeight:600,marginBottom:5}}>{w.issue}</div>
                  <div style={{fontSize:12,color:"var(--muted)",marginBottom:10}}>{w.impact}</div>
                  <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:5,padding:"8px 12px",fontSize:12,color:"var(--muted)",lineHeight:1.6}}>
                    <span style={{color:"var(--blue)"}}>🔍 Evidence: </span>{w.evidence}
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:10,color:"var(--muted)",marginBottom:3}}>LOST REVENUE</div>
                  <div style={{fontSize:20,fontFamily:"Syne",fontWeight:800,color:"var(--red)"}}>{w.lostRevenue}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Automations */}
      {tab==="automations"&&(
        <div style={{display:"grid",gap:12}}>
          {(r.automations||[]).map((a,i)=>(
            <div key={i} style={{background:"var(--panel)",border:"1px solid var(--border)",borderRadius:8,padding:"18px 20px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,flexWrap:"wrap"}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
                    <span style={{fontSize:11,color:"var(--muted)"}}>#{a.priority}</span>
                    <Tag color="#4a9eff">{a.category}</Tag>
                    <Tag color={EFFORT_COLOR[a.effort]}>{a.effort} effort</Tag>
                    <Tag color={CONF_COLOR[a.confidence]}>confidence: {a.confidence}</Tag>
                  </div>
                  <div style={{fontSize:15,fontWeight:700,fontFamily:"Syne",marginBottom:5}}>{a.name}</div>
                  <div style={{fontSize:12,color:"var(--muted)",marginBottom:8,lineHeight:1.6}}>{a.description}</div>
                  <div style={{fontSize:12,color:"var(--blue)",marginBottom:8}}>Tool: {a.tool} &nbsp;·&nbsp; Saves {a.timesSaved}</div>
                  <div style={{fontSize:12,color:"var(--green)",marginBottom:10}}>💡 {a.profitAngle}</div>
                  <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"var(--amber-glow)",border:"1px solid rgba(245,166,35,0.3)",borderRadius:4,padding:"4px 10px",fontSize:11,color:"var(--amber)"}}>
                    Preset &amp; Profit: {a.presetService}
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:10,color:"var(--muted)",marginBottom:3}}>MONTHLY ROI</div>
                  <div style={{fontSize:22,fontFamily:"Syne",fontWeight:800,color:"var(--green)"}}>{a.roi}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 30-day plan */}
      {tab==="30-day plan"&&r.thirtyDayPlan&&(
        <div style={{display:"grid",gap:14}}>
          {[r.thirtyDayPlan.phase1,r.thirtyDayPlan.phase2,r.thirtyDayPlan.phase3].map((phase,idx)=>(
            <div key={idx} style={{background:"var(--panel)",border:`1px solid ${phaseColors[idx]}30`,borderLeft:`3px solid ${phaseColors[idx]}`,borderRadius:8,padding:"20px 24px"}}>
              <div style={{fontSize:13,fontWeight:700,color:phaseColors[idx],fontFamily:"Syne",marginBottom:14}}>Phase {idx+1}: {phase.title}</div>
              <div style={{display:"grid",gap:10}}>
                {phase.actions.map((action,ai)=>(
                  <div key={ai} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                    <div style={{width:20,height:20,borderRadius:"50%",background:`${phaseColors[idx]}20`,border:`1px solid ${phaseColors[idx]}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:phaseColors[idx],flexShrink:0,marginTop:2}}>{ai+1}</div>
                    <span style={{fontSize:13,lineHeight:1.6}}>{action}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div style={{background:"var(--panel)",border:"1px solid rgba(245,166,35,0.4)",borderRadius:10,padding:"28px 24px",textAlign:"center",marginTop:4}}>
            <div style={{fontFamily:"Syne",fontSize:18,fontWeight:800,marginBottom:8}}>Ready to execute this plan?</div>
            <p style={{color:"var(--muted)",fontSize:13,lineHeight:1.7,marginBottom:20,maxWidth:480,margin:"0 auto 20px"}}>
              We implement these automations done-for-you, typically within 7 days. No tech skills needed.
            </p>
            <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
              <a href="https://presetandprofit.com/call" target="_blank" rel="noopener noreferrer"
                style={{background:"var(--amber)",color:"var(--ink)",padding:"12px 24px",borderRadius:6,fontFamily:"IBM Plex Mono",fontSize:12,fontWeight:700,letterSpacing:"0.04em",textDecoration:"none",display:"inline-block"}}>
                📞 Book Automation Strategy Call
              </a>
              <Btn onClick={sendToClient} variant="ghost">{sent?"✓ Audit Sent":"✉ Send This Audit to Client"}</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Services View ─────────────────────────────────────────────────────────────
function ServicesView(){
  return(
    <div className="page-pad" style={{animation:"fadeUp .4s ease"}}>
      <div style={{textAlign:"center",marginBottom:40}}>
        <div style={{fontSize:11,color:"var(--amber)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>Preset &amp; Profit</div>
        <h1 style={{fontFamily:"Syne",fontSize:28,fontWeight:800,letterSpacing:"-0.02em"}}>Automation Services &amp; Packages</h1>
        <p style={{color:"var(--muted)",marginTop:8,fontSize:14,maxWidth:500,margin:"8px auto 0"}}>Done-for-you business automation. We build the systems; you collect the revenue.</p>
      </div>

      <div className="pricing-grid">
        {SERVICE_PACKAGES.map(pkg=>(
          <div key={pkg.name} style={{background:"var(--panel)",border:`1px solid ${pkg.highlight?pkg.color:"var(--border)"}`,borderRadius:12,padding:"28px 24px",position:"relative",boxShadow:pkg.highlight?`0 0 40px ${pkg.color}20`:"none"}}>
            {pkg.highlight&&(
              <div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",background:pkg.color,color:"var(--ink)",padding:"4px 14px",borderRadius:20,fontSize:10,fontWeight:700,letterSpacing:"0.1em",whiteSpace:"nowrap"}}>{pkg.tag}</div>
            )}
            <div style={{fontSize:10,color:pkg.color,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6,fontWeight:600}}>{pkg.tag}</div>
            <div style={{fontFamily:"Syne",fontSize:22,fontWeight:800,marginBottom:4}}>{pkg.name}</div>
            <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:16}}>
              <span style={{fontFamily:"Syne",fontSize:38,fontWeight:800,color:pkg.color}}>{pkg.price}</span>
              <span style={{color:"var(--muted)",fontSize:13}}>{pkg.priceNote}</span>
            </div>
            <div style={{borderTop:"1px solid var(--border)",margin:"0 0 16px"}}/>
            <div style={{display:"grid",gap:10,marginBottom:24}}>
              {pkg.deliverables.map(d=>(
                <div key={d} style={{display:"flex",gap:8,alignItems:"flex-start",fontSize:13}}>
                  <span style={{color:pkg.color,flexShrink:0,marginTop:1}}>✓</span><span>{d}</span>
                </div>
              ))}
            </div>
            <button style={{width:"100%",padding:11,borderRadius:6,cursor:"pointer",fontFamily:"IBM Plex Mono",fontSize:12,fontWeight:600,letterSpacing:"0.05em",transition:"all .2s",border:`1px solid ${pkg.color}`,background:pkg.highlight?pkg.color:"transparent",color:pkg.highlight?"var(--ink)":pkg.color}}>{pkg.cta}</button>
          </div>
        ))}
      </div>

      <div style={{maxWidth:980,margin:"28px auto 0",background:"var(--panel)",border:"1px solid var(--border)",borderRadius:10,padding:"20px 28px",display:"flex",gap:20,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{fontSize:28}}>🛡</div>
        <div>
          <div style={{fontFamily:"Syne",fontWeight:700,fontSize:15,marginBottom:4}}>Results-First Guarantee</div>
          <div style={{fontSize:13,color:"var(--muted)",lineHeight:1.6}}>Every setup includes a 30-day check-in. If the automation isn't working, we fix it at no charge. We don't consider a project done until you see results.</div>
        </div>
      </div>
      <div style={{textAlign:"center",marginTop:24,color:"var(--muted)",fontSize:12}}>
        Questions? Email <span style={{color:"var(--amber)"}}>hello@presetandprofit.com</span> · All projects start with a free strategy call
      </div>
    </div>
  );
}

// ── App Shell ─────────────────────────────────────────────────────────────────
const NAV=[
  {id:"dashboard",label:"Dashboard",icon:"◈"},
  {id:"scan",label:"New Audit",icon:"⊕"},
  {id:"services",label:"Services",icon:"◇"},
];

export default function App(){
  const [view,setView]=useState("dashboard");
  const [report,setReport]=useState(null);
  const [open,setOpen]=useState(false);

  const go=v=>{setView(v);setOpen(false);};

  const openReport=lead=>{
    const r={
      ...buildMockReport({bizName:lead.name,url:lead.url,industry:lead.industry,city:lead.city,goal:lead.goal,tools:"",email:""}),
      overallScore:lead.score,
      leadScore:Math.min(99,lead.score+7),
    };
    setReport(r);setView("report");
  };

  return(
    <div className="main-layout">
      <GlobalStyles/>

      {/* Mobile top bar */}
      <div className="mobile-bar" style={{position:"fixed",top:0,left:0,right:0,height:52,background:"var(--panel)",borderBottom:"1px solid var(--border)",zIndex:30,alignItems:"center",justifyContent:"space-between",padding:"0 16px"}}>
        <div style={{fontFamily:"Syne",fontWeight:800,fontSize:16}}><span style={{color:"var(--amber)"}}>PRESET</span><span style={{color:"var(--text)"}}>&amp;PROFIT</span></div>
        <button onClick={()=>setOpen(o=>!o)} style={{background:"none",border:"1px solid var(--border)",borderRadius:6,color:"var(--text)",padding:"6px 10px",cursor:"pointer",fontSize:16}}>☰</button>
      </div>

      {open&&<div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:19}}/>}

      {/* Sidebar */}
      <div className={`sidebar${open?" open":""}`}>
        <div style={{padding:"24px 20px",borderBottom:"1px solid var(--border)"}}>
          <div style={{fontFamily:"Syne",fontWeight:800,fontSize:16,letterSpacing:"-0.02em"}}><span style={{color:"var(--amber)"}}>PRESET</span><span style={{color:"var(--text)"}}>&amp;PROFIT</span></div>
          <div style={{fontSize:10,color:"var(--muted)",marginTop:2,letterSpacing:"0.08em"}}>AUDIT INTELLIGENCE</div>
        </div>
        <nav style={{padding:"12px 10px",flex:1}}>
          {NAV.map(item=>(
            <button key={item.id} onClick={()=>{go(item.id);if(item.id!=="report")setReport(null);}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:6,border:"none",cursor:"pointer",background:view===item.id?"var(--amber-glow)":"transparent",color:view===item.id?"var(--amber)":"var(--muted)",fontFamily:"IBM Plex Mono",fontSize:12,fontWeight:view===item.id?600:400,marginBottom:2,textAlign:"left",letterSpacing:"0.02em",borderLeft:view===item.id?"2px solid var(--amber)":"2px solid transparent",transition:"all .15s"}}>
              <span style={{fontSize:14}}>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div style={{padding:"16px 20px",borderTop:"1px solid var(--border)"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"var(--green)",animation:"pulse-amber 2s infinite"}}/>
            <span style={{fontSize:10,color:"var(--green)",letterSpacing:"0.08em"}}>AI ONLINE</span>
          </div>
          <div style={{fontSize:10,color:"var(--muted)",marginBottom:6}}>Agency · 107 / 250 audits</div>
          <div style={{height:3,background:"var(--surface)",borderRadius:2}}>
            <div style={{height:"100%",width:"43%",background:"var(--amber)",borderRadius:2}}/>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="main-content">
        <style>{`@media(max-width:640px){.main-content{padding-top:52px!important}}`}</style>
        {view==="dashboard"&&<Dashboard onScan={()=>go("scan")} onViewReport={openReport}/>}
        {view==="scan"&&<AuditScanner onComplete={r=>{setReport(r);setView("report");}}/>}
        {view==="report"&&report&&<ReportView report={report} onBack={()=>go("dashboard")}/>}
        {view==="services"&&<ServicesView/>}
      </div>
    </div>
  );
}