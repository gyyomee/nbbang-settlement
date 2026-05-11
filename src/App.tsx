import { BrowserRouter, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import InvalidSettlementPage from "./pages/InvalidSettlementPage";
import SettlementPage from "./pages/SettlementPage";

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/settlements/:settlementCode" element={<SettlementPage />} />
        <Route path="*" element={<InvalidSettlementPage />} />
      </Routes>
    </BrowserRouter>
  );
}
