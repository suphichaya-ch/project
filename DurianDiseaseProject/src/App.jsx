import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ให้หน้าแรก Redirect ไปที่ /login หรือจะเปิด <Login /> ตรงๆ ก็ได้ */}
        <Route path="/" element={<Login />} />

        {/* เพิ่ม Route นี้เข้ามาครับ */}
        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
