const _suites = [];
function suite(nombre, fn){ _suites.push({nombre, fn}); }
let _actual = null;
function assert(nombre, cond){ _actual.push({nombre, pass: !!cond}); }
function assertEq(nombre, a, b){ assert(`${nombre} → ${JSON.stringify(a)} == ${JSON.stringify(b)}`, a===b); }
function assertAprox(nombre, a, b, tol){ assert(`${nombre} → |${a}-${b}| <= ${tol}`, Math.abs(a-b)<=tol); }
function correrPruebas(){
  const enNavegador = (typeof document !== "undefined");
  let totalPass=0, total=0;
  _suites.forEach(s=>{
    _actual=[]; try{ s.fn(); }catch(e){ _actual.push({nombre:"EXCEPCIÓN: "+e.message, pass:false}); }
    const pasa=_actual.filter(r=>r.pass).length;
    total+=_actual.length; totalPass+=pasa;
    if(enNavegador){
      const div=document.createElement("div"); div.className="suite";
      div.innerHTML=`<h3>${pasa===_actual.length?"✅":"❌"} ${s.nombre} (${pasa}/${_actual.length})</h3>`;
      _actual.forEach(r=>{ const p=document.createElement("p");
        p.textContent=(r.pass?"✅ ":"❌ ")+r.nombre; p.style.color=r.pass?"#3fb950":"#f85149";
        div.appendChild(p); });
      document.getElementById("resultados").appendChild(div);
    } else {
      console.log(`${pasa===_actual.length?"OK   ":"FALLA"} ${s.nombre} (${pasa}/${_actual.length})`);
      _actual.forEach(r=>{ if(!r.pass) console.log("        x "+r.nombre); });
    }
  });
  const resumen=`TOTAL: ${totalPass}/${total}`;
  if(enNavegador) document.getElementById("resumen").textContent=resumen;
  else console.log(resumen);
  return { totalPass, total };
}
