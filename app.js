const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");
const { title } = require("process");

const app = express();

const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();
let players = {};
let currentPlayer = "w";
let whiteTime = 30;
let blackTime = 30;
let timerInterval = null;


app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("index", { title: "Chess Game" });
});

io.on("connection", function (uniqueSocket) {
    console.log("New User Connected");

    if (!players.white) {
        players.white = uniqueSocket.id;
        uniqueSocket.emit("playerRole", "w");
        uniqueSocket.emit("waiting", "Waiting for another player to join...");
        console.log("White Player Connected");

        uniqueSocket.emit("waiting", "Waiting for opponent...");

    } else if (!players.black) {
        players.black = uniqueSocket.id;
        uniqueSocket.emit("playerRole", "b");
        console.log("Black Player Connected");

        whiteTime = 30;
        blackTime = 30;
        io.to(players.white).emit("gameStart", { role: "w" });
        io.to(players.black).emit("gameStart", { role: "b" });
        io.emit("boardState", chess.fen());
        io.emit("timerUpdate", { whiteTime, blackTime });

        startTimer();
    } else {
        uniqueSocket.emit("spectator");
        console.log("Spectator Connected");
    }

    uniqueSocket.on("disconnect", function () {
        if (uniqueSocket.id === players.white) {
            console.log("White Player Disconnected");
            io.to(players.black).emit("gameOver", { winner: "b", reason: "White left the match" });
            delete players.white;
            stopTimer();
        } else if (uniqueSocket.id === players.black) {
            console.log("Black Player Disconnected");
            io.to(players.white).emit("gameOver", { winner: "w", reason: "Black left the match" });
            delete players.black;
            stopTimer();
        }
    });

    uniqueSocket.on("move", (move) => {
        try {
            if (chess.turn() === 'w' && uniqueSocket.id !== players.white) return;
            if (chess.turn() === 'b' && uniqueSocket.id !== players.black) return;

            const result = chess.move(move);
            if (result) {
                currentPlayer = chess.turn();
                if (currentPlayer === "w") {
                    whiteTime = 30;   // reset white’s time
                } else {
                    blackTime = 30;   // reset black’s time
                }
                io.emit("move", move);
                io.emit("boardState", chess.fen());
                io.emit("timerUpdate", { whiteTime, blackTime }); // send new reset value
                startTimer(); // restart ticking for new player

            } else {
                console.log("Invalid Move: ", move);
                uniqueSocket.emit("invalidMove", move)
            }
        } catch (err) {
            console.log(err);
            uniqueSocket.emit("Invalid Move: ", move);
        }
    })

});

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (chess.turn() === "w") {
            whiteTime--;
        } else {
            blackTime--;
        }

        io.emit("timerUpdate", { whiteTime, blackTime });

        if (whiteTime <= 0) {
            io.emit("gameOver", { winner: "b", reason: "⏰ White ran out of time" });
            stopTimer();
        }
        if (blackTime <= 0) {
            io.emit("gameOver", { winner: "w", reason: "⏰ Black ran out of time" });
            stopTimer();
        }
    }, 1000);
}

function switchTimer() {
    startTimer();
}

function stopTimer() {
    clearInterval(timerInterval);
}


server.listen(3000, function () {
    console.log("Server is running on port 3000");
});

