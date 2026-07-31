// Gate de licenca: bloqueia o uso do app ate a chave ser validada no servidor.
// Configure SUPABASE_URL e SUPABASE_ANON_KEY apos criar o projeto Supabase.
(function () {
  const SUPABASE_URL = "https://SEU-PROJETO.supabase.co";
  const SUPABASE_ANON_KEY = "SUA-ANON-KEY";
  const VALIDATE_ENDPOINT = `${SUPABASE_URL}/functions/v1/validate-license`;
  const STORAGE_KEY = "opto_license_key";
  const RECHECK_INTERVAL_MS = 1000 * 60 * 60 * 24; // 24h
  const LAST_CHECK_KEY = "opto_license_last_check";

  async function getHardwareId() {
    if (window.__TAURI__?.core?.invoke) {
      try {
        return await window.__TAURI__.core.invoke("get_hardware_id");
      } catch (_) {
        // segue para o fallback de navegador
      }
    }
    // Fallback (navegador sem Tauri): id persistente fraco, apenas para testes locais.
    let id = localStorage.getItem("opto_fallback_hw_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("opto_fallback_hw_id", id);
    }
    return id;
  }

  async function validateLicense(licenseKey) {
    const hardwareId = await getHardwareId();
    const res = await fetch(VALIDATE_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ license_key: licenseKey, hardware_id: hardwareId }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data.valid, error: data.error };
  }

  function showGate(message) {
    const overlay = document.createElement("div");
    overlay.id = "licenseGate";
    overlay.style.cssText =
      "position:fixed;inset:0;background:#0b0d10;color:#fff;display:flex;align-items:center;justify-content:center;z-index:99999;font-family:system-ui,sans-serif;";
    overlay.innerHTML = `
      <div style="max-width:360px;width:100%;padding:24px;">
        <h2 style="margin:0 0 12px;font-size:18px;">Ativação necessária</h2>
        <p id="licenseMsg" style="margin:0 0 16px;font-size:13px;opacity:.8;">${message ?? "Informe a chave de licença para usar o sistema."}</p>
        <input id="licenseInput" placeholder="XXXX-XXXX-XXXX-XXXX" style="width:100%;padding:10px;margin-bottom:10px;box-sizing:border-box;" />
        <button id="licenseSubmit" style="width:100%;padding:10px;cursor:pointer;">Ativar</button>
      </div>`;
    document.body.appendChild(overlay);

    document.getElementById("licenseSubmit").addEventListener("click", async () => {
      const input = document.getElementById("licenseInput").value.trim().toUpperCase();
      const msg = document.getElementById("licenseMsg");
      if (!input) return;
      msg.textContent = "Validando...";
      const { ok, error } = await validateLicense(input);
      if (ok) {
        localStorage.setItem(STORAGE_KEY, input);
        localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
        overlay.remove();
        startApp();
      } else {
        msg.textContent = errorMessage(error);
      }
    });
  }

  function errorMessage(error) {
    switch (error) {
      case "not_found":
        return "Chave não encontrada.";
      case "blocked":
        return "Esta licença foi bloqueada.";
      case "already_activated_elsewhere":
        return "Esta licença já está ativa em outro computador.";
      default:
        return "Não foi possível validar. Verifique sua conexão e tente novamente.";
    }
  }

  function startApp() {
    const script = document.createElement("script");
    script.src = "app.js";
    document.body.appendChild(script);
  }

  async function boot() {
    const savedKey = localStorage.getItem(STORAGE_KEY);
    const lastCheck = Number(localStorage.getItem(LAST_CHECK_KEY) || 0);
    const needsRecheck = Date.now() - lastCheck > RECHECK_INTERVAL_MS;

    if (!savedKey) {
      showGate();
      return;
    }

    if (!needsRecheck) {
      startApp();
      return;
    }

    const { ok, error } = await validateLicense(savedKey);
    if (ok) {
      localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
      startApp();
    } else {
      localStorage.removeItem(STORAGE_KEY);
      showGate(errorMessage(error));
    }
  }

  boot();
})();
