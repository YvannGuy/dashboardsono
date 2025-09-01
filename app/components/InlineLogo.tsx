'use client';

interface InlineLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function InlineLogo({ size = 'md', className = '' }: InlineLogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Icon */}
      <div className="relative">
        <div className={`${sizeClasses[size]} bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center border-2 border-gray-800 shadow-lg`}>
          <svg 
            width={size === 'sm' ? 16 : size === 'md' ? 20 : size === 'lg' ? 24 : 28} 
            height={size === 'sm' ? 16 : size === 'md' ? 20 : size === 'lg' ? 24 : 28} 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-sm"
          >
            <path 
              d="M9 6 L9 18 M9 9 L4.5 6 L4.5 18 L9 15 M9 12 L12 10.5 L12 13.5 L9 12" 
              stroke="white" 
              strokeWidth="2" 
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
      
      {/* Text */}
      <div className="flex flex-col">
        <span className={`${textSizes[size]} font-bold text-gray-900 leading-none tracking-tight`}>
          Sound
        </span>
        <span className={`${textSizes[size]} font-bold text-orange-600 leading-none tracking-tight`}>
          Rent
        </span>
      </div>
    </div>
  );
}
