const {app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, screen, powerMonitor} = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const {Engine, config} = require('./engine');
let pet, settings, tray, engine, timer, saveTimer, position, drag, suspended = false;
let configPath, statePath;
const read = file => {try {return JSON.parse(fs.readFileSync(file, 'utf8'));} catch {return {};}};
function write(file, data) {const temp = `${file}.tmp`; fs.writeFileSync(temp, JSON.stringify(data, null, 2)); fs.renameSync(temp, file);}
function save() {try {write(statePath, {...engine.state, position, savedAt: Date.now()});} catch (error) {console.error('無法儲存狀態：', error.message);}}
function publish() {if (pet && !pet.isDestroyed()) pet.webContents.send('state', {...engine.view(), fadeMs: engine.config.timing.fadeMs});}
function act(action) {engine.action(action); save(); publish(); rebuildMenu();}
function menuItems() {return [
  {label: '開始學習', enabled: !engine.night, click: () => act('study')},
  {label: '立刻休息', enabled: !engine.night, click: () => act('break')},
  {label: engine.state.paused ? '繼續計時' : '暫停計時', enabled: !engine.night, click: () => act('pause')},
  {type: 'separator'}, {label: '設定', click: openSettings}, {label: '找回寵物', click: () => {place(); pet.showInactive();}},
  {type: 'separator'}, {label: '結束程式', click: () => app.quit()}
];}
function rebuildMenu() {tray?.setContextMenu(Menu.buildFromTemplate(menuItems()));}
function secureWindow(options) {
  const win = new BrowserWindow({...options, webPreferences: {preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true}});
  win.webContents.setWindowOpenHandler(() => ({action: 'deny'}));
  win.webContents.on('will-navigate', e => e.preventDefault());
  return win;
}
function place() {
  const displays = screen.getAllDisplays();
  const work = displays.find(d => position && position.x >= d.workArea.x && position.y >= d.workArea.y && position.x + 320 <= d.workArea.x + d.workArea.width && position.y + 390 <= d.workArea.y + d.workArea.height)?.workArea || screen.getPrimaryDisplay().workArea;
  const x = Math.round(Math.max(work.x, Math.min(position?.x ?? work.x + work.width - 340, work.x + work.width - 320)));
  const y = Math.round(Math.max(work.y, Math.min(position?.y ?? work.y + work.height - 410, work.y + work.height - 390)));
  pet.setPosition(x, y); position = {x, y};
}
function openSettings() {
  if (settings && !settings.isDestroyed()) {settings.show(); settings.focus(); return;}
  settings = secureWindow({width: 460, height: 560, resizable: false, title: '白原設定', autoHideMenuBar: true});
  settings.loadFile(path.join(__dirname, 'settings.html')); settings.on('closed', () => {settings = null;});
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {if (pet) {place(); pet.showInactive();}});
  app.whenReady().then(() => {
    configPath = path.join(app.getPath('userData'), 'config.json'); statePath = path.join(app.getPath('userData'), 'state.json');
    let c; try {c = config(read(configPath));} catch {c = config();}
    if (!fs.existsSync(configPath)) write(configPath, c);
    const saved = read(statePath); position = saved.position;
    engine = new Engine(c, saved);
    if (process.platform === 'darwin') app.dock.hide();
    pet = secureWindow({width: 320, height: 390, frame: false, transparent: true, alwaysOnTop: true, resizable: false, skipTaskbar: true, hasShadow: false, show: false});
    pet.setAlwaysOnTop(true, 'floating'); pet.setVisibleOnAllWorkspaces(true, {visibleOnFullScreen: true}); place();
    pet.loadFile(path.join(__dirname, 'index.html'));
    pet.once('ready-to-show', () => {publish(); pet.showInactive();});
    // Use an image generated from a small monochrome paw bitmap, for light and dark menu bars.
    const bytes = Buffer.alloc(18 * 18 * 4);
    for (let y=0;y<18;y++) for(let x=0;x<18;x++) if ([[9,11,4,3],[4,5,2,3],[9,3,2,3],[14,5,2,3]].some(([cx,cy,rx,ry]) => ((x-cx)/rx)**2 + ((y-cy)/ry)**2 <= 1)) bytes[(y*18+x)*4+3]=255;
    const paw = nativeImage.createFromBitmap(bytes, {width:18,height:18,scaleFactor:1}); paw.setTemplateImage(true);
    tray = new Tray(paw); tray.setToolTip('白原桌面寵物'); rebuildMenu();
    timer = setInterval(() => {if (suspended) return; const night = engine.night; engine.sync(new Date()); publish(); if (night !== engine.night) rebuildMenu();}, c.timing.tickMs);
    saveTimer = setInterval(save, c.timing.saveMs);
    powerMonitor.on('suspend', () => {engine.sync(new Date()); suspended = true; save();});
    powerMonitor.on('resume', () => {engine.last = Date.now(); suspended = false; engine.sync(new Date()); publish(); rebuildMenu();});
    screen.on('display-removed', place); screen.on('display-metrics-changed', place);
  });
}
ipcMain.on('menu', event => {if (event.sender === pet?.webContents) Menu.buildFromTemplate(menuItems()).popup({window:pet});});
ipcMain.on('click', event => {if (event.sender === pet?.webContents) act('click');});
ipcMain.on('drag', (event, phase) => {
  if (event.sender !== pet?.webContents) return;
  const point = screen.getCursorScreenPoint();
  if (phase === 'start') {drag = {point, bounds:pet.getBounds()}; return;}
  if (!drag) return;
  pet.setPosition(drag.bounds.x + point.x - drag.point.x, drag.bounds.y + point.y - drag.point.y);
  if (phase === 'end') {const [x,y] = pet.getPosition(); position={x,y}; drag=null; save();}
});
ipcMain.handle('get-config', event => {if (event.sender === settings?.webContents) return {config:engine.config, configPath, total:engine.state.total};});
ipcMain.handle('save-config', (event, values) => {
  if (event.sender !== settings?.webContents) return {error:'拒絕存取'};
  try {
    const allowed = Object.fromEntries(['studyMinutes','breakMinutes','nightStart','nightEnd','dailyGoalHours'].map(k => [k, values[k]]));
    const c = config({...engine.config, ...allowed});
    engine.sync(new Date()); write(configPath, c); engine.config = c;
    // New durations begin a fresh study session; daily accumulated time stays intact.
    engine.start('study'); engine.sync(new Date()); save(); publish(); rebuildMenu();
    return {ok:true};
  } catch (error) {return {error:error.message};}
});
app.on('window-all-closed', () => {});
app.on('before-quit', () => {clearInterval(timer); clearInterval(saveTimer); if (engine) {engine.sync(new Date()); save();}});
