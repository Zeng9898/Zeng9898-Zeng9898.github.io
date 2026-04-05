import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import ArgumentChatPage from './pages/ArgumentChatPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/chat" element={<ArgumentChatPage />} />
    </Routes>
  );
}

export default App;
