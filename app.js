const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);
const io = socket(server);

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("index", { title: "Chess Game" });
});

// Store games by ID
let games = {};
let waitingPlayer = null; // temporarily store a player if alone

io.on("connection", (socket) => {
    console.log("New user connected:", socket.id);

    if (!waitingPlayer) {
        // first player waiting
        waitingPlayer = socket;
        socket.emit("waiting", "Waiting for opponent...");
    } else {
        // start a new game with waiting player + this player
        const gameId = uuidv4();

        games[gameId] = {
            chess: new Chess(),
            players: { white: waitingPlayer.id, black: socket.id },
            whiteTime: 30,
            blackTime: 30,
            timer: null,
        };

        // Join both players to the same room
        waitingPlayer.join(gameId);
        socket.join(gameId);

        // Notify roles
        waitingPlayer.emit("playerRole", { role: "w", gameId });
        socket.emit("playerRole", { role: "b", gameId });

        // Start the game, send role to each player
        waitingPlayer.emit("gameStart", {
            fen: games[gameId].chess.fen(),
            role: "w",
        });
        socket.emit("gameStart", { fen: games[gameId].chess.fen(), role: "b" });
        io.to(gameId).emit("timerUpdate", {
            whiteTime: games[gameId].whiteTime,
            blackTime: games[gameId].blackTime,
        });

        startTimer(gameId);
        waitingPlayer = null; // reset waiting
    }

    // Handle moves
    socket.on("move", ({ move, gameId }) => {
        const game = games[gameId];
        if (!game) return;

        const { chess, players } = game;

        // Check turn
        if (chess.turn() === "w" && socket.id !== players.white) return;
        if (chess.turn() === "b" && socket.id !== players.black) return;

        try {
            const result = chess.move(move);

            if (result) {
                // reset timer for current side
                if (chess.turn() === "w") game.whiteTime = 30;
                else game.blackTime = 30;

                io.to(gameId).emit("move", result);
                io.to(gameId).emit("boardState", chess.fen());
                io.to(gameId).emit("timerUpdate", {
                    whiteTime: game.whiteTime,
                    blackTime: game.blackTime,
                });

                startTimer(gameId);
            } else {
                // chess.js returns null if move not valid
                console.log("Invalid move attempted:", move);
                socket.emit("invalidMove", move);
            }
        } catch (err) {
            console.error("Error in move:", err.message, move);
            socket.emit("invalidMove", move);
        }
    });
    socket.on("requestBoardState", ({ gameId }) => {
        const game = games[gameId];
        if (game) {
            socket.emit("boardState", game.chess.fen());
        }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);

        // If player was waiting, just clear
        if (waitingPlayer && waitingPlayer.id === socket.id) {
            waitingPlayer = null;
            return;
        }

        // Otherwise find game this player was in
        for (let gameId in games) {
            const game = games[gameId];
            if (
                game.players.white === socket.id ||
                game.players.black === socket.id
            ) {
                const winner = game.players.white === socket.id ? "b" : "w";
                io.to(gameId).emit("gameOver", {
                    winner,
                    reason: "Opponent left the match",
                });
                stopTimer(gameId);
                delete games[gameId];
                break;
            }
        }
    });
});

function startTimer(gameId) {
    const game = games[gameId];
    if (!game) return;

    clearInterval(game.timer);
    game.timer = setInterval(() => {
        if (game.chess.turn() === "w") game.whiteTime--;
        else game.blackTime--;

        io.to(gameId).emit("timerUpdate", {
            whiteTime: game.whiteTime,
            blackTime: game.blackTime,
        });

        if (game.whiteTime <= 0) {
            io.to(gameId).emit("gameOver", {
                winner: "b",
                reason: "⏰ White ran out of time",
            });
            stopTimer(gameId);
            delete games[gameId];
        }
        if (game.blackTime <= 0) {
            io.to(gameId).emit("gameOver", {
                winner: "w",
                reason: "⏰ Black ran out of time",
            });
            stopTimer(gameId);
            delete games[gameId];
        }
    }, 1000);
}

function stopTimer(gameId) {
    const game = games[gameId];
    if (game && game.timer) clearInterval(game.timer);
}

server.listen(3000, () => {
    console.log("Server is running on port 3000");
});
