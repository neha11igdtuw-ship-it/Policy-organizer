import { Navigate, Route, Routes } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { PolicyDetail } from "./pages/PolicyDetail";
import { Reminders } from "./pages/Reminders";
import { Review } from "./pages/Review";
import { Share } from "./pages/Share";
import { Upload } from "./pages/Upload";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/upload" element={<Upload />} />
      <Route path="/policies/:id/review" element={<Review />} />
      <Route path="/policies/:id" element={<PolicyDetail />} />
      <Route path="/reminders" element={<Reminders />} />
      <Route path="/share" element={<Share />} />
    </Routes>
  );
}
