/*
  Datos de la presentación para el dueño (index.html de esta carpeta).
  - whatsapp: el número al que le llega la respuesta cuando el dueño toca "Me gusta esta".
    Vacío, WhatsApp le pide al dueño escoger a quién mandarlo.
  - opciones: el orden en que se muestran los diseños.
*/
window.PROPUESTA = {
  whatsapp: "",
  opciones: [
    { id: "rock", nombre: "Rock" },
    { id: "cartel", nombre: "Cartel" },
    { id: "terraza", nombre: "Terraza" },
    { id: "pizarra", nombre: "Pizarra" },
    { id: "comanda", nombre: "Comanda" }
  ],
  enlaceWhatsApp(texto) {
    const n = String(this.whatsapp || '').replace(/\D/g, '');
    return (n.length === 10 ? 'https://wa.me/57' + n : 'https://wa.me/') + '?text=' + encodeURIComponent(texto);
  },
  mensaje(i) {
    return 'Hola, me gusta la opción ' + (i + 1) + ' (' + this.opciones[i].nombre + ') para la carta digital.';
  }
};
