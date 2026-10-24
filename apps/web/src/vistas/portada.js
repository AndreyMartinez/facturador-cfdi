import { html } from '../html.js';
import { useEstado } from '../estado.js';
import { Ambiente } from '../componentes/comunes.js';

export function Portada() {
  const { modoPac } = useEstado();
  return html`<div class="land">
    <nav class="land-nav">
      <a class="brandmark" href="#/"><i>F</i>Facturalow</a>
      <a class="lnk" href="#como">Cómo funciona</a><a class="lnk" href="#costos">Costos</a>
      <span class="sp"></span><${Ambiente} modo=${modoPac} /><a class="btn pri sm" href="#/panel">Abrir la demo</a>
    </nav>
    <section class="hero">
      <div>
        <span class="pill-top">CFDI 4.0 · Timbrado directo con PAC</span>
        <h1>Factura tus ventas pagando <em>solo el timbre.</em></h1>
        <p class="lead">Revisa y timbra en segundos. El XML se arma y se sella en tu navegador: tu CSD nunca sale de tu equipo.</p>
        <div class="ctas">
          <a class="btn pri" href="#/revisar/ejemplo/referencia-198">Generar una factura de prueba →</a>
          <a class="btn" href="#/nueva">Capturar una venta</a>
        </div>
        <div class="trust"><span>$0 al mes</span><span>CSD solo en tu equipo</span><span>Cuadra al centavo</span></div>
        <p class="muted" style="font-size:12.5px;margin-top:18px">Demo con el CSD de prueba del SAT. Las facturas no tienen validez fiscal.</p>
      </div>
      <div class="demo-card" aria-label="Lo que pasa al facturar">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><strong>Venta de ejemplo</strong><span class="badge sb">Sandbox</span></div>
        <div class="timeline">
          <div class="tl"><b>1</b><div>Venta leída<small>Organizador de cubiertos · $198.00</small></div></div>
          <div class="tl"><b>2</b><div>Borrador cuadrado al centavo<small>Unitario 170.689655 · IVA 27.31</small></div></div>
          <div class="tl"><b>3</b><div>XML sellado en tu navegador<small>RSA-SHA256 con el CSD</small></div></div>
          <div class="tl"><b>4</b><div>Timbrado por el PAC<small>UUID del SAT</small></div></div>
          <div class="tl"><b>5</b><div>PDF con QR del SAT<small>Listo para descargar</small></div></div>
        </div>
      </div>
    </section>
    <section class="price" id="costos">
      <div class="card"><div class="card-b"><small class="muted">Infraestructura</small><strong>$0 / mes</strong><span class="muted">Sitio estático y relevo en capa gratuita.</span></div></div>
      <div class="card"><div class="card-b"><small class="muted">Por factura</small><strong>Solo el timbre</strong><span class="muted">Directo al PAC, sin sobreprecio.</span></div></div>
      <div class="card"><div class="card-b"><small class="muted">Tus sellos</small><strong>Nunca se suben</strong><span class="muted">El CSD se usa solo en tu navegador.</span></div></div>
    </section>
    <section class="como" id="como">
      <h2>Cómo funciona</h2>
      <div class="g3">
        <div><strong>En tu navegador</strong><p class="muted">Borrador, importes, XML CFDI 4.0, cadena original, sello y PDF. Tus facturas se guardan en este equipo.</p></div>
        <div><strong>Relevo mínimo</strong><p class="muted">Solo pasa el XML ya sellado al PAC. No guarda tu factura ni ve tu CSD.</p></div>
        <div><strong>PAC autorizado</strong><p class="muted">Valida, agrega el timbre fiscal (UUID) y lo reporta al SAT.</p></div>
      </div>
    </section>
    <footer class="pie">Facturalow · prueba de concepto · ${modoPac === 'simulado' ? 'timbrado simulado' : 'sandbox del PAC'}</footer>
  </div>`;
}
