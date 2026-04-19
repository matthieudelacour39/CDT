import { useState, useEffect, useCallback } from "react";

const CLASSES_DEFAULT = ["6ème A", "6ème B", "5ème A", "5ème B", "4ème A", "3ème A"];
const INCIDENTS_TYPES = [
  { key: "travail", label: "Travail non fait", icon: "📚", color: "#ef4444", bg: "#fef2f2" },
  { key: "affaires", label: "Affaires oubliées", icon: "🎒", color: "#f59e0b", bg: "#fffbeb" },
  { key: "lecon", label: "Leçon non apprise", icon: "📖", color: "#8b5cf6", bg: "#f5f3ff" },
];
const JOURS_FULL = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

function todayStr() { return new Date().toISOString().split("T")[0]; }
function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  const day = JOURS_FULL[d.getDay() === 0 ? 6 : d.getDay() - 1];
  return `${day} ${d.getDate().toString().padStart(2,"0")}/${(d.getMonth()+1).toString().padStart(2,"0")}/${d.getFullYear()}`;
}

// ── Helpers localStorage ──────────────────────────────────────
function lsGet(key) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch(e) { return null; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) {}
}

export default function CahierDeTexte() {
  const [classes, setClasses] = useState(CLASSES_DEFAULT);
  const [eleves, setEleves] = useState({});
  const [entries, setEntries] = useState({});
  const [selectedClass, setSelectedClass] = useState(null);
  const [view, setView] = useState("home");
  const [currentEntry, setCurrentEntry] = useState(null);
  const [form, setForm] = useState({ date: todayStr(), titre: "", contenu: "" });
  const [incidentForm, setIncidentForm] = useState({});
  const [search, setSearch] = useState("");
  const [recapFilter, setRecapFilter] = useState({ from: "", to: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [newClassName, setNewClassName] = useState("");
  const [newEleveName, setNewEleveName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [activeTab, setActiveTab] = useState("seance");
  const [settingsClass, setSettingsClass] = useState(null);

  // ── Chargement initial ──────────────────────────────────────
  useEffect(() => {
    const c = lsGet("cahier-classes");
    if (c) setClasses(c);
    const en = lsGet("cahier-entries");
    if (en) setEntries(en);
    const el = lsGet("cahier-eleves");
    if (el) setEleves(el);
    setLoading(false);
  }, []);

  const saveAll = useCallback((c, en, el) => {
    setSaving(true);
    lsSet("cahier-classes", c);
    lsSet("cahier-entries", en);
    lsSet("cahier-eleves", el);
    setTimeout(() => setSaving(false), 500);
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const getClassEntries = (cls) => [...(entries[cls] || [])].sort((a,b) => b.date.localeCompare(a.date));
  const getClassEleves = (cls) => [...(eleves[cls] || [])].sort((a,b) => a.localeCompare(b));

  // ── Séances ─────────────────────────────────────────────────
  const openNewEntry = () => {
    setCurrentEntry(null);
    const initInc = {};
    getClassEleves(selectedClass).forEach(e => { initInc[e] = { travail: false, affaires: false, lecon: false }; });
    setIncidentForm(initInc);
    const lastEntry = getClassEntries(selectedClass)[0];
    setForm({ date: todayStr(), titre: lastEntry?.titre || "", contenu: "" });
    setActiveTab("seance");
    setView("newEntry");
  };

  const openEditEntry = (entry) => {
    setCurrentEntry(entry);
    const initInc = {};
    getClassEleves(selectedClass).forEach(e => {
      initInc[e] = entry.incidents?.[e] || { travail: false, affaires: false, lecon: false };
    });
    setIncidentForm(initInc);
    setForm({ date: entry.date, titre: entry.titre, contenu: entry.contenu || "" });
    setActiveTab("seance");
    setView("editEntry");
  };

  const handleSaveEntry = () => {
    if (!form.titre.trim() || !form.date) { showToast("Titre et date requis", "error"); return; }
    const list = [...(entries[selectedClass] || [])];
    const newEntry = { ...form, incidents: incidentForm };
    if (currentEntry) {
      const idx = list.findIndex(e => e.id === currentEntry.id);
      if (idx >= 0) list[idx] = { ...list[idx], ...newEntry };
    } else {
      list.push({ id: Date.now().toString(), ...newEntry });
    }
    const newEntries = { ...entries, [selectedClass]: list };
    setEntries(newEntries);
    saveAll(classes, newEntries, eleves);
    showToast(currentEntry ? "Séance modifiée" : "Séance ajoutée");
    setView("class");
  };

  const handleDeleteEntry = (cls, id) => {
    const list = (entries[cls] || []).filter(e => e.id !== id);
    const newEntries = { ...entries, [cls]: list };
    setEntries(newEntries);
    saveAll(classes, newEntries, eleves);
    setConfirmDelete(null);
    showToast("Séance supprimée");
  };

  // ── Classes ─────────────────────────────────────────────────
  const handleAddClass = () => {
    const name = newClassName.trim();
    if (!name || classes.includes(name)) { showToast("Nom invalide ou déjà existant", "error"); return; }
    const newClasses = [...classes, name];
    setClasses(newClasses);
    saveAll(newClasses, entries, eleves);
    setNewClassName("");
    showToast("Classe ajoutée");
  };

  const handleDeleteClass = (cls) => {
    const newClasses = classes.filter(c => c !== cls);
    const newEntries = { ...entries }; delete newEntries[cls];
    const newEleves = { ...eleves }; delete newEleves[cls];
    setClasses(newClasses); setEntries(newEntries); setEleves(newEleves);
    saveAll(newClasses, newEntries, newEleves);
    setConfirmDelete(null);
    showToast("Classe supprimée");
  };

  // ── Élèves ──────────────────────────────────────────────────
  const handleAddEleve = () => {
    const name = newEleveName.trim();
    const cls = settingsClass || selectedClass;
    const list = eleves[cls] || [];
    if (!name || list.includes(name)) { showToast("Nom invalide ou déjà existant", "error"); return; }
    const newEl = { ...eleves, [cls]: [...list, name] };
    setEleves(newEl);
    saveAll(classes, entries, newEl);
    setNewEleveName("");
    showToast("Élève ajouté(e)");
  };

  const handleDeleteEleve = (cls, name) => {
    const newEl = { ...eleves, [cls]: (eleves[cls] || []).filter(e => e !== name) };
    setEleves(newEl);
    saveAll(classes, entries, newEl);
    setConfirmDelete(null);
    showToast("Élève supprimé(e)");
  };

  // ── Exports ─────────────────────────────────────────────────
  const exportCSV = () => {
    if (!selectedClass) return;
    const rows = [["Date","Titre","Contenu","Élève","Travail non fait","Affaires oubliées","Leçon non apprise"]];
    getClassEntries(selectedClass).forEach(entry => {
      const els = getClassEleves(selectedClass);
      if (els.length === 0) {
        rows.push([formatDate(entry.date), entry.titre, entry.contenu||"","","","",""]);
      } else {
        els.forEach(el => {
          const inc = entry.incidents?.[el] || {};
          rows.push([formatDate(entry.date), entry.titre, entry.contenu||"", el, inc.travail?"Oui":"", inc.affaires?"Oui":"", inc.lecon?"Oui":""]);
        });
      }
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF"+csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `cahier_${selectedClass.replace(/\s/g,"_")}.csv`;
    a.click(); URL.revokeObjectURL(url);
    showToast("Export CSV téléchargé");
  };

  const exportPDF = () => {
    if (!selectedClass) return;
    let html = `<html><head><meta charset="utf-8"><style>
      body{font-family:Georgia,serif;margin:32px;color:#1e293b}
      h1{font-size:22px;margin-bottom:4px}
      .sub{font-size:12px;color:#64748b;margin-bottom:24px}
      .entry{border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin-bottom:14px;page-break-inside:avoid}
      .date{font-size:11px;color:#2563eb;font-weight:700;margin-bottom:6px}
      .titre{font-size:16px;font-weight:700;margin-bottom:8px}
      .contenu{font-size:13px;color:#475569;margin-bottom:10px;white-space:pre-wrap}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
      th{background:#f1f5f9;padding:5px 8px;text-align:left;border:1px solid #e2e8f0}
      td{padding:5px 8px;border:1px solid #e2e8f0}
      .oui{color:#ef4444;font-weight:700}
    </style></head><body>
    <h1>Cahier de texte — ${selectedClass}</h1>
    <p class="sub">Exporté le ${formatDate(todayStr())}</p>`;
    getClassEntries(selectedClass).forEach(entry => {
      const els = getClassEleves(selectedClass);
      const hasInc = els.some(el => { const i = entry.incidents?.[el]||{}; return i.travail||i.affaires||i.lecon; });
      html += `<div class="entry"><div class="date">${formatDate(entry.date)}</div>
        <div class="titre">${entry.titre}</div>
        ${entry.contenu ? `<div class="contenu">${entry.contenu}</div>` : ""}`;
      if (els.length > 0 && hasInc) {
        html += `<table><tr><th>Élève</th><th>Travail non fait</th><th>Affaires oubliées</th><th>Leçon non apprise</th></tr>`;
        els.forEach(el => {
          const inc = entry.incidents?.[el] || {};
          if (inc.travail || inc.affaires || inc.lecon) {
            html += `<tr><td>${el}</td>
              <td class="${inc.travail?"oui":""}">${inc.travail?"✗":""}</td>
              <td class="${inc.affaires?"oui":""}">${inc.affaires?"✗":""}</td>
              <td class="${inc.lecon?"oui":""}">${inc.lecon?"✗":""}</td></tr>`;
          }
        });
        html += `</table>`;
      }
      html += `</div>`;
    });
    html += `</body></html>`;
    const win = window.open("","_blank");
    win.document.write(html); win.document.close(); win.print();
  };

  const getRecapData = () => {
    if (!selectedClass) return [];
    const { from, to } = recapFilter;
    const filtered = getClassEntries(selectedClass).filter(e => {
      if (from && e.date < from) return false;
      if (to && e.date > to) return false;
      return true;
    });
    return getClassEleves(selectedClass).map(el => {
      let travail=0, affaires=0, lecon=0;
      filtered.forEach(entry => {
        const inc = entry.incidents?.[el] || {};
        if (inc.travail) travail++;
        if (inc.affaires) affaires++;
        if (inc.lecon) lecon++;
      });
      return { nom: el, travail, affaires, lecon, total: travail+affaires+lecon };
    }).sort((a,b) => b.total - a.total);
  };

  const exportRecapCSV = () => {
    const data = getRecapData();
    const rows = [["Élève","Travail non fait","Affaires oubliées","Leçon non apprise","Total"],
      ...data.map(d => [d.nom, d.travail, d.affaires, d.lecon, d.total])];
    const csv = rows.map(r => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF"+csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `recap_${selectedClass.replace(/\s/g,"_")}.csv`;
    a.click(); URL.revokeObjectURL(url);
    showToast("Récap CSV téléchargé");
  };

  const filteredEntries = selectedClass
    ? getClassEntries(selectedClass).filter(e =>
        !search || e.titre?.toLowerCase().includes(search.toLowerCase()) ||
        e.contenu?.toLowerCase().includes(search.toLowerCase()))
    : [];

  const totalEntries = Object.values(entries).reduce((s,a) => s+(a?.length||0), 0);

  if (loading) return (
    <div style={{height:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,background:"#f0f4f8"}}>
      <div style={{width:16,height:16,borderRadius:"50%",background:"#2563eb",animation:"pulse 1s infinite"}} />
      <span style={{color:"#64748b",fontSize:14,fontFamily:"sans-serif"}}>Chargement…</span>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#f0f4f8",fontFamily:"'Lora','Georgia',serif",color:"#1e293b"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0} body{margin:0}
        .hcard:hover{box-shadow:0 6px 20px rgba(37,99,235,0.12)!important;border-color:#93c5fd!important;transform:translateY(-2px)}
        .ecard:hover{box-shadow:0 4px 16px rgba(0,0,0,0.1)!important}
        .erow:hover{background:#f8fafc!important}
        input:focus,textarea:focus{border-color:#2563eb!important;background:#fff!important;box-shadow:0 0 0 3px rgba(37,99,235,0.1)}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
      `}</style>

      {/* TOAST */}
      {toast && <div style={{position:"fixed",top:16,right:16,zIndex:9999,color:"#fff",padding:"10px 18px",borderRadius:10,fontSize:14,fontFamily:"sans-serif",fontWeight:600,boxShadow:"0 4px 16px rgba(0,0,0,0.2)",background:toast.type==="error"?"#dc2626":"#16a34a"}}>
        {toast.type==="error"?"⚠ ":"✓ "}{toast.msg}
      </div>}

      {/* CONFIRM DELETE */}
      {confirmDelete && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:16,padding:"32px 28px",maxWidth:360,width:"100%",textAlign:"center",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
            <div style={{fontSize:36,marginBottom:12}}>{confirmDelete.type==="class"?"🏫":confirmDelete.type==="eleve"?"👤":"🗑"}</div>
            <p style={{fontSize:18,fontWeight:700,marginBottom:8}}>
              {confirmDelete.type==="class"?"Supprimer la classe ?":confirmDelete.type==="eleve"?"Supprimer l'élève ?":"Supprimer la séance ?"}
            </p>
            <p style={{fontSize:14,color:"#64748b",marginBottom:24,fontFamily:"sans-serif",lineHeight:1.5}}>"{confirmDelete.target}" sera supprimé(e) définitivement.</p>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button style={btn.sec} onClick={()=>setConfirmDelete(null)}>Annuler</button>
              <button style={btn.danger} onClick={()=>{
                if(confirmDelete.type==="class") handleDeleteClass(confirmDelete.cls);
                else if(confirmDelete.type==="eleve") handleDeleteEleve(confirmDelete.cls, confirmDelete.target);
                else handleDeleteEntry(confirmDelete.cls, confirmDelete.id);
              }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header style={{background:"#1e3a5f",color:"#fff",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 12px rgba(0,0,0,0.15)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px"}}>
          <button style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:10,color:"#fff"}}
            onClick={()=>{setView("home");setSelectedClass(null);setSearch("");}}>
            <span style={{fontSize:22}}>📒</span>
            <span style={{fontSize:18,fontWeight:700}}>Cahier de texte</span>
          </button>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {saving && <span style={{fontSize:11,color:"#93c5fd",fontFamily:"sans-serif"}}>Enregistrement…</span>}
            <button style={{background:view==="settings"?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.15)",border:"none",cursor:"pointer",color:"#fff",fontSize:18,padding:"6px 10px",borderRadius:8}}
              onClick={()=>setView(view==="settings"?(selectedClass?"class":"home"):"settings")}>⚙</button>
          </div>
        </div>
        {(view==="class"||view==="recapEleves") && selectedClass && (
          <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 20px",background:"#162d4a",fontSize:13,fontFamily:"sans-serif"}}>
            <button style={{background:"none",border:"none",color:"#93c5fd",cursor:"pointer",fontSize:13,padding:0}}
              onClick={()=>{setView("home");setSelectedClass(null);}}>Accueil</button>
            <span style={{color:"#475569"}}>›</span>
            {view==="recapEleves"
              ? <><button style={{background:"none",border:"none",color:"#93c5fd",cursor:"pointer",fontSize:13,padding:0}} onClick={()=>setView("class")}>{selectedClass}</button><span style={{color:"#475569"}}>›</span><span style={{color:"#e2e8f0"}}>Récapitulatif</span></>
              : <span style={{color:"#e2e8f0"}}>{selectedClass}</span>}
          </div>
        )}
        {(view==="newEntry"||view==="editEntry") && (
          <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 20px",background:"#162d4a",fontSize:13,fontFamily:"sans-serif"}}>
            <button style={{background:"none",border:"none",color:"#93c5fd",cursor:"pointer",fontSize:13,padding:0}} onClick={()=>{setView("home");setSelectedClass(null);}}>Accueil</button>
            <span style={{color:"#475569"}}>›</span>
            <button style={{background:"none",border:"none",color:"#93c5fd",cursor:"pointer",fontSize:13,padding:0}} onClick={()=>setView("class")}>{selectedClass}</button>
            <span style={{color:"#475569"}}>›</span>
            <span style={{color:"#e2e8f0"}}>{view==="editEntry"?"Modifier":"Nouvelle séance"}</span>
          </div>
        )}
      </header>

      <main style={{maxWidth:760,margin:"0 auto",padding:"0 16px 60px"}}>

        {/* HOME */}
        {view==="home" && (
          <div style={{paddingTop:28}}>
            <h1 style={{fontSize:26,fontWeight:700,marginBottom:4}}>Mes classes</h1>
            <p style={{fontSize:14,color:"#64748b",fontFamily:"sans-serif",marginBottom:24}}>{classes.length} classe{classes.length>1?"s":""} · {totalEntries} séance{totalEntries!==1?"s":""}</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:14}}>
              {classes.map(cls => {
                const cl = entries[cls]||[];
                const last = [...cl].sort((a,b)=>b.date.localeCompare(a.date))[0];
                const nb = (eleves[cls]||[]).length;
                return (
                  <button key={cls} className="hcard" style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:14,padding:"18px 16px",cursor:"pointer",textAlign:"left",position:"relative",overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",transition:"all 0.18s"}}
                    onClick={()=>{setSelectedClass(cls);setSearch("");setView("class");}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                      <span style={{fontSize:16,fontWeight:700}}>{cls}</span>
                      <span style={{background:"#dbeafe",color:"#1d4ed8",fontSize:12,fontWeight:700,padding:"2px 8px",borderRadius:20,fontFamily:"sans-serif"}}>{cl.length}</span>
                    </div>
                    <p style={{fontSize:12,color:"#64748b",fontFamily:"sans-serif",marginBottom:4}}>{nb} élève{nb>1?"s":""}</p>
                    <p style={{fontSize:12,color:"#94a3b8",fontFamily:"sans-serif",marginBottom:10}}>{last?`Dernière : ${formatDate(last.date)}`:"Aucune séance"}</p>
                    <span style={{color:"#2563eb",fontSize:16,position:"absolute",bottom:14,right:16}}>→</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* LISTE SÉANCES */}
        {view==="class" && selectedClass && (
          <div style={{paddingTop:28}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18,flexWrap:"wrap",gap:12}}>
              <div>
                <h2 style={{fontSize:24,fontWeight:700,marginBottom:2}}>{selectedClass}</h2>
                <p style={{fontSize:13,color:"#64748b",fontFamily:"sans-serif"}}>{getClassEntries(selectedClass).length} séance{getClassEntries(selectedClass).length!==1?"s":""} · {getClassEleves(selectedClass).length} élève{getClassEleves(selectedClass).length!==1?"s":""}</p>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <button style={btn.outline} onClick={()=>setView("recapEleves")}>📊 Récap</button>
                <button style={btn.outline} onClick={exportCSV}>⬇ CSV</button>
                <button style={btn.outline} onClick={exportPDF}>🖨 PDF</button>
                <button style={btn.prim} onClick={openNewEntry}>+ Séance</button>
              </div>
            </div>

            <div style={{display:"flex",alignItems:"center",gap:8,background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,padding:"8px 12px",marginBottom:18}}>
              <span>🔍</span>
              <input style={{flex:1,border:"none",outline:"none",fontSize:14,fontFamily:"sans-serif",background:"transparent"}} placeholder="Rechercher…" value={search} onChange={e=>setSearch(e.target.value)} />
              {search && <button style={{background:"none",border:"none",cursor:"pointer",color:"#94a3b8"}} onClick={()=>setSearch("")}>✕</button>}
            </div>

            {filteredEntries.length===0 ? (
              <div style={{textAlign:"center",padding:"50px 20px"}}>
                <div style={{fontSize:48,marginBottom:12}}>📝</div>
                <p style={{color:"#94a3b8",fontSize:15,marginBottom:20,fontFamily:"sans-serif"}}>{search?"Aucun résultat":"Aucune séance enregistrée"}</p>
                {!search && <button style={btn.prim} onClick={openNewEntry}>Ajouter la première séance</button>}
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                {filteredEntries.map(entry => {
                  const els = getClassEleves(selectedClass);
                  const incCount = els.reduce((s,el)=>{const i=entry.incidents?.[el]||{};return s+(i.travail?1:0)+(i.affaires?1:0)+(i.lecon?1:0);},0);
                  return (
                    <div key={entry.id} className="ecard" style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:14,padding:"16px 18px",boxShadow:"0 1px 4px rgba(0,0,0,0.05)",transition:"box-shadow 0.15s"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                        <span style={{fontSize:12,color:"#2563eb",fontWeight:700,fontFamily:"sans-serif",background:"#eff6ff",padding:"3px 10px",borderRadius:20}}>{formatDate(entry.date)}</span>
                        <div style={{display:"flex",gap:6,alignItems:"center"}}>
                          {incCount>0 && <span style={{fontSize:11,background:"#fef3c7",color:"#92400e",fontWeight:700,padding:"2px 8px",borderRadius:20,fontFamily:"sans-serif"}}>{incCount} incident{incCount>1?"s":""}</span>}
                          <button style={btn.icoSm} onClick={()=>openEditEntry(entry)}>✏</button>
                          <button style={btn.icoDanger} onClick={()=>setConfirmDelete({type:"entry",cls:selectedClass,id:entry.id,target:entry.titre})}>🗑</button>
                        </div>
                      </div>
                      <h3 style={{fontSize:17,fontWeight:700,marginBottom:6}}>{entry.titre}</h3>
                      {entry.contenu && <p style={{fontSize:14,color:"#475569",lineHeight:1.6,fontFamily:"sans-serif",marginBottom:10,whiteSpace:"pre-wrap"}}>{entry.contenu}</p>}
                      {incCount>0 && (
                        <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:8}}>
                          {INCIDENTS_TYPES.map(t => {
                            const concerned = els.filter(el=>entry.incidents?.[el]?.[t.key]);
                            if(!concerned.length) return null;
                            return (
                              <div key={t.key} style={{border:`1px solid ${t.color}44`,background:t.bg,borderRadius:8,padding:"6px 10px"}}>
                                <span style={{color:t.color,fontWeight:700,fontSize:12,fontFamily:"sans-serif"}}>{t.icon} {t.label} : </span>
                                <span style={{fontSize:12,color:"#475569",fontFamily:"sans-serif"}}>{concerned.join(", ")}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* NOUVELLE / MODIFIER SÉANCE */}
        {(view==="newEntry"||view==="editEntry") && (
          <div style={{paddingTop:28}}>
            <h2 style={{fontSize:22,fontWeight:700,marginBottom:16}}>{view==="editEntry"?"Modifier la séance":"Nouvelle séance"}</h2>
            <div style={{display:"flex",gap:4,marginBottom:16,background:"#e2e8f0",borderRadius:10,padding:4,width:"fit-content"}}>
              {[["seance","📋 Séance"],["eleves","👥 Suivi élèves"]].map(([k,l])=>(
                <button key={k} style={{background:activeTab===k?"#fff":"transparent",border:"none",borderRadius:8,padding:"8px 18px",fontSize:14,fontWeight:activeTab===k?700:400,cursor:"pointer",fontFamily:"sans-serif",color:activeTab===k?"#1e293b":"#64748b",boxShadow:activeTab===k?"0 1px 4px rgba(0,0,0,0.1)":"none"}}
                  onClick={()=>setActiveTab(k)}>{l}</button>
              ))}
            </div>

            <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:16,padding:"22px 20px",boxShadow:"0 1px 8px rgba(0,0,0,0.06)"}}>
              {activeTab==="seance" && (
                <>
                  <div style={{marginBottom:16}}>
                    <label style={{display:"block",fontSize:13,fontWeight:600,color:"#475569",marginBottom:6,fontFamily:"sans-serif"}}>Date *</label>
                    <input type="date" style={inp} value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} />
                  </div>
                  <div style={{marginBottom:16}}>
                    <label style={{display:"block",fontSize:13,fontWeight:600,color:"#475569",marginBottom:6,fontFamily:"sans-serif"}}>Titre / Activité *</label>
                    <input style={inp} placeholder="Ex : Introduction à la photosynthèse" value={form.titre} onChange={e=>setForm(f=>({...f,titre:e.target.value}))} />
                  </div>
                  <div style={{marginBottom:16}}>
                    <label style={{display:"block",fontSize:13,fontWeight:600,color:"#475569",marginBottom:6,fontFamily:"sans-serif"}}>Contenu de la séance</label>
                    <textarea style={{...inp,resize:"vertical",lineHeight:1.6}} rows={5} placeholder="Notions abordées, déroulé du cours…" value={form.contenu} onChange={e=>setForm(f=>({...f,contenu:e.target.value}))} />
                  </div>
                </>
              )}

              {activeTab==="eleves" && (
                getClassEleves(selectedClass).length===0 ? (
                  <div style={{textAlign:"center",padding:"30px 20px"}}>
                    <p style={{color:"#94a3b8",fontSize:14,fontFamily:"sans-serif",lineHeight:1.6,marginBottom:16}}>Aucun élève dans cette classe.<br/>Ajoutez des élèves dans les Paramètres ⚙</p>
                    <button style={btn.prim} onClick={()=>setView("settings")}>Aller aux paramètres</button>
                  </div>
                ) : (
                  <div>
                    <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:14,padding:"8px 12px",background:"#f8fafc",borderRadius:8}}>
                      {INCIDENTS_TYPES.map(t=>(
                        <span key={t.key} style={{fontSize:12,fontWeight:600,color:t.color,fontFamily:"sans-serif"}}>{t.icon} {t.label}</span>
                      ))}
                    </div>
                    <div style={{border:"1px solid #e2e8f0",borderRadius:10,overflow:"hidden"}}>
                      <div style={{display:"flex",alignItems:"center",padding:"10px 14px",background:"#f1f5f9",fontSize:13,fontFamily:"sans-serif",color:"#475569",fontWeight:700}}>
                        <span style={{flex:2}}>Élève</span>
                        {INCIDENTS_TYPES.map(t=>(
                          <span key={t.key} style={{flex:1,textAlign:"center",fontSize:18}} title={t.label}>{t.icon}</span>
                        ))}
                      </div>
                      {getClassEleves(selectedClass).map(el => {
                        const inc = incidentForm[el]||{travail:false,affaires:false,lecon:false};
                        const hasAny = inc.travail||inc.affaires||inc.lecon;
                        return (
                          <div key={el} className="erow" style={{display:"flex",alignItems:"center",padding:"10px 14px",borderTop:"1px solid #f1f5f9",background:hasAny?"#fef9ec":"#fff",transition:"background 0.1s",fontFamily:"sans-serif"}}>
                            <span style={{flex:2,fontSize:14,fontWeight:hasAny?600:400}}>{el}</span>
                            {INCIDENTS_TYPES.map(t=>(
                              <div key={t.key} style={{flex:1,display:"flex",justifyContent:"center"}}>
                                <button style={{width:30,height:30,borderRadius:8,border:"none",cursor:"pointer",fontSize:14,fontWeight:700,background:inc[t.key]?t.color:"#f1f5f9",color:inc[t.key]?"#fff":"#cbd5e1",transition:"all 0.15s"}}
                                  onClick={()=>setIncidentForm(f=>({...f,[el]:{...f[el],[t.key]:!f[el]?.[t.key]}}))}>
                                  {inc[t.key]?"✗":"○"}
                                </button>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              )}

              <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:20,flexWrap:"wrap"}}>
                <button style={btn.sec} onClick={()=>setView("class")}>Annuler</button>
                <button style={btn.prim} onClick={handleSaveEntry}>{view==="editEntry"?"Enregistrer":"Ajouter la séance"}</button>
              </div>
            </div>
          </div>
        )}

        {/* RÉCAP ÉLÈVES */}
        {view==="recapEleves" && selectedClass && (
          <div style={{paddingTop:28}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18,flexWrap:"wrap",gap:12}}>
              <div>
                <h2 style={{fontSize:22,fontWeight:700,marginBottom:2}}>Récapitulatif — {selectedClass}</h2>
                <p style={{fontSize:13,color:"#64748b",fontFamily:"sans-serif"}}>Incidents par élève</p>
              </div>
              <button style={btn.outline} onClick={exportRecapCSV}>⬇ CSV</button>
            </div>

            <div style={{display:"flex",gap:12,alignItems:"flex-end",marginBottom:18,flexWrap:"wrap",background:"#fff",border:"1px solid #e2e8f0",borderRadius:12,padding:"14px 16px"}}>
              {[["from","Du"],["to","Au"]].map(([k,l])=>(
                <div key={k} style={{display:"flex",flexDirection:"column",gap:4}}>
                  <label style={{fontSize:12,color:"#64748b",fontWeight:600,fontFamily:"sans-serif"}}>{l}</label>
                  <input type="date" style={{border:"1.5px solid #e2e8f0",borderRadius:8,padding:"8px 10px",fontSize:13,fontFamily:"sans-serif",background:"#f8fafc",outline:"none",color:"#1e293b"}}
                    value={recapFilter[k]} onChange={e=>setRecapFilter(f=>({...f,[k]:e.target.value}))} />
                </div>
              ))}
              {(recapFilter.from||recapFilter.to) && (
                <button style={{background:"#fef2f2",color:"#dc2626",border:"none",borderRadius:8,padding:"8px 12px",fontSize:12,cursor:"pointer",fontFamily:"sans-serif",fontWeight:600}}
                  onClick={()=>setRecapFilter({from:"",to:""})}>✕ Effacer</button>
              )}
            </div>

            {getClassEleves(selectedClass).length===0 ? (
              <div style={{textAlign:"center",padding:"40px 20px"}}>
                <p style={{color:"#94a3b8",fontSize:14,fontFamily:"sans-serif",lineHeight:1.6}}>Aucun élève dans cette classe.</p>
              </div>
            ) : (
              <div style={{border:"1px solid #e2e8f0",borderRadius:12,overflow:"hidden"}}>
                <div style={{display:"flex",alignItems:"center",padding:"12px 16px",background:"#1e3a5f",color:"#fff",fontSize:13,fontFamily:"sans-serif",fontWeight:700}}>
                  <span style={{flex:2}}>Élève</span>
                  {INCIDENTS_TYPES.map(t=>(
                    <span key={t.key} style={{flex:1,textAlign:"center"}}>{t.icon}<br/><span style={{fontSize:10}}>{t.label.split(" ")[0]}</span></span>
                  ))}
                  <span style={{flex:1,textAlign:"center"}}>Total</span>
                </div>
                {getRecapData().map(d=>(
                  <div key={d.nom} className="erow" style={{display:"flex",alignItems:"center",padding:"11px 16px",borderTop:"1px solid #f1f5f9",fontFamily:"sans-serif",background:d.total>3?"#fff1f2":d.total>0?"#fffbeb":"#fff",transition:"background 0.1s"}}>
                    <span style={{flex:2,fontSize:14,fontWeight:d.total>0?700:400}}>{d.nom}</span>
                    {INCIDENTS_TYPES.map(t=>(
                      <span key={t.key} style={{flex:1,textAlign:"center",color:d[t.key]>0?t.color:"#cbd5e1",fontWeight:d[t.key]>0?700:400}}>
                        {d[t.key]>0?d[t.key]:"—"}
                      </span>
                    ))}
                    <span style={{flex:1,textAlign:"center",fontWeight:700,color:d.total>3?"#dc2626":d.total>0?"#d97706":"#94a3b8"}}>
                      {d.total>0?d.total:"—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PARAMÈTRES */}
        {view==="settings" && (
          <div style={{paddingTop:28}}>
            <h2 style={{fontSize:22,fontWeight:700,marginBottom:20}}>⚙ Paramètres</h2>

            <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:16,padding:"22px 20px",marginBottom:20,boxShadow:"0 1px 8px rgba(0,0,0,0.06)"}}>
              <h3 style={{fontSize:16,fontWeight:700,marginBottom:14}}>Gérer mes classes</h3>
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
                {classes.map(cls=>(
                  <div key={cls} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"#f8fafc",borderRadius:8,border:"1px solid #e2e8f0"}}>
                    <span style={{flex:1,fontSize:14,fontWeight:600}}>{cls}</span>
                    <span style={{fontSize:12,color:"#94a3b8",fontFamily:"sans-serif"}}>{(entries[cls]||[]).length} séance{(entries[cls]||[]).length!==1?"s":""} · {(eleves[cls]||[]).length} élève{(eleves[cls]||[]).length!==1?"s":""}</span>
                    <button style={btn.icoDanger} onClick={()=>setConfirmDelete({type:"class",cls,target:cls})}>🗑</button>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",gap:8}}>
                <input style={{...inp,flex:1}} placeholder="Ex : 2nde B" value={newClassName} onChange={e=>setNewClassName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleAddClass()} />
                <button style={btn.prim} onClick={handleAddClass}>Ajouter</button>
              </div>
            </div>

            <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:16,padding:"22px 20px",boxShadow:"0 1px 8px rgba(0,0,0,0.06)"}}>
              <h3 style={{fontSize:16,fontWeight:700,marginBottom:6}}>Gérer les élèves</h3>
              <p style={{fontSize:13,color:"#94a3b8",fontFamily:"sans-serif",marginBottom:14}}>Sélectionnez une classe pour gérer ses élèves</p>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18}}>
                {classes.map(cls=>(
                  <button key={cls} style={{background:settingsClass===cls?"#1e3a5f":"#f1f5f9",color:settingsClass===cls?"#fff":"#475569",border:"1px solid",borderColor:settingsClass===cls?"#1e3a5f":"#e2e8f0",borderRadius:20,padding:"6px 14px",fontSize:13,cursor:"pointer",fontFamily:"sans-serif",fontWeight:settingsClass===cls?700:400}}
                    onClick={()=>setSettingsClass(settingsClass===cls?null:cls)}>{cls}</button>
                ))}
              </div>
              {settingsClass && (
                <>
                  <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
                    {getClassEleves(settingsClass).length===0 && <p style={{color:"#94a3b8",fontSize:13,fontFamily:"sans-serif",padding:"8px 0"}}>Aucun élève pour l'instant.</p>}
                    {getClassEleves(settingsClass).map(el=>(
                      <div key={el} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:"#f8fafc",borderRadius:8,border:"1px solid #e2e8f0"}}>
                        <span style={{flex:1,fontSize:14}}>👤 {el}</span>
                        <button style={btn.icoDanger} onClick={()=>setConfirmDelete({type:"eleve",cls:settingsClass,target:el})}>🗑</button>
                      </div>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <input style={{...inp,flex:1}} placeholder="Prénom Nom" value={newEleveName} onChange={e=>setNewEleveName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleAddEleve()} />
                    <button style={btn.prim} onClick={handleAddEleve}>Ajouter</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

const inp = {
  width:"100%", border:"1.5px solid #e2e8f0", borderRadius:8, padding:"10px 12px",
  fontSize:14, fontFamily:"sans-serif", background:"#f8fafc",
  boxSizing:"border-box", outline:"none", color:"#1e293b"
};

const btn = {
  prim:    {background:"#2563eb",color:"#fff",border:"none",borderRadius:9,padding:"10px 18px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif"},
  sec:     {background:"#f1f5f9",color:"#475569",border:"1px solid #e2e8f0",borderRadius:9,padding:"10px 18px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif"},
  danger:  {background:"#ef4444",color:"#fff",border:"none",borderRadius:9,padding:"10px 18px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif"},
  outline: {background:"#fff",color:"#475569",border:"1px solid #e2e8f0",borderRadius:9,padding:"8px 14px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"sans-serif"},
  icoSm:   {background:"#f1f5f9",border:"none",cursor:"pointer",fontSize:14,padding:"5px 8px",borderRadius:7,color:"#475569"},
  icoDanger:{background:"#fef2f2",border:"none",cursor:"pointer",fontSize:14,padding:"5px 8px",borderRadius:7,color:"#ef4444"},
};
