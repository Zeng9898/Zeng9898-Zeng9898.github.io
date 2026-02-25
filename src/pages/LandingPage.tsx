import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import FooterBar from '../components/FooterBar';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FEFDF3]">
      <Navbar />
      <main className="flex-1 flex flex-col justify-center">
        <Hero />
      </main>
      <FooterBar />
    </div>
  );
}
