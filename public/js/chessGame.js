const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;
let currentGameId = null;

const timerEl = document.getElementById("timer");
const statusEl = document.getElementById("game-status");

let selectedSquare = null;

function clearHighlights() {
  document.querySelectorAll(".highlight-move").forEach(sq => {
    sq.classList.remove("highlight-move");
  });
}

function highlightMoves(moves) {
  moves.forEach(m => {
    const row = 8 - parseInt(m.to[1]);
    const col = m.to.charCodeAt(0) - 97;
    const sq = document.querySelector(`[data-row='${row}'][data-col='${col}']`);
    if (sq) sq.classList.add("highlight-move");
  });
}

const renderBoard = () => {
  const board = chess.board();
  boardElement.innerHTML = "";
  board.forEach((row, rowIndex) => {
    row.forEach((square, squareIndex) => {
      const squareElement = document.createElement("div");
      squareElement.classList.add(
        "square",
        (rowIndex + squareIndex) % 2 === 0 ? "light" : "dark"
      );

      squareElement.dataset.row = rowIndex;
      squareElement.dataset.col = squareIndex;

      if (square) {
        const pieceElement = document.createElement("div");
        pieceElement.classList.add(
          "piece",
          square.color === "w" ? "white" : "black"
        );
        pieceElement.innerText = getPieceUnicode(square);
        pieceElement.draggable = playerRole === square.color;

        pieceElement.addEventListener("dragstart", (e) => {
          if (pieceElement.draggable) {
            draggedPiece = pieceElement;
            sourceSquare = { row: rowIndex, col: squareIndex };
            e.dataTransfer.setData("text/plain", "");
          }
        });

        pieceElement.addEventListener("dragend", (e) => {
          draggedPiece = null;
          sourceSquare = null;
        });

        squareElement.appendChild(pieceElement);
      }

      squareElement.addEventListener("dragover", (e) => {
        e.preventDefault();
      });

      squareElement.addEventListener("drop", (e) => {
        e.preventDefault();
        if (draggedPiece) {
          const targetSource = {
            row: parseInt(squareElement.dataset.row),
            col: parseInt(squareElement.dataset.col),
          };

          handleMove(sourceSquare, targetSource);
        }
      });
      squareElement.addEventListener("click", () => {
        clearHighlights();

        // If already selecting and clicked on new square → try to move
        if (selectedSquare) {
          const move = {
            from: toSquareName(selectedSquare.row, selectedSquare.col),
            to: toSquareName(parseInt(squareElement.dataset.row), parseInt(squareElement.dataset.col)),
            promotion: "q"
          };
          if (currentGameId) {
            socket.emit("move", { move, gameId: currentGameId });
          }
          selectedSquare = null;
          return;
        }

        // If this square has a piece belonging to the player → show moves
        if (square && square.color === playerRole) {
          selectedSquare = { row: rowIndex, col: squareIndex };

          const moves = chess.moves({
            square: toSquareName(rowIndex, squareIndex),
            verbose: true
          });

          highlightMoves(moves);
        }
      });
      boardElement.appendChild(squareElement);

    });
  });

  if (playerRole === 'b') {
    boardElement.classList.add("flipped");
  } else {
    boardElement.classList.remove("flipped");
  }

  // Clear old highlights
  document.querySelectorAll(".last-move").forEach(sq =>
    sq.classList.remove("last-move")
  );

  // Highlight last move
  const history = chess.history({ verbose: true });
  if (history.length > 0) {
    const lastMove = history[history.length - 1];


    const fromRow = 8 - parseInt(lastMove.from[1]);
    const fromCol = lastMove.from.charCodeAt(0) - 97;

    const toRow = 8 - parseInt(lastMove.to[1]);
    const toCol = lastMove.to.charCodeAt(0) - 97;

    const fromSquare = document.querySelector(
      `[data-row='${fromRow}'][data-col='${fromCol}']`
    );
    const toSquare = document.querySelector(
      `[data-row='${toRow}'][data-col='${toCol}']`
    );

    if (fromSquare) fromSquare.classList.add("last-move");
    if (toSquare) toSquare.classList.add("last-move");
  }
};

const handleMove = (source, target) => {
  const move = {
    from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
    to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
    promotion: 'q'
  };
  if (currentGameId) {
    socket.emit("move", { move, gameId: currentGameId });
  }
};

// Handle invalid move feedback from server
socket.on("invalidMove", (move) => {
  console.warn("Invalid move rejected by server:", move);

  // Reload board from server's FEN to undo the local wrong move
  socket.emit("requestBoardState", { gameId: currentGameId });

  // Optional: show message to player
  const statusEl = document.getElementById("game-status");
  if (statusEl) {
    statusEl.textContent = "Invalid move! Try again.";
  }
});


const getPieceUnicode = (piece) => {
  const unicodePieces = {
    p: "♙",
    r: "♜",
    n: "♞",
    b: "♝",
    q: "♛",
    k: "♚",
    P: "♙",
    R: "♖",
    N: "♘",
    B: "♗",
    Q: "♕",
    K: "♔",
  };

  return unicodePieces[piece.type] || "";
};

const toSquareName = (row, col) => {
  const files = "abcdefgh";
  return files[col] + (8 - row);
};

