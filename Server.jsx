import { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

export default function Server() {
  const { id } = useParams();
  const [config, setConfig] = useState({});

  useEffect(() => {
    axios.get(`http://localhost:3000/api/config/${id}`, { withCredentials: true })
      .then(r => setConfig(r.data));
  }, [id]);

  const save = async () => {
    await axios.post(
      `http://localhost:3000/api/config/${id}`,
      config,
      { withCredentials: true }
    );
    alert("Saved!");
  };

  return (
    <div style={styles.page}>
      <h2>Server Config</h2>

      <input
        placeholder="Ticket Category ID"
        value={config.ticketCategory || ""}
        onChange={e => setConfig({ ...config, ticketCategory: e.target.value })}
        style={styles.input}
      />

      <input
        placeholder="Staff Role ID"
        value={config.staffRole || ""}
        onChange={e => setConfig({ ...config, staffRole: e.target.value })}
        style={styles.input}
      />

      <input
        placeholder="Transcript Channel ID"
        value={config.transcriptChannel || ""}
        onChange={e => setConfig({ ...config, transcriptChannel: e.target.value })}
        style={styles.input}
      />

      <button onClick={save} style={styles.button}>
        Save
      </button>
    </div>
  );
}

const styles = {
  page: {
    padding: 30,
    background: "#0f0f0f",
    minHeight: "100vh",
    color: "white"
  },
  input: {
    display: "block",
    margin: "10px 0",
    padding: 10,
    width: 300,
    borderRadius: 6,
    border: "none"
  },
  button: {
    padding: 10,
    background: "#5865F2",
    border: "none",
    color: "white",
    borderRadius: 6
  }
};