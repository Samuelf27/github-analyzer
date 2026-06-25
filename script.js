const $ = (id) => document.getElementById(id);
const statusEl = $('status'), dash = $('dash');
let langChart, starChart;

const LANG_COLORS = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', HTML: '#e34c26',
  CSS: '#563d7c', Java: '#b07219', 'C#': '#178600', PHP: '#4F5D95', Shell: '#89e051',
  'Jupyter Notebook': '#DA5B0B', Vue: '#41b883', Go: '#00ADD8', Ruby: '#701516', C: '#555555',
};
const colorFor = (lang, i) => LANG_COLORS[lang] || `hsl(${(i * 47) % 360} 65% 55%)`;

function setStatus(msg) { statusEl.textContent = msg; }

async function analyze(username) {
  setStatus(`Buscando @${username}...`);
  dash.classList.add('hidden');
  try {
    const uRes = await fetch(`https://api.github.com/users/${username}`);
    if (uRes.status === 404) throw new Error('Usuário não encontrado.');
    if (uRes.status === 403) throw new Error('Limite da API do GitHub atingido. Tente de novo mais tarde.');
    if (!uRes.ok) throw new Error('Erro ao consultar a API.');
    const user = await uRes.json();

    const rRes = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`);
    const repos = (await rRes.json()).filter(r => !r.fork);

    render(user, repos);
    setStatus('');
    dash.classList.remove('hidden');
  } catch (e) {
    setStatus(`⚠️ ${e.message}`);
  }
}

function render(user, repos) {
  // Perfil
  $('profile').innerHTML = `
    <img src="${user.avatar_url}" alt="${user.login}" />
    <div class="profile__info">
      <h2>${user.name || user.login}</h2>
      <div class="login">
        <a href="${user.html_url}" target="_blank" rel="noopener">@${user.login}</a>
        ${user.location ? ' · 📍 ' + user.location : ''}
      </div>
      ${user.bio ? `<p class="bio">${user.bio}</p>` : ''}
    </div>`;

  // Estatísticas
  const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0);
  $('stats').innerHTML = [
    [user.public_repos, 'Repositórios'],
    [totalStars, 'Estrelas'],
    [user.followers, 'Seguidores'],
    [user.following, 'Seguindo'],
  ].map(([n, l]) => `<div class="stat"><div class="stat__n">${n}</div><div class="stat__l">${l}</div></div>`).join('');

  // Linguagens
  const langs = {};
  repos.forEach(r => { if (r.language) langs[r.language] = (langs[r.language] || 0) + 1; });
  const langEntries = Object.entries(langs).sort((a, b) => b[1] - a[1]).slice(0, 8);
  drawDoughnut('langChart', langChart, langEntries, (c) => langChart = c);

  // Estrelas por repo
  const topStarred = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 6);
  drawBar('starChart', starChart, topStarred.map(r => [r.name, r.stargazers_count]), (c) => starChart = c);

  // Top repos
  $('repos').innerHTML = topStarred.map(r => `
    <div class="repo">
      <a href="${r.html_url}" target="_blank" rel="noopener">${r.name}</a>
      <p>${r.description ? r.description.slice(0, 80) : 'Sem descrição.'}</p>
      <div class="repo__meta">
        <span>⭐ ${r.stargazers_count}</span>
        <span>🍴 ${r.forks_count}</span>
        ${r.language ? `<span>● ${r.language}</span>` : ''}
      </div>
    </div>`).join('');
}

function drawDoughnut(canvasId, prev, entries, save) {
  if (prev) prev.destroy();
  const c = new Chart($(canvasId), {
    type: 'doughnut',
    data: {
      labels: entries.map(e => e[0]),
      datasets: [{ data: entries.map(e => e[1]), backgroundColor: entries.map((e, i) => colorFor(e[0], i)), borderColor: '#161b22', borderWidth: 2 }],
    },
    options: { plugins: { legend: { labels: { color: '#e6edf3', font: { size: 12 } }, position: 'right' } } },
  });
  save(c);
}

function drawBar(canvasId, prev, entries, save) {
  if (prev) prev.destroy();
  const c = new Chart($(canvasId), {
    type: 'bar',
    data: {
      labels: entries.map(e => e[0]),
      datasets: [{ data: entries.map(e => e[1]), backgroundColor: '#2f81f7', borderRadius: 6 }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#8b949e', maxRotation: 45, minRotation: 30 }, grid: { display: false } },
        y: { ticks: { color: '#8b949e', precision: 0 }, grid: { color: '#30363d' } },
      },
    },
  });
  save(c);
}

$('form').addEventListener('submit', (e) => {
  e.preventDefault();
  const u = $('user').value.trim();
  if (u) analyze(u);
});

// Exemplo inicial
window.addEventListener('load', () => { $('user').value = 'Samuelf27'; analyze('Samuelf27'); });
