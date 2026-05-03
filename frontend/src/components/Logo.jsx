import React from 'react';
import { motion } from 'framer-motion';

const Logo = ({ size = 40 }) => {
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.svg 
        viewBox="0 0 100 100" 
        width={size} 
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="shield-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Futuristic Shield Shape */}
        <motion.path 
          d="M50 10 L15 25 V50 C15 75 50 90 50 90 C50 90 85 75 85 50 V25 L50 10Z" 
          stroke="url(#shield-grad)" 
          strokeWidth="4"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />

        {/* Inner Pulsing Core */}
        <motion.circle 
          cx="50" cy="45" r="12" 
          fill="url(#shield-grad)"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.4, 0.8, 0.4]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          style={{ filter: 'url(#glow)' }}
        />

        {/* Horizontal Scan Line */}
        <motion.rect 
          x="20" y="20" width="60" height="2" 
          fill="white"
          initial={{ y: 20, opacity: 0 }}
          animate={{ 
            y: [20, 80, 20],
            opacity: [0, 0.8, 0]
          }}
          transition={{ 
            duration: 2.5, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          style={{ filter: 'url(#glow)' }}
        />

        {/* Binary Bits (Abstract) */}
        <motion.circle cx="35" cy="55" r="3" fill="var(--accent-secondary)" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }} />
        <motion.circle cx="65" cy="40" r="3" fill="var(--accent-primary)" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }} />
        <motion.circle cx="50" cy="70" r="3" fill="white" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.8, repeat: Infinity, delay: 0.8 }} />
      </motion.svg>
    </div>
  );
};

export default Logo;
