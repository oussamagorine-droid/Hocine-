import React, { useState, useEffect } from 'react';
import { getSmartProductImage, generateOfflineProductSvg } from '../utils/productImageUtils';

interface ProductImageProps {
  src?: string;
  alt: string;
  category?: string;
  className?: string;
  containerClassName?: string;
  onClick?: () => void;
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  category = '',
  className = 'w-full h-full object-contain',
  containerClassName = '',
  onClick,
}) => {
  const [imgSrc, setImgSrc] = useState<string>('');
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    setHasError(false);
    if (src && src.trim()) {
      setImgSrc(src.trim());
    } else {
      setImgSrc(getSmartProductImage(alt, category));
    }
  }, [src, alt, category]);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      // Fallback 1: Curated Smart Library image
      const fallbackUrl = getSmartProductImage(alt, category);
      if (fallbackUrl && fallbackUrl !== imgSrc) {
        setImgSrc(fallbackUrl);
      } else {
        // Fallback 2: Offline SVG Data URI
        setImgSrc(generateOfflineProductSvg(alt, category));
      }
    } else {
      // Final Fallback: Offline SVG Data URI
      setImgSrc(generateOfflineProductSvg(alt, category));
    }
  };

  return (
    <div
      className={`relative overflow-hidden flex items-center justify-center ${containerClassName}`}
      onClick={onClick}
    >
      <img
        src={imgSrc || generateOfflineProductSvg(alt, category)}
        alt={alt || 'صورة المنتج'}
        className={className}
        loading="lazy"
        onError={handleError}
      />
    </div>
  );
};
