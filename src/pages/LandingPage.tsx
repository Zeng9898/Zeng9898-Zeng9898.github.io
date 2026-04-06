import { useState } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import FooterBar from '../components/FooterBar';
import LoginModal from '../components/LoginModal';

export default function LandingPage() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#FEFDF3]">
      <Navbar />
      <main className="flex-1 flex flex-col justify-center">
        <Hero onStartPractice={() => setIsLoginOpen(true)} />
      </main>
      <FooterBar />
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </div>
  );
}
