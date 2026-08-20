import React, { useEffect } from 'react'
import { Routes, Route } from "react-router-dom"
import { Toaster } from 'react-hot-toast'
import Login from './pages/auth/Login.jsx'
import Register from './pages/auth/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Households from './pages/Households.jsx'
import BuildingFlats from './pages/BuildingFlats.jsx'
import ExternalDonors from './pages/ExternalDonors.jsx'
import Donations from './pages/Donations.jsx'
import Expenses from './pages/Expenses.jsx'
import Ledger from './pages/Ledger.jsx'
import Mahaprasad from './pages/Mahaprasad.jsx'
import Reports from './pages/Reports.jsx'
import BulkImport from './pages/BulkImport.jsx'
import Settings from './pages/Settings.jsx'
import ProtectedRoute from './components/guards/ProtectedRoute.jsx'
import ProtectedRouteAuth from './components/guards/ProtectedRouteAuth.jsx'

function App() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        * { font-family: 'Inter', sans-serif; box-sizing: border-box; }
        html, body, #root {
          height: 100%;
          margin: 0;
        }
      `}</style>
      
      {/* Toast Notifications System */}
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            fontSize: '13px',
            fontWeight: '600',
            borderRadius: '12px',
            background: '#1e293b',
            color: '#fff',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)'
          }
        }}
      />

      <Routes>
        {/* Auth Routes */}
        <Route 
          path='/login' 
          element={
            <ProtectedRouteAuth>
              <Login />
            </ProtectedRouteAuth>
          }
        />
        <Route 
          path='/register' 
          element={
            <ProtectedRouteAuth>
              <Register />
            </ProtectedRouteAuth>
          }
        />

        {/* Protected Dashboard Routes */}
        <Route 
          path='/' 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route 
          path='/households' 
          element={
            <ProtectedRoute>
              <Households />
            </ProtectedRoute>
          }
        />
        <Route 
          path='/building-flats' 
          element={
            <ProtectedRoute>
              <BuildingFlats />
            </ProtectedRoute>
          }
        />
        <Route 
          path='/external-donors' 
          element={
            <ProtectedRoute>
              <ExternalDonors />
            </ProtectedRoute>
          }
        />
        <Route 
          path='/donations' 
          element={
            <ProtectedRoute>
              <Donations />
            </ProtectedRoute>
          }
        />
        <Route 
          path='/expenses' 
          element={
            <ProtectedRoute>
              <Expenses />
            </ProtectedRoute>
          }
        />
        <Route 
          path='/ledger' 
          element={
            <ProtectedRoute>
              <Ledger />
            </ProtectedRoute>
          }
        />
        <Route 
          path='/mahaprasad' 
          element={
            <ProtectedRoute>
              <Mahaprasad />
            </ProtectedRoute>
          }
        />
        <Route 
          path='/reports' 
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route 
          path='/bulk-import' 
          element={
            <ProtectedRoute>
              <BulkImport />
            </ProtectedRoute>
          }
        />
        <Route 
          path='/settings' 
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  )
}

export default App