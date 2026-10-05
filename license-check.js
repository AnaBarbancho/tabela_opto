// Gate de licenca: bloqueia o uso do app ate a chave ser validada no servidor.
// Configure SUPABASE_URL e SUPABASE_ANON_KEY apos criar o projeto Supabase.
(function () {
  const SUPABASE_URL = "https://gyimwqhlmkjhpknekbno.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5aW13cWhsbWtqaHBrbmVrYm5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMzgzNTQsImV4cCI6MjEwMTcxNDM1NH0.Z13SKDP3F-nR3B0sdXAiIIUhYt3713AjAKiKgAcrhm8";
  const VALIDATE_ENDPOINT = `${SUPABASE_URL}/functions/v1/validate-license`;

  const STORAGE_KEY = "opto_license_key";
  const LAST_CHECK_KEY = "opto_license_last_check";
  const ACTIVATED_AT_KEY = "opto_license_activated_at";

  const RECHECK_INTERVAL_MS = 1000 * 60 * 60 * 24; // tenta revalidar a cada 24h
  const OFFLINE_GRACE_MS = 1000 * 60 * 60 * 24 * 30; // permite ate 30 dias sem internet

  async function getHardwareId() {
    if (window.__TAURI__?.core?.invoke) {
      try {
        return await window.__TAURI__.core.invoke("get_hardware_id");
      } catch (_) {
        // segue para o fallback de navegador
      }
    }

    // Fallback fraco para teste no navegador. A protecao real e no app Tauri.
    let id = localStorage.getItem("opto_fallback_hw_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("opto_fallback_hw_id", id);
    }
    return id;
  }

  async function callLicenseServer(licenseKey, action = "validate") {
    const hardwareId = await getHardwareId();

    try {
      const res = await fetch(VALIDATE_ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ license_key: licenseKey, hardware_id: hardwareId, action }),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok && data.valid, error: data.error, online: true, data };
    } catch (_) {
      return { ok: false, error: "network_error", online: false };
    }
  }

  function validateLicense(licenseKey) {
    return callLicenseServer(licenseKey, "validate");
  }

  function deactivateLicense(licenseKey) {
    return callLicenseServer(licenseKey, "deactivate");
  }

  function saveValidLicense(licenseKey) {
    const now = String(Date.now());
    localStorage.setItem(STORAGE_KEY, licenseKey);
    localStorage.setItem(LAST_CHECK_KEY, now);
    if (!localStorage.getItem(ACTIVATED_AT_KEY)) {
      localStorage.setItem(ACTIVATED_AT_KEY, now);
    }
  }

  function clearLicense() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LAST_CHECK_KEY);
    localStorage.removeItem(ACTIVATED_AT_KEY);
  }

  function hasOfflineGrace(lastCheck) {
    return lastCheck > 0 && Date.now() - lastCheck <= OFFLINE_GRACE_MS;
  }

  function showGate(message) {
    const overlay = document.createElement("div");
    overlay.id = "licenseGate";
    overlay.style.cssText =
      "position:fixed;inset:0;background:#0b0d10;color:#fff;display:flex;align-items:center;justify-content:center;z-index:99999;font-family:system-ui,sans-serif;";
    overlay.innerHTML = `
      <div style="max-width:380px;width:100%;padding:24px;">
        <h2 style="margin:0 0 12px;font-size:18px;">Ativacao necessaria</h2>
        <p id="licenseMsg" style="margin:0 0 16px;font-size:13px;opacity:.8;">${message ?? "Informe a chave de licenca para usar o sistema."}</p>
        <input id="licenseInput" placeholder="XXXX-XXXX-XXXX-XXXX" style="width:100%;padding:10px;margin-bottom:10px;box-sizing:border-box;text-transform:uppercase;" />
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
        saveValidLicense(input);
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
        return "Chave nao encontrada.";
      case "blocked":
        return "Esta licenca foi bloqueada.";
      case "already_activated_elsewhere":
        return "Esta licenca ja esta ativa em outro computador.";
      case "not_active_on_this_computer":
        return "Esta licenca nao esta ativa neste computador.";
      case "network_error":
        return "Sem conexao com o servidor. A primeira ativacao precisa de internet.";
      case "offline_expired":
        return "Esta licenca precisa ser revalidada pela internet para continuar.";
      default:
        return "Nao foi possivel validar. Verifique sua conexao e tente novamente.";
    }
  }

  function startApp() {
    const script = document.createElement("script");
    script.src = "app.js";
    document.body.appendChild(script);
    showLicenseControls();
  }

  function showLicenseControls() {
    if (document.getElementById("licenseControls")) return;

    const controls = document.createElement("div");
    controls.id = "licenseControls";
    controls.style.cssText =
      "position:fixed;right:16px;bottom:16px;z-index:9999;display:flex;gap:8px;align-items:center;font-family:system-ui,sans-serif;";
    controls.innerHTML = `
      <button id="deactivateLicense" type="button" title="Liberar esta chave para outro computador" style="border:1px solid rgba(12,16,20,.18);background:#fff;color:#1f2933;border-radius:8px;padding:9px 12px;font-size:12px;box-shadow:0 8px 24px rgba(15,23,42,.14);cursor:pointer;">Desativar licenca</button>
    `;
    document.body.appendChild(controls);

    document.getElementById("deactivateLicense").addEventListener("click", async () => {
      const savedKey = localStorage.getItem(STORAGE_KEY);
      if (!savedKey) {
        clearLicense();
        location.reload();
        return;
      }

      const confirmed = confirm(
        "Desativar esta licenca neste computador?\n\nDepois disso, esta chave podera ser ativada em outro computador e este app voltara para a tela de ativacao."
      );
      if (!confirmed) return;

      const button = document.getElementById("deactivateLicense");
      button.disabled = true;
      button.textContent = "Desativando...";

      const { ok, error } = await deactivateLicense(savedKey);
      if (ok) {
        clearLicense();
        alert("Licenca desativada. Agora ela pode ser usada em outro computador.");
        location.reload();
      } else {
        button.disabled = false;
        button.textContent = "Desativar licenca";
        alert(errorMessage(error));
      }
    });
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
      saveValidLicense(savedKey);
      startApp();
    } else if (error === "network_error" && hasOfflineGrace(lastCheck)) {
      startApp();
    } else if (error === "network_error") {
      showGate(errorMessage("offline_expired"));
    } else {
      clearLicense();
      showGate(errorMessage(error));
    }
  }

  boot();
})();
