const {contextBridge, ipcRenderer} = require('electron');
contextBridge.exposeInMainWorld('pet', {
  onState: callback => ipcRenderer.on('state', (_event, state) => callback(state)),
  click: () => ipcRenderer.send('click'), menu: () => ipcRenderer.send('menu'),
  drag: phase => {if (['start','move','end'].includes(phase)) ipcRenderer.send('drag', phase);},
  getConfig: () => ipcRenderer.invoke('get-config'), saveConfig: values => ipcRenderer.invoke('save-config', values)
});
