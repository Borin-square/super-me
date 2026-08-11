(() => {
  const $ = (s) => document.querySelector(s);

  function openPhotoChoice() {
    const sheet = $("#sheet");
    const backdrop = $("#sheetBackdrop");
    if (!sheet || !backdrop) return;

    sheet.innerHTML = `
      <div class="handle"></div>
      <div class="sheet-head">
        <h2>Aggiungi una foto 📸</h2>
        <p class="muted">Puoi scattare il piatto adesso oppure scegliere una foto che hai già.</p>
      </div>
      <div class="action-list">
        <button class="action" id="takePhotoNow">
          <span class="ico">📷</span>
          <span><b>Scatta una foto</b><small>Apri direttamente la fotocamera</small></span>
        </button>
        <button class="action" id="chooseFromGallery">
          <span class="ico">🖼️</span>
          <span><b>Carica dalla galleria</b><small>Scegli una foto già presente sul telefono</small></span>
        </button>
      </div>`;

    backdrop.classList.remove("hidden");
    sheet.classList.remove("hidden");

    $("#takePhotoNow")?.addEventListener("click", () => {
      $("#photoInput")?.click();
    });

    $("#chooseFromGallery")?.addEventListener("click", () => {
      $("#galleryInput")?.click();
    });
  }

  // Intercetta il quick action "Foto" e la voce foto nel menu + prima degli handler originali.
  document.addEventListener("click", (event) => {
    const target = event.target.closest?.('[data-quick="photo"], #pa');
    if (!target) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openPhotoChoice();
  }, true);

  // Riusa esattamente il flusso AI già esistente: passa il file scelto dalla galleria
  // al photoInput, che è già ascoltato da app.js.
  $("#galleryInput")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const photoInput = $("#photoInput");
    if (!photoInput) return;

    try {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      photoInput.files = transfer.files;
      photoInput.dispatchEvent(new Event("change", { bubbles: true }));
    } catch (error) {
      console.error("Gallery handoff failed", error);
      alert("Non riesco ad aprire questa foto. Prova a scattarne una nuova.");
    }
  });
})();
