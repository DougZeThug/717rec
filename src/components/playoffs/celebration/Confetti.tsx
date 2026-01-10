import React, { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

interface ConfettiPiece {
  id: number;
  x: number;
  size: number;
  rotation: number;
  color: string;
  animationDuration: number;
  delay: number;
}

const colors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-red-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-amber-400',
  'bg-teal-400',
];

const Confetti: React.FC = () => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    // Generate confetti pieces
    const newPieces: ConfettiPiece[] = [];
    const pieceCount = 100;

    for (let i = 0; i < pieceCount; i++) {
      newPieces.push({
        id: i,
        x: Math.random() * 100,
        size: Math.random() * 0.6 + 0.4, // 0.4 to 1
        rotation: Math.random() * 360,
        color: colors[Math.floor(Math.random() * colors.length)],
        animationDuration: Math.random() * 3 + 2, // 2-5 seconds
        delay: Math.random() * 0.5, // 0-0.5s delay
      });
    }

    setPieces(newPieces);

    // Clean up after animation completes
    const timeout = setTimeout(() => {
      setPieces([]);
    }, 6000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className={cn('absolute w-2 h-6 opacity-80', piece.color)}
          style={{
            left: `${piece.x}%`,
            top: '-20px',
            transform: `scale(${piece.size}) rotate(${piece.rotation}deg)`,
            animation: `fall ${piece.animationDuration}s ease-in forwards`,
            animationDelay: `${piece.delay}s`,
          }}
        />
      ))}

      <style>
        {`
          @keyframes fall {
            0% {
              transform: translateY(0) rotate(${Math.random() * 360}deg);
              opacity: 1;
            }
            70% {
              opacity: 1;
            }
            100% {
              transform: translateY(100vh) rotate(${Math.random() * 720}deg);
              opacity: 0;
            }
          }
        `}
      </style>
    </div>
  );
};

export default Confetti;
