# ♟️ Real-Time Chess Game

A web-based, real-time multiplayer chess application built with Node.js, Express, and Socket.IO. Challenge your friends to a game of chess, or watch others play in spectator mode.

> This project is a demonstration of building a full-stack real-time application with a focus on a clean user interface and a responsive experience.

## ✨ Features

-   **Real-Time Multiplayer**: Play chess with another person in real-time.
-   **Waiting Room**: Players are placed in a waiting room until an opponent connects.
-   **Spectator Mode**: Others can join the game as spectators and watch the match live.
-   **Move Validation**: All moves are validated on the server-side using the `chess.js` library.
-   **Turn-Based Timers**: Each player has a 30-second timer for their turn.
-   **Game Over Conditions**: The game ends on checkmate, timeout, or if a player disconnects.
-   **Interactive UI**:
    -   Drag-and-drop piece movement.
    -   Click-to-move functionality.
    -   Highlighting of possible moves.
    -   Highlighting of the last move made.
-   **Flippable Board**: The board automatically flips for the black player.
-   **Responsive Design**: The UI is designed to work on different screen sizes.

## 🔧 How It Works

The application uses a client-server architecture:

-   **Server (`app.js`)**: A Node.js server using the Express framework. It handles HTTP requests, serves the web pages, and manages the real-time communication using Socket.IO. The server maintains the state of the chess game, validates moves, and broadcasts updates to all connected clients.

-   **Client (`chessGame.js`)**: The client-side JavaScript connects to the server using Socket.IO. It renders the chessboard, handles user input (piece movement), and updates the UI based on events received from the server.

-   **Real-Time Communication**: Socket.IO is used for bidirectional communication between the client and the server. When a player makes a move, it is sent to the server. The server validates the move, updates the game state, and then broadcasts the new state to all clients (both players and spectators).

## 🛠️ Tech Stack

-   **Backend**:
    -   ![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
    -   ![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
    -   ![Socket.IO](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)
-   **Frontend**:
    -   ![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
    -   ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
    -   ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
    -   ![EJS](https://img.shields.io/badge/EJS-9B59B6?style=for-the-badge&logo=ejs&logoColor=white)
-   **Chess Logic**:
    -   [chess.js](https://github.com/jhlywa/chess.js)

## 📂 Project Structure

```
chess-newc/
├── app.js                # Main application file (server)
├── package.json          # Project metadata and dependencies
├── package-lock.json
├── public/
│   ├── css/              # Stylesheets
│   └── js/
│       └── chessGame.js  # Client-side logic
└── views/
    └── index.ejs         # Main view template
```

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine.

### Prerequisites

You need to have [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/) installed on your machine.

### Installation & Running

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/chess-newc.git
    cd chess-newc
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start the server:**
    ```bash
    npm start
    ```

4.  The application will be running at `http://localhost:3000`.

## 🎮 Gameplay

1.  Open your web browser and navigate to `http://localhost:3000`.
2.  You will be in a waiting room.
3.  Open a second browser tab or window and navigate to the same URL.
4.  The game will start automatically. The first player is assigned the white pieces, and the second player is assigned the black pieces.
5.  Any other users who navigate to the URL will be able to spectate the game.
6.  Players can move pieces by either dragging and dropping them or by clicking on a piece and then clicking on a destination square.

## 🙋‍♂️ Author

**Simerdeep Singh Gandhi**

- Portfolio: [https://simerdeep-portfolio.vercel.app/](https://simerdeep-portfolio.vercel.app/)
- GitHub: [@SimerdeepSingh4](https://github.com/SimerdeepSingh4)
- LinkedIn: [Simerdeep Singh Gandhi](https://www.linkedin.com/in/simerdeep-singh-gandhi-5569a7279/)

---

## ✨ Show Your Support

Give a ⭐️ if this project helped you!