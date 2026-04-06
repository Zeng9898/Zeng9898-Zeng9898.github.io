import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import ArgumentChatPage from './pages/ArgumentChatPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/home"
        element={(
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/chat"
        element={(
          <ProtectedRoute>
            <ArgumentChatPage />
          </ProtectedRoute>
        )}
      />
    </Routes>
  );
}

export default App;
