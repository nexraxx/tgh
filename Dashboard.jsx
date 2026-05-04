import { useEffect, useState } from "react";
import axios from "axios";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [guilds, setGuilds] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:3000/api/user", { withCredentials: true })
      .then(r => setUser(r.data));

    axios.get("http://localhost:3000/api/guilds", { withCredentials: true })
      .then(r => setGuilds(r.data));
  }, []);

  if (!user) return <div style={{ color: "white" }}>Loading...</div>;

  return (
    <div style={styles.page}>
      <h2>Welcome {user.username}</h2>

      <div style={styles.grid}>
        {guilds.map(g => (
          <div key={g.id} style={styles.card}>
            <h3>{g.name}</h3>

            <a href={`/server/${g.id}`}>
              <button style={styles.button}>Manage</button>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  page: {
    padding: 30,
    background: "#0f0f0f",
    minHeight: "100vh",
    color: "white",
    fontFamily: "Arial"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 20
  },
  card: {
    background: "#1a1a1a",
    padding: 20,
    borderRadius: 12
  },
  button: {
    marginTop: 10,
    padding: 8,
    background: "#3ba55c",
    border: "none",
    color: "white",
    borderRadius: 6
  }
};