// server.js - QuizMatch Backend Server
// This handles real-time matchmaking and multiplayer game logic

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============= DATA STORAGE =============
let waitingPlayers = []; // Players waiting for a match
let activeGames = {}; // Active game sessions
let playerSessions = {}; // Track player connections

// ============= GAME QUESTIONS =============
const questionBank = {
  math: [
    { q: "What is 15 × 12?", opts: ["150", "180", "200", "220"], ans: 1 },
    { q: "Solve: 2x + 5 = 17", opts: ["x = 4", "x = 5", "x = 6", "x = 11"], ans: 2 },
    { q: "What is 25% of 80?", opts: ["15", "20", "25", "30"], ans: 1 },
    { q: "12² = ?", opts: ["120", "132", "144", "156"], ans: 2 },
    { q: "√144 = ?", opts: ["10", "11", "12", "13"], ans: 2 },
    { q: "What is the sum of angles in a triangle?", opts: ["90°", "180°", "270°", "360°"], ans: 1 },
    { q: "What is 7³?", opts: ["343", "300", "310", "350"], ans: 0 },
    { q: "Solve: 3x - 10 = 20", opts: ["x = 10", "x = 5", "x = 8", "x = 15"], ans: 0 },
    { q: "What is 50% of 200?", opts: ["80", "100", "120", "150"], ans: 1 },
    { q: "What is the LCM of 12 and 18?", opts: ["24", "36", "48", "60"], ans: 1 },
  ],
  science: [
    { q: "What is the chemical symbol for Gold?", opts: ["Go", "Gd", "Au", "Ag"], ans: 2 },
    { q: "What is the speed of light?", opts: ["300,000 km/s", "150,000 km/s", "450,000 km/s", "100,000 km/s"], ans: 0 },
    { q: "How many bones are in the human body?", opts: ["186", "206", "226", "246"], ans: 1 },
    { q: "What is H₂O?", opts: ["Hydrogen peroxide", "Water", "Salt", "Acid"], ans: 1 },
    { q: "What planet is closest to the Sun?", opts: ["Venus", "Mercury", "Mars", "Earth"], ans: 1 },
    { q: "What is the powerhouse of the cell?", opts: ["Nucleus", "Mitochondria", "Ribosome", "Chloroplast"], ans: 1 },
    { q: "What does DNA stand for?", opts: ["Deoxyribonucleic Acid", "Dynamic Nuclear Acid", "Deoxyribose Nucleic Arrangement", "Digital Nucleic Archive"], ans: 0 },
    { q: "What is the boiling point of water?", opts: ["90°C", "100°C", "110°C", "120°C"], ans: 1 },
    { q: "What is the symbol for Oxygen?", opts: ["O", "O2", "Ox", "Oxy"], ans: 0 },
    { q: "How many planets are in our solar system?", opts: ["7", "8", "9", "10"], ans: 1 },
  ],
  history: [
    { q: "In what year did World War II end?", opts: ["1943", "1944", "1945", "1946"], ans: 2 },
    { q: "Who was the first President of the USA?", opts: ["Thomas Jefferson", "George Washington", "John Adams", "Benjamin Franklin"], ans: 1 },
    { q: "When did the Titanic sink?", opts: ["1910", "1912", "1915", "1920"], ans: 1 },
    { q: "In what year did Columbus reach the Americas?", opts: ["1490", "1491", "1492", "1493"], ans: 2 },
    { q: "Who was the first emperor of Rome?", opts: ["Julius Caesar", "Augustus", "Nero", "Tiberius"], ans: 1 },
    { q: "In what year did World War I end?", opts: ["1916", "1917", "1918", "1919"], ans: 2 },
    { q: "Who invented the printing press?", opts: ["Leonardo da Vinci", "Johannes Gutenberg", "Galileo Galilei", "Isaac Newton"], ans: 1 },
    { q: "In what year did the American Revolution start?", opts: ["1773", "1774", "1775", "1776"], ans: 2 },
    { q: "In what century was the Renaissance?", opts: ["13th", "14th", "15th", "16th"], ans: 2 },
    { q: "When did the Soviet Union collapse?", opts: ["1989", "1990", "1991", "1992"], ans: 2 },
  ],
  english: [
    { q: "Which of these is a noun?", opts: ["Run", "Beautiful", "Happy", "Book"], ans: 3 },
    { q: "What is the past tense of 'go'?", opts: ["Goed", "Went", "Going", "Goes"], ans: 1 },
    { q: "Which word is a verb?", opts: ["Happy", "Jump", "Beautiful", "Blue"], ans: 1 },
    { q: "What does 'eloquent' mean?", opts: ["Boring", "Silent", "Fluent and persuasive", "Angry"], ans: 2 },
    { q: "What is the plural of 'child'?", opts: ["Childs", "Children", "Childes", "Childern"], ans: 1 },
    { q: "Which is a proper noun?", opts: ["Dog", "London", "House", "Tree"], ans: 1 },
    { q: "What does 'benevolent' mean?", opts: ["Evil", "Generous", "Angry", "Sad"], ans: 1 },
    { q: "What is the opposite of 'hot'?", opts: ["Warm", "Cool", "Cold", "Freezing"], ans: 2 },
    { q: "What is an adjective?", opts: ["A person", "A place", "A word that describes", "An action"], ans: 2 },
    { q: "What is the past tense of 'eat'?", opts: ["Eated", "Ate", "Eating", "Eaten"], ans: 1 },
  ],
  biology: [
    { q: "What is the powerhouse of the cell?", opts: ["Nucleus", "Mitochondria", "Ribosome", "Chloroplast"], ans: 1 },
    { q: "How many chambers does a human heart have?", opts: ["2", "3", "4", "5"], ans: 2 },
    { q: "What is photosynthesis?", opts: ["Cell division", "Energy from sunlight", "Protein synthesis", "DNA replication"], ans: 1 },
    { q: "What do plants need for photosynthesis?", opts: ["Water and oxygen", "Carbon dioxide and sunlight", "Nitrogen and heat", "Sugar and salt"], ans: 1 },
    { q: "What are the basic units of life?", opts: ["Atoms", "Molecules", "Cells", "Tissues"], ans: 2 },
    { q: "What is respiration in plants?", opts: ["Breathing", "Using oxygen to release energy", "Making food", "Releasing oxygen"], ans: 1 },
    { q: "What is a gene?", opts: ["A protein", "A unit of heredity", "A cell", "A chromosome"], ans: 1 },
    { q: "How many chromosomes do humans have?", opts: ["23", "46", "48", "50"], ans: 1 },
    { q: "What is the basic unit of heredity?", opts: ["Chromosome", "Gene", "Cell", "Nucleus"], ans: 1 },
    { q: "What is osmosis?", opts: ["Movement of water across membrane", "Movement of salt", "Movement of protein", "Movement of glucose"], ans: 0 },
  ],
};

