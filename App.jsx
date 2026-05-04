import { Routes, Route, useNavigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Server from "./pages/Server";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/server/:id" element={<Server />} />
    </Routes>
  );
}

function Login() {
  return (
    <div style={styles.center}>
      <h1>Ticket Aid Dashboard</h1>
      <a href="http://localhost:3000/auth/discord">
        <button style={styles.button}>Login with Discord</button>
      </a>
    </div>
  );
}

const styles = {
  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginTop: 200,
    fontFamily: "Arial"
  },
  button: {
    padding: 12,
    background: "#5865F2",
    border: "none",
    color: "white",
    borderRadius: 8
  }
};