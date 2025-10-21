import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-gray-800/70 backdrop-blur-sm shadow-lg z-20 p-4 text-center">
      <div className="container mx-auto">
        <div className="flex items-center justify-center gap-3">
          <div>
            <h1 className="text-4xl font-bold tracking-wider text-cyan-300 text-glow">SSS TV</h1>
            <p className="text-sm text-gray-400 tracking-widest">by Rana Shakir</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;