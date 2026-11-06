# 白原桌面寵物

以 Electron 製作、主要供 macOS 使用的透明桌面學習夥伴。原始圖片已從 `asset - BY` 整理至 `assets/`，並保留原始內容。

## 安裝與執行

先安裝 [Node.js](https://nodejs.org/) 22 LTS 或更新版本，以及 Git。在 Mac 終端機執行：

```bash
git clone https://github.com/llzalex77/my-desk-baiyuan.git
cd my-desk-baiyuan
# 若 PR 尚未合併，先切換功能分支：
# git switch feat/electron-desktop-pet
npm ci
npm start
```

寵物以無邊框、透明、置頂視窗顯示，不出現在 Dock；上方選單列有爪印圖示。按住角色拖曳，放開便保存位置；單擊會問「怎麼了？」。右鍵角色或點選選單列圖示可開始學習、立刻休息、暫停／繼續、開啟設定或結束程式。外接螢幕移除後會把寵物移回可見範圍；也可用「找回寵物」。

## 學習與互動

- 預設學習 60 分鐘，休息 10 分鐘；下方顯示目前階段剩餘時間。
- 學習使用 `study.png`；休息隨機使用 `give.png` 或 `feed.png`。
- 休息結束顯示 `yay.png` 3 秒；手動開始學習顯示 `yeah.png` 3 秒。
- 單擊顯示 `what.png` 3 秒，拖曳不會觸發單擊。
- 每日學習累計 3 小時，顯示 `perfect.png` 5 秒，每天一次。
- 本機時間 01:00（含）至 06:00（不含）強制顯示 `goodnight.png`，暫停計時；06:00 重新開始一輪學習。自訂時段可跨午夜。
- 晚安優先於所有互動；滿分顯示期間不會被單擊打斷。短暫表情期間，原本的學習或休息計時仍繼續。手動開始學習／休息會重新開始該輪。
- 電腦睡眠、程式關閉期間不累計學習。重新啟動沿用剩餘時間與暫停狀態；若期間已跨過晚安結束時間，重新開始學習。
- 依 Mac 本機日期在午夜歸零當日累計；不需要重開程式。所有氣泡均為程式顯示文字，切換圖片有淡入淡出。

## 設定與資料保存

根目錄 `config.json` 集中存放預設學習／休息分鐘數、晚安時段、每日目標、所有氣泡文字與動畫時間。`timing` 中 `*Ms` 使用毫秒，`*Seconds` 使用秒；`messages` 每項為隨機抽選的文字陣列。可以在首次啟動前修改此檔。

首次啟動會把設定複製至 Electron 使用者資料目錄。macOS 通常是：

```text
~/Library/Application Support/my-desk-baiyuan/config.json
~/Library/Application Support/my-desk-baiyuan/state.json
```

請以「設定 → 修改氣泡文字與動畫時間」顯示的實際路徑為準。之後修改氣泡或動畫時間時，先結束程式，再編輯該處 `config.json`，重新啟動即可。已有使用者設定時，repo 內預設檔不會覆寫它。

右鍵「設定」可修改五項計時設定；儲存後立即生效並重新開始學習，保留當日累計。晚安期間仍維持晚安畫面。格式無效會顯示錯誤；啟動時設定檔無效則採用預設值。

`state.json` 保存當日累計、是否已達標、剩餘時間、暫停狀態與位置。每 5 秒及操作、拖曳結束、正常退出時寫入，採暫存檔替換；強制終止可能損失最近 5 秒進度。若要完全重設，結束程式後刪除上述兩個檔案。

## 打包 macOS .app

請在 Mac 上執行；預設產出目前 Mac 架構的版本：

```bash
npm ci
npm run pack:mac
```

`.app` 位於 `dist/mac/`（Intel）或 `dist/mac-arm64/`（Apple Silicon），可複製至「應用程式」。產出 DMG：

```bash
npm run dist:mac
# 指定架構：
npm run dist:mac -- --arm64
npm run dist:mac -- --x64
# 或同時包含兩種架構：
npm run dist:mac -- --universal
```

此專案未配置 Apple Developer 簽章與公證。個人本機打包可使用；要提供他人下載，請使用自己的 Apple Developer 憑證並依 [electron-builder macOS 簽章文件](https://www.electron.build/code-signing-mac.html) 設定簽章與公證。macOS 可能對未簽章程式顯示安全提示。

## 開發與驗證

```bash
npm test
```

測試涵蓋完整 60／10 分鐘循環、晚安邊界、跨午夜時段、每日歸零、每日目標、單擊／手動開始、暫停、重啟還原與睡眠間隔。`src/engine.js` 是不依賴 Electron 的計時狀態機；`src/main.js` 負責視窗、選單、儲存與 IPC；`src/renderer.js` 負責對話、淡入淡出和滑鼠操作。Renderer 使用 context isolation、sandbox 與限定 IPC，停用 Node.js integration。

目前雲端開發環境為 Linux；macOS 的 Dock 隱藏、選單列、全螢幕／多桌面置頂與 `.app` 打包仍需在實際 Mac 驗證。不同全螢幕 App、系統權限與桌面管理工具可能影響置頂顯示。
