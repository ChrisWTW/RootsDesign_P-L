<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# RootsDesign P-L 專案指南

本專案使用 React (Vite) 構建，這是一份完整的使用與部署指南。

## 🚀 執行指南 (Run Locally)

**環境需求:**  Node.js (建議 v18+)

1. **安裝依賴套件:**
   ```bash
   npm install
   ```
2. **設定環境變數:**
   請複製 `.env.example` 並將其更名為 `.env.local` (如果不存在則請直接建立 `.env.local`)，然後填寫必要的環境變數內容（例如：`GEMINI_API_KEY` 等）。
3. **啟動開發伺服器:**
   ```bash
   npm run dev
   ```

## 📦 部署指南 (Deploy with GitHub Actions)

本專案已設置 GitHub Actions 以自動部署至 GitHub Pages：
- 部署檔案路徑位於 `.github/workflows/deploy.yml`。
- 當程式碼推送(Push)至 `main` 分支時，將自動觸發 `Build` 及 `Deploy` 工作並上線至 GitHub Pages。
- *備註: 若專案並非在根網域運行 (例：`username.github.io/repo`)，建議在 `vite.config.ts` 中設定 `base: '/你的儲存庫名稱/'` 以確保靜態資源能正確載入。*

## 🛡️ .gitignore 設計說明

專案已經透過 `.gitignore` 檔案排除以下不必要、暫存或敏感資料上傳：
- `node_modules/`, `dist/`, `build/` (開發暫存及打包成果)
- `.env*` 相關檔案 (避免環境變數或敏感金鑰外洩)
- `firebase-*.json` (避免 Firebase 機密資訊外洩)
- `.DS_Store`, `.vscode`, `.idea/` (系統與編輯器生成檔案)
- `*.log` (執行期間的日誌文件)
