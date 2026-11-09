import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

// Offline support when served from a real origin. On a single-file preview there is no sw.js; the rejection is ignored.
if (import.meta.env.PROD && "serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
