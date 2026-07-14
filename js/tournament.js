function _barajar(arr, rng){
  const a=arr.slice();
  for(let i=a.length-1;i>0;i--){ const k=Math.floor(rng()*(i+1)); [a[i],a[k]]=[a[k],a[i]]; }
  return a;
}

const _LETRAS=["A","B","C","D","E","F","G","H"];

function sortearGrupos(equipos, rng){
  // 4 potes por nivel para repartir fuerza; cada grupo recibe 1 de cada pote
  const orden=equipos.slice().sort((a,b)=>b.nivel-a.nivel);
  const potes=[orden.slice(0,8),orden.slice(8,16),orden.slice(16,24),orden.slice(24,32)]
    .map(p=>_barajar(p,rng));
  const grupos=_LETRAS.map(l=>({id:l, equiposIds:[]}));
  potes.forEach(pote=>{ pote.forEach((eq,i)=>grupos[i].equiposIds.push(eq.id)); });
  return grupos;
}

function fixturesDeGrupo(grupo){
  const [a,b,c,d]=grupo.equiposIds;
  const pares=[[a,b],[c,d],[a,c],[b,d],[a,d],[b,c]]; // round robin 4 equipos
  return pares.map((par,i)=>crearPartido({
    id:`g${grupo.id}-m${i}`, ronda:"grupo", grupo:grupo.id,
    localId:par[0], visitanteId:par[1] }));
}

function calcularTabla(grupo, partidos){
  const filas={};
  grupo.equiposIds.forEach(id=>filas[id]={equipoId:id,pj:0,g:0,e:0,p:0,gf:0,gc:0,dg:0,pts:0});
  partidos.filter(p=>p.jugado && p.grupo===grupo.id).forEach(p=>{
    const L=filas[p.localId], V=filas[p.visitanteId];
    L.pj++; V.pj++; L.gf+=p.golesLocal; L.gc+=p.golesVisitante;
    V.gf+=p.golesVisitante; V.gc+=p.golesLocal;
    if(p.golesLocal>p.golesVisitante){ L.g++;L.pts+=3;V.p++; }
    else if(p.golesLocal<p.golesVisitante){ V.g++;V.pts+=3;L.p++; }
    else { L.e++;V.e++;L.pts++;V.pts++; }
  });
  Object.values(filas).forEach(f=>f.dg=f.gf-f.gc);
  return Object.values(filas).sort((x,y)=> y.pts-x.pts || y.dg-x.dg || y.gf-x.gf);
}

function clasificadosDeGrupo(grupo, partidos){
  const t=calcularTabla(grupo,partidos);
  return [t[0].equipoId, t[1].equipoId];
}

function nombreRonda(n){
  return n>=16?"Octavos": n>=8?"Cuartos": n>=4?"Semifinal": "Final";
}

// clasificados16: array de {grupo, primero, segundo}
function construirBracket(clasificados16){
  // Emparejar 1ºA-2ºB, 1ºC-2ºD, ... (patrón estándar)
  const g={}; clasificados16.forEach(c=>g[c.grupo]=c);
  const cruces=[["A","B"],["C","D"],["E","F"],["G","H"]];
  const llaves=[];
  cruces.forEach(([x,y])=>{
    llaves.push({localId:g[x].primero, visitanteId:g[y].segundo, ganadorId:null});
    llaves.push({localId:g[y].primero, visitanteId:g[x].segundo, ganadorId:null});
  });
  return { nombre:nombreRonda(16), llaves, siguiente:null };
}
