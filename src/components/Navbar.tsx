import logoImage from '../assets/logo.png';

export default function Navbar() {
  return (
    <header className="w-full border-b border-gray-200">
      <nav className="flex items-center justify-between max-w-5xl mx-auto px-4 py-6">
        <img src={logoImage} alt="My Argument Lab" className="h-23 w-auto object-contain" />
        <div />
      </nav>
    </header>
  );
}
