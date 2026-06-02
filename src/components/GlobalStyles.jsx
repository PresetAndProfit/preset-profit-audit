export default function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600&family=Sora:wght@300;400;500;600;700;800&family=IBM+Plex+Mono:wght@300;400;500;600&display=swap');
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
      :root{
        --ink:#08080a;--panel:#111118;--surface:#16161f;
        --border:#242430;--border-bright:#3a3a50;
        /* Brand accent = champagne gold (matches presetprofit.com). --amber is the
           interactive/brand accent token; semantic score colors are set literally. */
        --amber:#C4A882;--amber-dim:#a98a5f;--amber-glow:rgba(196,168,130,0.14);--gold:#C4A882;
        --serif:'Cormorant Garamond',Georgia,serif;--sans:'Sora',system-ui,sans-serif;
        --green:#00d68f;--red:#ff4757;--blue:#4a9eff;--warn:#E0A04E;
        --text:#e8e8f0;--muted:#6b6b85;--dim:#3a3a50;
      }
      body{background:var(--ink);color:var(--text);font-family:'IBM Plex Mono',monospace}
      ::-webkit-scrollbar{width:4px}
      ::-webkit-scrollbar-track{background:var(--ink)}
      ::-webkit-scrollbar-thumb{background:var(--dim);border-radius:2px}
      @keyframes pulse-amber{0%,100%{box-shadow:0 0 0 0 rgba(196,168,130,0.4)}50%{box-shadow:0 0 0 8px rgba(196,168,130,0)}}
      @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
      .fade-up{animation:fadeUp .4s ease forwards}
      .main-layout{display:flex;min-height:100vh;background:var(--ink)}
      .sidebar{width:220px;flex-shrink:0;background:var(--panel);border-right:1px solid var(--border);display:flex;flex-direction:column;position:fixed;height:100vh;z-index:20;transition:transform .25s ease}
      .main-content{margin-left:220px;flex:1;min-height:100vh;overflow-y:auto}
      .mobile-bar{display:none}
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
      }

      /* ── Assumptions slider ─────────────────────────────────────────────── */
      .assumptions-slider{
        -webkit-appearance:none;appearance:none;
        width:100%;height:4px;border-radius:2px;outline:none;cursor:pointer;
        transition:background .08s;
      }
      .assumptions-slider::-webkit-slider-thumb{
        -webkit-appearance:none;appearance:none;
        width:22px;height:22px;border-radius:50%;
        background:var(--amber);cursor:pointer;
        border:3px solid var(--ink);
        box-shadow:0 0 0 2px var(--amber),0 2px 8px rgba(196,168,130,0.5);
        transition:box-shadow .15s,transform .1s;
      }
      .assumptions-slider::-webkit-slider-thumb:hover{
        box-shadow:0 0 0 4px rgba(196,168,130,0.25),0 2px 12px rgba(196,168,130,0.6);
        transform:scale(1.15);
      }
      .assumptions-slider::-moz-range-thumb{
        width:22px;height:22px;border-radius:50%;
        background:var(--amber);cursor:pointer;
        border:3px solid var(--ink);
        box-shadow:0 0 0 2px var(--amber);
      }
      .assumptions-slider:focus{outline:none}
      .assumptions-slider:focus::-webkit-slider-thumb{
        box-shadow:0 0 0 5px rgba(196,168,130,0.3),0 2px 12px rgba(196,168,130,0.5);
      }
    `}</style>
  );
}
