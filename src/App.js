import React from "react";
import "./App.css";

function App() {
  const name = "";
  const status = "Not Logged In";

  return (
    <div className="App">
      <button onClick={() => null}>Login</button>
      <button onClick={() => null}>Logout</button>
      <div className="profile">
        <div>
          <strong>Status</strong>: {status}
        </div>
        <div>
          <strong>Name</strong>: {name}
        </div>
      </div>
    </div>
  );
}

export default App;
