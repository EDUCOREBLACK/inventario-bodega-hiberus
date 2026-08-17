import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const allowLocalDev = import.meta.env.DEV || import.meta.env.VITE_DEV_MODE === 'true';

  if (!token && !allowLocalDev) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default ProtectedRoute;
