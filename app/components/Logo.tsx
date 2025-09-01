'use client';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ className = '', size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-8 w-auto',
    md: 'h-12 w-auto',
    lg: 'h-16 w-auto'
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Icon */}
      <div className="relative">
        <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center border-2 border-gray-800">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 4 L6 12 M6 6 L3 4 L3 12 L6 10 M6 8 L8 7 L8 9 L6 8" 
                  stroke="white" strokeWidth="1.5" fill="none"/>
          </svg>
        </div>
      </div>
      
      {/* Text */}
      <div className="flex flex-col">
        <span className="text-xl font-bold text-gray-900 leading-none">Sound</span>
        <span className="text-xl font-bold text-orange-600 leading-none">Rent</span>
      </div>
    </div>
  );
}
