import React from "react";
import "./_App.css";
import Leaderboard from "./components/Leaderboard/Leaderboard.tsx";

function App() {
  return (
    <div className="App">
      <header className="App-header">
        {/* Remove the logo and other unnecessary elements */}
      </header>

      <Leaderboard />
    </div>
  );
}

export default App;
