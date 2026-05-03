let gameState = {
  p1: { name: '', subject: '', score: 0 },
  p2: { name: 'Bot Opponent', subject: '', score: 0 },
  currentQ: 0,
  questions: [],
  answered: false,
  currentLeaderboard: 'overall',
  currentTimeframe: 'week',
};

// ============= GAME FUNCTIONS =============

function switchToGame() {
  const name = document.getElementById('playerName').value.trim();
  const subject = document.getElementById('subject').value;
  
  if (!name) {
    alert('Please enter your name');
    return;
  }
  if (!subject) {
    alert('Please select a subject');
    return;
  }
  
  gameState.p1 = { name, subject, score: 0 };
  document.getElementById('p1Name').textContent = name;
  document.getElementById('p2Name').textContent = 'Opponent';
  
  gameState.questions = (questionBank[subject] || []).slice(0, 20);
  if (gameState.questions.length < 20) {
    for (let i = gameState.questions.length; i < 20; i++) {
      gameState.questions.push(gameState.questions[i % gameState.questions.length]);
    }
  }
  
  gameState.currentQ = 0;
  switchScreen('gameScreen');
  loadQuestion();
}

function loadQuestion() {
  const q = gameState.questions[gameState.currentQ];
  document.getElementById('questionNum').textContent = gameState.currentQ + 1;
  document.getElementById('question').textContent = q.q;
  
  const container = document.getElementById('optionsContainer');
  container.innerHTML = '';
  
  q.opts.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-secondary';
    btn.textContent = opt;
    btn.onclick = () => answerQuestion(i, q.ans);
    container.appendChild(btn);
  });
  
  gameState.answered = false;
  startTimer();
}

function startTimer() {
  let time = 45;
  const timerEl = document.getElementById('timer');
  const interval = setInterval(() => {
    timerEl.textContent = time;
    if (time <= 5) timerEl.style.color = 'var(--danger)';
    else if (time <= 15) timerEl.style.color = '#FAA61A';
    else timerEl.style.color = 'var(--primary)';
    
    time--;
    if (time < 0) {
      clearInterval(interval);
      if (!gameState.answered) nextQuestion();
    }
  }, 1000);
}

function answerQuestion(selected, correct) {
  if (gameState.answered) return;
  gameState.answered = true;
  
  if (selected === correct) {
    gameState.p1.score++;
  }
  
  if (Math.random() > 0.4) {
    gameState.p2.score++;
  }
  
  document.getElementById('p1Score').textContent = gameState.p1.score;
  document.getElementById('p2Score').textContent = gameState.p2.score;
  
  setTimeout(nextQuestion, 1500);
}

function nextQuestion() {
  gameState.currentQ++;
  if (gameState.currentQ >= 20) {
    endGame();
  } else {
    loadQuestion();
  }
}

function endGame() {
  const p1Wins = gameState.p1.score > gameState.p2.score;
  document.getElementById('winnerName').textContent = p1Wins ? gameState.p1.name : gameState.p2.name;
  document.getElementById('winnerScore').textContent = Math.max(gameState.p1.score, gameState.p2.score);
  document.getElementById('loserName').textContent = p1Wins ? gameState.p2.name : gameState.p1.name;
  document.getElementById('loserScore').textContent = Math.min(gameState.p1.score, gameState.p2.score);
  switchScreen('results');
}

function rematchSamePlayer() {
  gameState.currentQ = 0;
  gameState.p1.score = 0;
  gameState.p2.score = 0;
  switchScreen('gameScreen');
  loadQuestion();
}

// ============= LEADERBOARD FUNCTIONS =============

function switchToLeaderboard() {
  updateLeaderboard();
  switchScreen('leaderboardScreen');
}

function switchLeaderboardTab(tab) {
  gameState.currentLeaderboard = tab;
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  updateLeaderboard();
}

function switchTimeframe(timeframe) {
  gameState.currentTimeframe = timeframe;
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  updateLeaderboard();
}

function updateLeaderboard() {
  const data = leaderboardData[gameState.currentLeaderboard] || leaderboardData.overall;
  const tbody = document.getElementById('leaderboardBody');
  tbody.innerHTML = '';
  
  data.forEach((player, idx) => {
    const winRate = Math.round((player.wins / player.games) * 100);
    const row = document.createElement('tr');
    
    let rankClass = '';
    let medal = '';
    if (idx === 0) {
      rankClass = 'gold';
      medal = '🥇';
    } else if (idx === 1) {
      rankClass = 'silver';
      medal = '🥈';
    } else if (idx === 2) {
      rankClass = 'bronze';
      medal = '🥉';
    }
    
    const initials = player.name.split(' ').map(n => n[0]).join('');
    
    row.innerHTML = `
      <td>
        <div class="rank ${rankClass}">${medal || (idx + 1)}</div>
      </td>
      <td>
        <div class="player-cell">
          <div class="avatar">${initials}</div>
          <div class="player-info">
            <div class="player-name">${player.name}</div>
            <div class="player-meta">${player.games} games played</div>
          </div>
        </div>
      </td>
      <td class="stat-cell">${player.points} <span class="stat-small">pts</span></td>
      <td class="stat-cell">${player.wins} <span class="stat-small">W</span></td>
      <td class="stat-cell">${winRate}% <span class="stat-small">ratio</span></td>
    `;
    tbody.appendChild(row);
  });
}

// ============= NAVIGATION FUNCTIONS =============

function switchToWelcome() {
  document.getElementById('playerName').value = '';
  document.getElementById('subject').value = '';
  switchScreen('welcome');
}

function switchScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

// Initialize leaderboard on page load
window.addEventListener('DOMContentLoaded', function() {
  updateLeaderboard();
});
