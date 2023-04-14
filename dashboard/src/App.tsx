import React from "react";
import "./_App.css";
import Leaderboard from "./components/Leaderboard/Leaderboard.tsx";

function App() {
  return (
    <div className="App">
      <header className="App-header">
        {"SHOW ME THE MONEY!"}
      </header>

      <Leaderboard />
    </div>
  );
}

export default App;
