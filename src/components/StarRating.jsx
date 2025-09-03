import React, { useState } from 'react';
import { Star } from 'lucide-react';

const StarRating = ({ 
  rating = 0, 
  reviewCount = 0, 
  size = 'md', 
  interactive = false, 
  onRatingChange = null,
  showReviewCount = true 
}) => {
  const [hoverRating, setHoverRating] = useState(0);
  const [currentRating, setCurrentRating] = useState(rating);

  const sizes = {
    sm: { star: 'h-3 w-3', text: 'text-xs', gap: 'space-x-0.5' },
    md: { star: 'h-4 w-4', text: 'text-sm', gap: 'space-x-1' },
    lg: { star: 'h-5 w-5', text: 'text-base', gap: 'space-x-1' },
    xl: { star: 'h-6 w-6', text: 'text-lg', gap: 'space-x-1' }
  };

  const sizeClasses = sizes[size] || sizes.md;

  const handleStarClick = (starValue) => {
    if (interactive) {
      setCurrentRating(starValue);
      if (onRatingChange) {
        onRatingChange(starValue);
      }
    }
  };

  const handleStarHover = (starValue) => {
    if (interactive) {
      setHoverRating(starValue);
    }
  };

  const handleMouseLeave = () => {
    if (interactive) {
      setHoverRating(0);
    }
  };

  const displayRating = interactive ? currentRating : rating;
  const activeRating = hoverRating || displayRating;

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const isFilled = i <= Math.floor(activeRating);
      const isHalfFilled = i === Math.ceil(activeRating) && activeRating % 1 !== 0;
      
      stars.push(
        <div
          key={i}
          className={`relative ${interactive ? 'cursor-pointer' : ''}`}
          onClick={() => handleStarClick(i)}
          onMouseEnter={() => handleStarHover(i)}
        >
          {/* Background star (empty) */}
          <Star 
            className={`${sizeClasses.star} text-gray-300 transition-colors duration-150`}
          />
          
          {/* Filled star overlay */}
          <div 
            className="absolute inset-0 overflow-hidden"
            style={{
              width: isFilled ? '100%' : isHalfFilled ? '50%' : '0%'
            }}
          >
            <Star 
              className={`${sizeClasses.star} transition-colors duration-150 ${
                interactive && hoverRating >= i 
                  ? 'text-yellow-400' 
                  : 'text-yellow-500'
              }`}
              fill="currentColor"
            />
          </div>
        </div>
      );
    }
    return stars;
  };

  return (
    <div 
      className={`flex items-center ${sizeClasses.gap}`}
      onMouseLeave={handleMouseLeave}
    >
      <div className={`flex items-center ${sizeClasses.gap}`}>
        {renderStars()}
      </div>
      
      {(displayRating > 0 || reviewCount > 0) && (
        <div className={`flex items-center space-x-1 ml-2 ${sizeClasses.text} text-gray-600`}>
          {displayRating > 0 && (
            <span className="font-medium">
              {displayRating.toFixed(1)}
            </span>
          )}
          {showReviewCount && reviewCount > 0 && (
            <span className="text-gray-500">
              ({reviewCount} review{reviewCount !== 1 ? 's' : ''})
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StarRating;
