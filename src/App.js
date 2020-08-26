import React from "react";
import Auth from "./auth";
import "./App.css";

const auth = new Auth();

function App() {
  const [loggedIn, setLoggedIn] = React.useState(false);
  const getToken = () => {
    return auth
      .fetchServiceConfiguration()
      .then(() => auth.makeTokenRequest())
      .then(() => {
        const hasToken = auth.hasToken();

        if (loggedIn !== hasToken) {
          setLoggedIn(hasToken);
        }
      });
  };
  const checkToken = () => {
    const hasToken = auth.hasToken();

    if (loggedIn !== hasToken) {
      setLoggedIn(hasToken);
    }
  };
  const signIn = (username) => {
    return auth
      .fetchServiceConfiguration()
      .then(() => auth.makeAuthorizationRequest(username));
  };
  const signOut = () => {
    auth
      .fetchServiceConfiguration()
      .then(() => auth.signOut())
      .then(() => {
        setLoggedIn(false);
      });
  };
  const forceSignIn = false;

  React.useEffect(() => {
    auth.checkForAuthorizationResponse().then(() => {
      if (auth.isAuthorizedUser()) {
        getToken();
      } else {
        if (forceSignIn) {
          signIn();
        }
      }
    });
  }, []);

  return (
    <div className="App">
      <button onClick={() => signIn()}>Login</button>
      <button onClick={() => signOut()}>Logout</button>
      <div className="profile">
        <div>
          <strong>Logged In</strong>: {loggedIn ? "True" : "False"}
        </div>
      </div>
      <button onClick={() => getToken()}>Get Token</button>
      <button onClick={() => checkToken()}>Check Token</button>
    </div>
  );
}

export default App;
