import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./marketing.css";

// ─────────────────────────────────────────────────────────────────────────────
// MarketingLayout — premium serif/gold public shell. Wraps every public
// marketing page in <div class="ppm"> so its styles stay fully isolated from the
// application's mono/amber design system. Nav + footer link into the app
// (/audit funnel, /login). Page body content is injected as static HTML
// (see MarketingPage) and made interactive + SPA-aware by useMarketingFx().
// ─────────────────────────────────────────────────────────────────────────────

const NAV = [
  { to: "/methodology", label: "Methodology" },
  { to: "/sample-report", label: "Sample Report" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
];

export default function MarketingLayout({ children, active }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ppm">
      <nav className="nav solid">
        <Link to="/" className="brand">Preset <b>&amp;</b> Profit</Link>
        <button className="nav-toggle" aria-label="Menu" onClick={() => setOpen(v => !v)}>☰</button>
        <div className={"nav-links" + (open ? " open" : "")} onClick={() => setOpen(false)}>
          {NAV.map(n => (
            <Link key={n.to} to={n.to} className={active === n.to ? "active" : ""}>{n.label}</Link>
          ))}
          <Link to="/login" className="nav-login">Log in</Link>
          <Link to="/audit" className="nav-cta">Run My Audit</Link>
        </div>
      </nav>

      {children}

      <footer>
        <div className="wrap">
          <div className="foot-top">
            <div className="foot-col">
              <Link to="/" className="brand">Preset <b>&amp;</b> Profit</Link>
              <p>Independent business intelligence audits for founders, consultants, agencies, and operators.</p>
            </div>
            <div className="foot-col">
              <h5>Product</h5>
              <Link to="/methodology">Methodology</Link>
              <Link to="/sample-report">Sample Report</Link>
              <Link to="/pricing">Pricing</Link>
              <Link to="/audit">Run an Audit</Link>
            </div>
            <div className="foot-col">
              <h5>Company</h5>
              <Link to="/about">About</Link>
              <Link to="/faq">FAQ</Link>
              <Link to="/contact">Contact</Link>
              <Link to="/login">Log in</Link>
            </div>
            <div className="foot-col">
              <h5>Legal</h5>
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/terms">Terms of Service</Link>
              <Link to="/refund">Refund Policy</Link>
            </div>
          </div>
          <div className="foot-bottom">
            <div className="foot-legal">© 2026 Preset &amp; Profit. All rights reserved.</div>
            <div className="links">
              <Link to="/privacy">Privacy</Link>
              <Link to="/terms">Terms</Link>
              <Link to="/contact">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Renders a static HTML fragment (imported with ?raw) and wires up interactions.
export function MarketingPage({ html, active }) {
  const ref = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useMarketingFx(ref, navigate);
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  return (
    <MarketingLayout active={active}>
      <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />
    </MarketingLayout>
  );
}

// All client-side behavior for the static fragments: scroll-reveal, hero canvas,
// FAQ accordion, and intercepting internal links so they navigate via the SPA
// router instead of triggering a full page reload.
function useMarketingFx(ref, navigate) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const cleanups = [];

    // Reveal
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -50px 0px" });
    root.querySelectorAll(".reveal").forEach(el => io.observe(el));
    cleanups.push(() => io.disconnect());

    // FAQ accordion
    root.querySelectorAll(".faq-q").forEach((btn) => {
      const handler = () => {
        const openNow = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!openNow));
        const a = btn.nextElementSibling;
        if (a) a.style.maxHeight = openNow ? "0px" : a.scrollHeight + "px";
      };
      btn.addEventListener("click", handler);
      cleanups.push(() => btn.removeEventListener("click", handler));
    });

    // Internal links → SPA navigation
    const onClick = (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      const href = a.getAttribute("href") || "";
      if (a.target === "_blank" || a.hasAttribute("data-native")) return;
      if (href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/api")) {
        e.preventDefault();
        navigate(href);
      }
    };
    root.addEventListener("click", onClick);
    cleanups.push(() => root.removeEventListener("click", onClick));

    // Hero particle canvas (only on pages that include it)
    const canvas = root.querySelector("#ppm-hero");
    if (canvas && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      cleanups.push(startHeroCanvas(canvas));
    }

    return () => cleanups.forEach(fn => fn());
  }, [ref, navigate]);
}

function startHeroCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  let w, h, dpr, nodes = [], raf;
  const COUNT = window.innerWidth < 700 ? 36 : 64;
  const MAXD = 130;
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const seed = () => {
    nodes = [];
    for (let i = 0; i < COUNT; i++) nodes.push({ x: Math.random()*w, y: Math.random()*h, vx:(Math.random()-.5)*.25, vy:(Math.random()-.5)*.25 });
  };
  const tick = () => {
    ctx.clearRect(0, 0, w, h);
    for (const n of nodes) { n.x+=n.vx; n.y+=n.vy; if (n.x<0||n.x>w) n.vx*=-1; if (n.y<0||n.y>h) n.vy*=-1; }
    for (let i=0;i<nodes.length;i++) for (let j=i+1;j<nodes.length;j++){
      const a=nodes[i], b=nodes[j], d=Math.hypot(a.x-b.x, a.y-b.y);
      if (d<MAXD){ ctx.strokeStyle="rgba(196,168,130,"+(1-d/MAXD)*.22+")"; ctx.lineWidth=.6; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); }
    }
    for (const n of nodes){ ctx.fillStyle="rgba(180,180,190,.5)"; ctx.beginPath(); ctx.arc(n.x,n.y,1.1,0,Math.PI*2); ctx.fill(); }
    raf = requestAnimationFrame(tick);
  };
  resize(); seed(); tick();
  const onResize = () => { resize(); seed(); };
  window.addEventListener("resize", onResize);
  return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
}
