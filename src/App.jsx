import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CaseProvider } from './context/CaseContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import PendingApproval from './pages/PendingApproval';
import ManageAgents from './pages/ManageAgents';
import Dashboard from './pages/Dashboard';
import CasePool from './pages/CasePool';
import Worklist from './pages/Worklist';
import CaseDetail from './pages/CaseDetail';

import AnalyticsDashboard from './pages/AnalyticsDashboard';

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <CaseProvider>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/pending" element={<PendingApproval />} />

                        <Route element={<ProtectedRoute allowedRoles={['admin', 'agent']} />}>
                            <Route element={<Layout />}>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/cases" element={<CasePool />} />
                                <Route path="/cases/:id" element={<CaseDetail />} />
                                <Route path="/worklist" element={<Worklist />} />
                                <Route path="/analytics" element={<AnalyticsDashboard />} />
                            </Route>
                        </Route>

                        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                            <Route element={<Layout />}>
                                <Route path="/admin" element={<ManageAgents />} />
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
