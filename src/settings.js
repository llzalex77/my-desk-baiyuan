const form = document.querySelector('form');
window.pet.getConfig().then(data => {
  for (const input of form.querySelectorAll('input')) input.value = data.config[input.name];
  document.querySelector('#total').textContent = `今日已學習 ${(data.total / 3600000).toFixed(2)} 小時`;
  document.querySelector('#path').textContent = data.configPath;
});
form.addEventListener('submit', async e => {
  e.preventDefault(); const values = Object.fromEntries(new FormData(form));
  for (const key of ['studyMinutes','breakMinutes','dailyGoalHours']) values[key] = Number(values[key]);
  const result = await window.pet.saveConfig(values);
  document.querySelector('#result').textContent = result.ok ? '已儲存，繼續一起加油！' : result.error;
});