// ===== Captured Pieces =====
const whiteCapturedEl = document.getElementById("captured-white");
const blackCapturedEl = document.getElementById("captured-black");

const getPieceIcon = (piece) => {
  // Use same unicode as getPieceUnicode, but upper/lower for color
  const unicodePieces = {
    p: "♟",
    r: "♜",
    n: "♞",
    b: "♝",
    q: "♛",
    k: "♚",
    P: "♙",
    R: "♖",
    N: "♘",
    B: "♗",
    Q: "♕",
    K: "♔",
  };
  // If color is black, use lowercase, else uppercase
  let key = piece.type;
  if (piece.color === "b") key = key.toLowerCase();
  else key = key.toUpperCase();
  return unicodePieces[key] || "";
};

const updateCapturedPieces = () => {
  // Clear captured
  whiteCapturedEl.innerHTML = "";
  blackCapturedEl.innerHTML = "";
  // Go through move history and count captured pieces
  const history = chess.history({ verbose: true });
  const whiteCaptured = [];
  const blackCaptured = [];
  history.forEach(move => {
    if (move.captured) {
      if (move.color === "w") {
        blackCaptured.push({ type: move.captured, color: "b" });
      } else {
        whiteCaptured.push({ type: move.captured, color: "w" });
      }
    }
  });
  whiteCaptured.forEach(p => {
    whiteCapturedEl.innerHTML += `<span>${getPieceIcon(p)}</span>`;
  });
  blackCaptured.forEach(p => {
    blackCapturedEl.innerHTML += `<span>${getPieceIcon(p)}</span>`;
  });
};

// ===== Status =====
const updateStatus = () => {
  if (chess.in_checkmate()) {
    statusEl.textContent = `Checkmate! ${chess.turn() === "w" ? "Black" : "White"} wins`;
    clearInterval(timerInterval);
  } else if (chess.in_draw()) {
    statusEl.textContent = "Draw!";
    clearInterval(timerInterval);
  } else {
    statusEl.textContent = `${chess.turn() === "w" ? "White" : "Black"} to move` +
      (chess.in_check() ? " (Check!)" : "");
  }
};

socket.on("timerUpdate", ({ whiteTime, blackTime }) => {
  timerEl.textContent = `White: ${whiteTime}s | Black: ${blackTime}s`;
});



socket.on("playerRole", function (data) {
  playerRole = data.role;
  currentGameId = data.gameId;
  renderBoard();
  updateCapturedPieces();
});


socket.on("spectatorRole", function () {
  playerRole = null;
  renderBoard();
  updateCapturedPieces();
});


socket.on("boardState", function (fen) {
  chess.load(fen);
  renderBoard();
  updateStatus();
  updateCapturedPieces();
});
socket.on("move", function (move) {
  chess.move(move);
  renderBoard();
  updateStatus();
  updateCapturedPieces();
});

socket.on("gameOver", (data) => {
  const msg = data.winner === "w"
    ? "White wins! 🎉 (" + data.reason + ")"
    : "Black wins! 🎉 (" + data.reason + ")";
  document.getElementById("game-status").innerText = msg;

  // Optionally disable further moves
  boardElement.style.pointerEvents = "none";
});


socket.on("waiting", (msg) => {
  document.getElementById("waiting-room").classList.remove("hidden");
  document.getElementById("game-container").classList.add("hidden");

});

// Game starts
socket.on("gameStart", (data) => {
  // If data.role is present, set playerRole (for new joiners)
  if (data.role) playerRole = data.role;
  if (data.gameId) currentGameId = data.gameId;

  // Hide waiting screen, show game screen
  document.getElementById("waiting-room").classList.add("hidden");
  document.getElementById("game-container").classList.remove("hidden");

  // Show correct status for player
  let colorText = playerRole === "w" ? "White" : playerRole === "b" ? "Black" : "Spectator";
  document.getElementById("game-status").innerText =
    "Game Started! You are " + colorText;

  renderBoard();
  updateCapturedPieces();
});

// Opponent leaves
socket.on("opponentLeft", (msg) => {
  document.getElementById("game-status").innerText = msg;
  // Optionally show waiting room again for new player
  document.getElementById("waiting-room").classList.remove("hidden");
  document.getElementById("game-container").classList.add("hidden");
});


// ===== Custom Modal for Exit Confirmation =====

function showExitModal() {
  const modal = document.getElementById('exit-modal');
  if (modal) {
    modal.classList.remove('hidden');
    // Attach listeners (idempotent)
    document.getElementById('exit-confirm-btn').onclick = () => {
      showExitedInfo();
      socket.emit("playerExit");
      modal.classList.add('hidden');
    };
    document.getElementById('exit-cancel-btn').onclick = () => {
      modal.classList.add('hidden');
    };
  }
}

function showExitedInfo() {
  const info = document.getElementById('exited-info-modal');
  if (info) {
    info.classList.remove('hidden');
    setTimeout(() => {
      info.classList.add('hidden');
      window.location.href = "/";
    }, 1800);
  }
}

const exitBtn = document.getElementById("exitBtn");
if (exitBtn) {
  exitBtn.addEventListener("click", showExitModal);
}

// Remove duplicate/buggy playerRole/gameId logic



renderBoard();
updateStatus();
updateCapturedPieces();

