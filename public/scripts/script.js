const gameArea = document.querySelector(".game");
const scoreboard = document.querySelector(".scoreboard");
const socket = new WebSocket("ws://localhost:8080");

//Gera uma string representando o tipo do carro, combinando cor e variação.
const generateCarType = () => {
  const colors = ["red", "green", "blue", "black", "yellow"];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const variation = Math.floor(Math.random() * 5) + 1;
  return `car_${color}_${variation}`;
};

// Dados do jogador local
const playerData = {
  id: "P" + Math.round(Math.random() * 10000),
  serverId: null,
  x: 0,
  y: 0,
  direction: "top",
  type: generateCarType(),
  velocity: 5,
};

// Atualiza o placar com os pontos dos jogadores.
const updateScoreboard = (scores) => {
  const sortedKeys = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);
  scoreboard.innerText = "";

  sortedKeys.forEach((key) => {
    const p = document.createElement("p");
    p.innerText = `${key}: ${scores[key]}`;
    scoreboard.appendChild(p);
  });
};

// Rotaciona o elemento do carro conforme a direção informada.
const rotateCar = (element, direction) => {
  let angle = 0;
  switch (direction) {
    case "left":
      angle = -90;
      break;
    case "right":
      angle = 90;
      break;
    case "bottom":
      angle = 180;
      break;
    case "top":
    default:
      angle = 0;
      break;
  }
  element.style.transform = `rotate(${angle}deg)`;
};

// Cria ou move o elemento do jogador na tela.
const renderPlayer = (id, x, y, type, direction) => {
  let playerEl = document.querySelector(`#${id}`);

  if (!playerEl) {
    playerEl = document.createElement("div");
    playerEl.id = id;
    playerEl.classList.add("player");

    // Cria a caixa do nick
    const nickBox = document.createElement("div");
    nickBox.classList.add("player-nick-box");
    nickBox.innerText = id;
    playerEl.appendChild(nickBox);

    // Cria o elemento visual do carro
    const carBox = document.createElement("div");
    carBox.classList.add("player-box");
    carBox.style.backgroundImage = `url(./public/assets/Cars/${type}.png)`;
    playerEl.appendChild(carBox);

    gameArea.appendChild(playerEl);
  }

  playerEl.style.left = `${x}px`;
  playerEl.style.top = `${y}px`;
  rotateCar(playerEl, direction);
};

// Atualiza a posição da gasolina (ponto) no jogo.
const renderPoint = (x, y) => {
  const pointEl = document.querySelector("#point");
  if (pointEl) {
    pointEl.style.left = `${x}px`;
    pointEl.style.top = `${y}px`;
  }
};

//Manipulador de eventos do teclado.
const handleKeyDown = (event) => {
  switch (event.key) {
    case "ArrowUp":
      playerData.y -= playerData.velocity;
      playerData.direction = "top";
      break;
    case "ArrowDown":
      playerData.y += playerData.velocity;
      playerData.direction = "bottom";
      break;
    case "ArrowLeft":
      playerData.x -= playerData.velocity;
      playerData.direction = "left";
      break;
    case "ArrowRight":
      playerData.x += playerData.velocity;
      playerData.direction = "right";
      break;
  }
  socket.send(JSON.stringify(playerData));
};
document.addEventListener("keydown", handleKeyDown);

socket.onopen = () => {
  console.log("Conectado ao servidor WebSocket!");
};

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);

  // Atualiza dados do jogador local se o id coincidir
  if (data.player.id === playerData.id) {
    playerData.velocity = data.player.velocity;
    playerData.x = data.player.x;
    playerData.y = data.player.y;
    playerData.serverId = data.player.from;
  }

  updateScoreboard(data.players_score);
  renderPoint(data.point.x, data.point.y);
  renderPlayer(
    data.player.id,
    data.player.x,
    data.player.y,
    data.player.type,
    data.player.direction
  );
};

socket.onclose = () => {
  console.log("Conexão fechada!");
};
