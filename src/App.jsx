import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CaseProvider } from './context/CaseContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CasePool from './pages/CasePool';
import Worklist from './pages/Worklist';
import CaseDetail from './pages/CaseDetail';

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <CaseProvider>
                    <Routes>
                        <Route path="/login" element={<Login />} />

                        <Route element={<ProtectedRoute allowedRoles={['admin', 'agency']} />}>
                            <Route element={<Layout />}>
                                <Route path="/" element={<Dashboard />} />
                                {/* Placeholders for future phases */}
                                <Route path="/cases" element={<CasePool />} />
                                <Route path="/cases/:id" element={<CaseDetail />} />
                                <Route path="/worklist" element={<Worklist />} />
                                <Route path="/analytics" element={<div className="p-6 text-slate-500">Analytics Dashboard (Coming Phase 5)</div>} />
                            </Route>
                        </Route>

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </CaseProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