// ============= WEBSOCKET HANDLERS =============
wss.on('connection', (ws) => {
  console.log('New client connected');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleMessage(ws, data);
    } catch (err) {
      console.error('Error parsing message:', err);
    }
  });

  ws.on('close', () => {
    handleDisconnect(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// ============= MESSAGE HANDLERS =============
function handleMessage(ws, data) {
  switch (data.type) {
    case 'PLAYER_JOIN':
      handlePlayerJoin(ws, data);
      break;
    case 'SUBMIT_ANSWER':
      handleSubmitAnswer(ws, data);
      break;
    case 'REMATCH_REQUEST':
      handleRematchRequest(ws, data);
      break;
    default:
      console.log('Unknown message type:', data.type);
  }
}

function handlePlayerJoin(ws, data) {
  const { playerName, subject } = data;
  const playerId = Math.random().toString(36).substr(2, 9);
  
  // Store player session
  playerSessions[playerId] = {
    ws,
    playerName,
    subject,
    playerId,
    score: 0,
    gameId: null,
  };
  
  // Send player ID back to client
  ws.send(JSON.stringify({
    type: 'PLAYER_REGISTERED',
    playerId,
  }));
  
  // Add to waiting list
  const waitingPlayer = {
    playerId,
    playerName,
    subject,
    joinedAt: Date.now(),
  };
  
  waitingPlayers.push(waitingPlayer);
  console.log(`Player ${playerName} joined waiting list for ${subject}`);
  
  // Try to match players
  matchPlayers(subject);
}

function matchPlayers(subject) {
  // Get waiting players for this subject
  const subjectPlayers = waitingPlayers.filter(p => p.subject === subject);
  
  // Need at least 2 players to start a game
  if (subjectPlayers.length >= 2) {
    const p1Data = subjectPlayers[0];
    const p2Data = subjectPlayers[1];
    
    // Remove from waiting list
    waitingPlayers = waitingPlayers.filter(
      p => p.playerId !== p1Data.playerId && p.playerId !== p2Data.playerId
    );
    
    // Create game session
    const gameId = Math.random().toString(36).substr(2, 9);
    const questions = getRandomQuestions(subject, 20);
    
    activeGames[gameId] = {
      gameId,
      subject,
      p1: {
        playerId: p1Data.playerId,
        playerName: p1Data.playerName,
        score: 0,
      },
      p2: {
        playerId: p2Data.playerId,
        playerName: p2Data.playerName,
        score: 0,
      },
      questions,
      currentQuestionIndex: 0,
      startedAt: Date.now(),
      gameState: 'playing', // playing, finished
      answers: {},
    };
    
    // Update player sessions
    playerSessions[p1Data.playerId].gameId = gameId;
    playerSessions[p2Data.playerId].gameId = gameId;
    
    // Notify both players that match found
    const p1Session = playerSessions[p1Data.playerId];
    const p2Session = playerSessions[p2Data.playerId];
    
    const matchMessage = {
      type: 'MATCH_FOUND',
      gameId,
      opponent: {
        playerId: p1Data.playerId === p1Session.playerId ? p2Data.playerId : p1Data.playerId,
        playerName: p1Data.playerId === p1Session.playerId ? p2Data.playerName : p1Data.playerName,
      },
      questions,
      subject,
    };
    
    p1Session.ws.send(JSON.stringify({
      ...matchMessage,
      playerNumber: 1,
    }));
    
    p2Session.ws.send(JSON.stringify({
      ...matchMessage,
      opponent: {
        playerId: p1Data.playerId,
        playerName: p1Data.playerName,
      },
      playerNumber: 2,
    }));
    
    console.log(`Game ${gameId} started: ${p1Data.playerName} vs ${p2Data.playerName}`);
  }
}

function handleSubmitAnswer(ws, data) {
  const { playerId, gameId, questionIndex, selectedOption } = data;
  const game = activeGames[gameId];
  
  if (!game) {
    console.error('Game not found:', gameId);
    return;
  }
  
  const question = game.questions[questionIndex];
  const isCorrect = selectedOption === question.ans;
  
  // Determine which player answered
  let playerKey = game.p1.playerId === playerId ? 'p1' : 'p2';
  
  if (isCorrect) {
    game[playerKey].score++;
  }
  
  // Store answer
  if (!game.answers[questionIndex]) {
    game.answers[questionIndex] = {};
  }
  game.answers[questionIndex][playerId] = {
    isCorrect,
    selectedOption,
    timestamp: Date.now(),
  };
  
  // Send answer result to both players
  const answerResult = {
    type: 'ANSWER_RESULT',
    playerId,
    playerName: game[playerKey].playerName,
    questionIndex,
    isCorrect,
    p1Score: game.p1.score,
    p2Score: game.p2.score,
  };
  
  broadcastToGame(gameId, answerResult);
  
  // Check if all questions answered
  if (questionIndex >= game.questions.length - 1) {
    endGame(gameId);
  }
}

function endGame(gameId) {
  const game = activeGames[gameId];
  game.gameState = 'finished';
  
  const winner = game.p1.score > game.p2.score 
    ? game.p1.playerId 
    : game.p2.playerId;
  
  const gameResult = {
    type: 'GAME_OVER',
    gameId,
    winner,
    p1: game.p1,
    p2: game.p2,
  };
  
  broadcastToGame(gameId, gameResult);
  console.log(`Game ${gameId} ended. Winner: ${winner}`);
}

function handleRematchRequest(ws, data) {
  const { playerId, gameId } = data;
  const game = activeGames[gameId];
  
  if (!game) return;
  
  // Reset game for rematch
  game.gameState = 'playing';
  game.currentQuestionIndex = 0;
  game.p1.score = 0;
  game.p2.score = 0;
  game.answers = {};
  game.questions = getRandomQuestions(game.subject, 20);
  
  const rematchMessage = {
    type: 'REMATCH_STARTED',
    gameId,
    questions: game.questions,
  };
  
  broadcastToGame(gameId, rematchMessage);
  console.log(`Game ${gameId} restarted for rematch`);
}

// ============= UTILITY FUNCTIONS =============
function getRandomQuestions(subject, count) {
  const questions = questionBank[subject] || [];
  const shuffled = [...questions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function broadcastToGame(gameId, message) {
  const game = activeGames[gameId];
  if (!game) return;
  
  const p1Session = playerSessions[game.p1.playerId];
  const p2Session = playerSessions[game.p2.playerId];
  
  if (p1Session && p1Session.ws.readyState === WebSocket.OPEN) {
    p1Session.ws.send(JSON.stringify(message));
  }
  
  if (p2Session && p2Session.ws.readyState === WebSocket.OPEN) {
    p2Session.ws.send(JSON.stringify(message));
  }
}

function handleDisconnect(ws) {
  // Find and remove player session
  let playerId = null;
  for (const [id, session] of Object.entries(playerSessions)) {
    if (session.ws === ws) {
      playerId = id;
      break;
    }
  }
  
  if (playerId) {
    const session = playerSessions[playerId];
    
    // Remove from waiting list
    waitingPlayers = waitingPlayers.filter(p => p.playerId !== playerId);
    
    // End game if playing
    if (session.gameId && activeGames[session.gameId]) {
      const game = activeGames[session.gameId];
      broadcastToGame(session.gameId, {
        type: 'OPPONENT_DISCONNECTED',
        gameId: session.gameId,
      });
    }
    
    delete playerSessions[playerId];
    console.log(`Player ${playerId} disconnected`);
  }
}

// ============= REST API ENDPOINTS =============
app.get('/api/leaderboard/:subject', (req, res) => {
  // This would connect to a database in production
  // For now, return mock data
  const mockLeaderboard = {
    math: [
      { name: "Alex Chen", points: 950, wins: 18, games: 20 },
      { name: "Marcus Williams", points: 880, wins: 16, games: 19 },
    ],
    science: [
      { name: "Sarah Johnson", points: 920, wins: 17, games: 19 },
      { name: "Emma Davis", points: 850, wins: 15, games: 18 },
    ],
    history: [
      { name: "Jamal Brown", points: 880, wins: 16, games: 18 },
      { name: "Jessica Taylor", points: 810, wins: 14, games: 17 },
    ],
    english: [
      { name: "Emma Davis", points: 850, wins: 15, games: 18 },
      { name: "Charlotte White", points: 800, wins: 13, games: 16 },
    ],
    biology: [
      { name: "Sarah Johnson", points: 900, wins: 17, games: 19 },
      { name: "Emma Davis", points: 820, wins: 14, games: 17 },
    ],
  };
  
  const subject = req.params.subject;
  res.json(mockLeaderboard[subject] || []);
});

app.get('/api/stats', (req, res) => {
  res.json({
    activePlayers: Object.keys(playerSessions).length,
    waitingPlayers: waitingPlayers.length,
    activeGames: Object.keys(activeGames).length,
  });
});

// ============= SERVER START =============
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🚀 QuizMatch Server running on port ${PORT}`);
  console.log(`WebSocket: ws://localhost:${PORT}`);
  console.log(`HTTP: http://localhost:${PORT}\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Server shutting down...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
