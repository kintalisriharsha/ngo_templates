// eslint-disable-next-line no-unused-vars
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./components/login";
import Register from "./components/register";
import Dashboard from "./components/Dashboard";
import TemplateEditor from "./components/TempleteEditor";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRouter";
import Templates from "./components/Templates";

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/editor/:templateId" element={<TemplateEditor />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route 
                path="/templates" 
                element={
                  <ProtectedRoute>
                    <Templates />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </div>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;