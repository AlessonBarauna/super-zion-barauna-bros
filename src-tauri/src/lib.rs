/// Janela do jogo: todo o código do jogo roda no front-end (Phaser). O Rust só hospeda a janela.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("erro ao executar o Super Zion Baraúna Bros.");
}
