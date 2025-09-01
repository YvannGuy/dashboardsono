'use client';

import { useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackText?: string;
  fallbackIcon?: string;
}

export default function OptimizedImage({ 
  src, 
  alt, 
  className = '', 
  fallbackText = 'Image',
  fallbackIcon = 'ri-image-line'
}: OptimizedImageProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleError = () => {
    console.warn(`Erreur de chargement de l'image: ${src}`);
    setImageError(true);
  };

  const handleLoad = () => {
    setImageLoaded(true);
  };

  if (imageError) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
        <div className="text-center">
          <i className={`${fallbackIcon} text-4xl text-gray-400 mb-2`}></i>
          <p className="text-sm text-gray-500">{fallbackText}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <img
        src={src}
        alt={alt}
        className={`${className} ${imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        onError={handleError}
        onLoad={handleLoad}
        style={{
          display: 'block',
          maxWidth: '100%',
          height: 'auto'
        }}
      />
      {!imageLoaded && !imageError && (
        <div className={`absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      )}
    </div>
  );
}
