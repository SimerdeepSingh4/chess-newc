const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;

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
          socket.emit("move", move);
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
  const move = ({
    from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
    to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
    promotion: 'q'
  });

  socket.emit("move", move);
};

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
const updateCapturedPieces = (move) => {
  if (move.captured) {
    const capturedIcon = getPieceIcon({ type: move.captured, color: move.color === "w" ? "b" : "w" });
    if (move.color === "w") {
      blackCapturedEl.innerHTML += `<span>${capturedIcon}</span>`;
    } else {
      whiteCapturedEl.innerHTML += `<span>${capturedIcon}</span>`;
    }
  }
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


socket.on("playerRole", function (role) {
  playerRole = role;
  renderBoard();
});

socket.on("spectatorRole", function () {
  playerRole = null;
  renderBoard();
});

socket.on("boardState", function (fen) {
  chess.load(fen);
  renderBoard();
  updateStatus();
});
socket.on("move", function (move) {
  chess.move(move);
  renderBoard();
  updateStatus();
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
  playerRole = data.role;

  // Hide waiting screen, show game screen
  document.getElementById("waiting-room").classList.add("hidden");
  document.getElementById("game-container").classList.remove("hidden");

  document.getElementById("game-status").innerText =
    "Game Started! You are " + (playerRole === "w" ? "White" : "Black");
});

// Opponent leaves
socket.on("opponentLeft", (msg) => {
  document.getElementById("game-status").innerText = msg;
  // Optionally show waiting room again for new player
  document.getElementById("waiting-room").classList.remove("hidden");
  document.getElementById("game-container").classList.add("hidden");
});

const exitBtn = document.getElementById("exitBtn");

if (exitBtn) {
  exitBtn.addEventListener("click", () => {
    socket.emit("playerExit");
    alert("You exited the game!");
    window.location.href = "/"; // send back to home or lobby page
  });
}


renderBoard();
updateStatus();

