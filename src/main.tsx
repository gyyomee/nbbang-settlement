import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeKakaoSdk } from "./utils/kakao";

initializeKakaoSdk().catch((error) => {
  console.warn("Kakao SDK initialization failed:", error);
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
