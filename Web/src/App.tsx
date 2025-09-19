import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import AdminPage from './pages/AdminPage'
import VotePage from './pages/VotePage'
import ProtectedRoute from './routes/ProtectedRoute'

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomePage />} />

                <Route element={<ProtectedRoute />}>
                    <Route path="/admin" element={<AdminPage />} />
                </Route>

                <Route path="/vote/:voteId" element={<VotePage />} />
                <Route path="*" element={<HomePage />} />
            </Routes>
        </BrowserRouter>
    )
}
