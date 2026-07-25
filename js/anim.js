// Utilidades de animación. No conocen nada del dominio del juego.

function animacionReducida(){
  return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

// Relanza una animación CSS ya aplicada al elemento.
// El reflow forzado es imprescindible: sin él el navegador no reinicia la animación.
function reiniciarAnimacion(el, clase){
  if(!el) return;
  el.classList.remove(clase);
  void el.offsetWidth;
  el.classList.add(clase);
}

// Cubre la pantalla, ejecuta `accion` por debajo y se retira revelando el resultado
function conCortina(texto, accion, ms){
  const c = document.getElementById("cortina");
  if(!c || animacionReducida()){ accion(); return; }
  const t = c.querySelector("#cortina-txt");
  if(t) t.textContent = texto;
  c.classList.add("visible");
  setTimeout(()=>{
    try{ accion(); } finally { c.classList.remove("visible"); }
  }, ms || 900);
}

// Cuenta de 0 hasta n dentro del elemento, con un latido en cada incremento
function contarHasta(el, n, msTotal){
  if(!el) return;
  if(n <= 0 || animacionReducida()){ el.textContent = String(n); return; }
  const paso = Math.max(90, (msTotal || 600) / n);
  let i = 0;
  el.textContent = "0";
  const t = setInterval(()=>{
    el.textContent = String(++i);
    reiniciarAnimacion(el, "pulso");
    if(i >= n) clearInterval(t);
  }, paso);
}
