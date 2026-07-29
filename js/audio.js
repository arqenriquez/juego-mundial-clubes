// Efectos temporales generados con Web Audio: no requieren archivos ni descargas.
let _audioUI=null;
function sonidoUI(tipo="clic"){
  try{
    const AudioCtx=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtx) return;
    if(!_audioUI) _audioUI=new AudioCtx();
    const ctx=_audioUI;
    if(ctx.state==="suspended") ctx.resume();
    const cfg={clic:{onda:"triangle",inicio:430,fin:350,duracion:.055,volumen:.035},
      navegar:{onda:"sine",inicio:330,fin:470,duracion:.085,volumen:.04},
      confirmar:{onda:"triangle",inicio:480,fin:730,duracion:.12,volumen:.05},
      alerta:{onda:"sawtooth",inicio:190,fin:145,duracion:.11,volumen:.035}}[tipo] || null;
    if(!cfg) return;
    const ahora=ctx.currentTime, oscilador=ctx.createOscillator(), ganancia=ctx.createGain();
    oscilador.type=cfg.onda; oscilador.frequency.setValueAtTime(cfg.inicio,ahora);
    oscilador.frequency.exponentialRampToValueAtTime(cfg.fin,ahora+cfg.duracion);
    ganancia.gain.setValueAtTime(.0001,ahora);
    ganancia.gain.exponentialRampToValueAtTime(cfg.volumen,ahora+.008);
    ganancia.gain.exponentialRampToValueAtTime(.0001,ahora+cfg.duracion);
    oscilador.connect(ganancia).connect(ctx.destination); oscilador.start(ahora); oscilador.stop(ahora+cfg.duracion+.02);
  }catch(_){ /* El juego sigue funcionando si el dispositivo no admite sonido. */ }
}

document.addEventListener("click",evento=>{
  const control=evento.target.closest("button");
  if(!control || control.disabled) return;
  const texto=(control.textContent||"").trim().toLowerCase();
  const tipo=/fichar|aceptar|jugar mi partido|confirmar|simular/.test(texto) ? "confirmar" :
    /volver|ver grupos|ver bracket|plantilla|gestión|fichajes|ventas|continuar/.test(texto) ? "navegar" : "clic";
  sonidoUI(tipo);
},true);
