export const keyframes = {
  shimmer: `
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `,
  fadeIn: `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `,
  pulse: `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
  `,
  growWidth: `
    @keyframes growWidth {
      from { width: 0%; }
    }
  `,
  countUp: `
    @keyframes countUp {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `,
} as const;

export const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #f0f0f0 25%, #e5e5e5 50%, #f0f0f0 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
  borderRadius: '0.5rem',
};

export const fadeInStyle = (delay = 0): React.CSSProperties => ({
  animation: `fadeIn 0.4s ease-out ${delay}s both`,
});

export const pulseStyle: React.CSSProperties = {
  animation: 'pulse 2s ease-in-out infinite',
};
