import { createRoot } from "react-dom/client";

import App from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  // KAPLAY owns an imperative canvas; avoid React dev double-mounting it.
  <App />,
);
