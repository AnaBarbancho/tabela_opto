#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Identificador de hardware usado para vincular a licenca ao computador.
// Windows: le o MachineGuid do registro (estavel entre reinstalacoes do app,
// so muda se o Windows for reinstalado). Outros SOs: gera um UUID e persiste
// em um arquivo na pasta de dados do app.
#[tauri::command]
fn get_hardware_id(_app_handle: tauri::AppHandle) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use winreg::enums::HKEY_LOCAL_MACHINE;
        use winreg::RegKey;

        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        let key = hklm
            .open_subkey(r"SOFTWARE\Microsoft\Cryptography")
            .map_err(|e| e.to_string())?;
        let guid: String = key.get_value("MachineGuid").map_err(|e| e.to_string())?;
        return Ok(guid);
    }

    #[cfg(not(target_os = "windows"))]
    {
        use std::fs;
        use tauri::Manager;

        let dir = _app_handle
            .path()
            .app_data_dir()
            .map_err(|e| e.to_string())?;
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        let path = dir.join("hardware_id");

        if let Ok(existing) = fs::read_to_string(&path) {
            let trimmed = existing.trim().to_string();
            if !trimmed.is_empty() {
                return Ok(trimmed);
            }
        }

        let new_id = uuid::Uuid::new_v4().to_string();
        fs::write(&path, &new_id).map_err(|e| e.to_string())?;
        Ok(new_id)
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_hardware_id])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
