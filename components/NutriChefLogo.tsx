import React from 'react';

/**
 * Renders the official NutriChef SVG logo.
 * The logo is a stylized leaf/drop shape with a cutout.
 */
const NutriChefLogo: React.FC = () => (
    <svg width="40" height="40" viewBox="0 0 100 100" fill="white" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="NutriChef logo">
        {/* This path creates the shape using three circular arcs and one cubic Bezier curve for the cutout. */}
        <path d="M50 100 A 50 50 0 0 1 0 50 A 50 50 0 0 1 50 0 A 50 50 0 0 1 100 50 C 100 75 75 100 50 100 Z" />
    </svg>
);

export default NutriChefLogo;
