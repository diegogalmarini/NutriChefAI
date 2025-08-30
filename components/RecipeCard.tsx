
import React, { useState } from 'react';
import type { Recipe } from '../types';
import jsPDF from 'jspdf';
import DifficultyMeter from './DifficultyMeter';

const ImagePlaceholder = () => (
    <div className="w-full h-64 bg-slate-200 flex items-center justify-center animate-pulse">
        <svg className="w-12 h-12 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    </div>
);

// Icons for the web view
const ServingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zm-1.518 6.025A5.002 5.002 0 0111 15a5 5 0 01-5.482-3.975C3.024 11.455 2 12.834 2 14.5V16h9v-1.5c0-1.666-1.024-3.045-2.518-3.475zM16 6a3 3 0 11-6 0 3 3 0 016 0zm-2.482 5.025C11.024 11.455 10 12.834 10 14.5V16h9v-1.5c0-1.666-1.024-3.045-2.518-3.475A5.002 5.002 0 0115 15a5 5 0 01-1.482-3.975z" /></svg>;
const PrepIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>;
const CookIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45.385c-.345.87-.698 1.766-.96 2.654-.261.887-.495 1.724-.678 2.481A4.5 4.5 0 005.5 13.5V15a1 1 0 001 1h8a1 1 0 001-1v-1.5a4.5 4.5 0 00-3.105-4.265c-.183-.757-.417-1.594-.678-2.481-.262-.888-.615-1.784-.96-2.654a1 1 0 00-1.45-.385z" clipRule="evenodd" />
    </svg>
);
const CaloriesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
    </svg>
);

// Helper function to fetch an image and convert it to a Base64 Data URL.
// This is crucial because jsPDF needs the complete image data before it can be added to the PDF.
// Attempting to use a direct URL can lead to errors if the image hasn't fully downloaded.
const urlToDataUrl = (url: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    // This is important for fetching images from other domains (like a CDN) without CORS issues.
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Failed to get canvas context'));
      }
      ctx.drawImage(img, 0, 0);
      // Convert the canvas content to a Data URL (Base64 encoded).
      // We use 'image/jpeg' as specified in the image generation service.
      resolve(canvas.toDataURL('image/jpeg'));
    };
    img.onerror = () => {
      reject(new Error(`Failed to load image from url: ${url}`));
    };
    img.src = url;
  });

interface RecipeCardProps {
    recipe: Recipe;
    language: 'en' | 'es';
    onToggleFavorite: (recipe: Recipe) => void;
    isFavorite: boolean;
    onShare: (recipe: Recipe) => void;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, language, onToggleFavorite, isFavorite, onShare }) => {
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
    
    // The function is now async to allow 'await' for the image download.
    const handleDownloadPdf = async () => {
        setIsDownloadingPdf(true);
        try {
            const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

            // --- Configuration ---
            const pageW = doc.internal.pageSize.getWidth();
            const margin = 15;
            const contentW = pageW - margin * 2;
            let yPos = 0; // Start at 0, image is first

            // --- Colors & Fonts ---
            const primaryColor = '#22c55e'; // Green-500
            const textColorDark = '#1f2937'; // Slate-800
            const textColorMedium = '#6b7280'; // Slate-500
            const textColorLight = '#9ca3af'; // Slate-400
            const borderColor = '#e5e7eb'; // Slate-200
            const bgColor = '#f9fafb'; // Slate-50

            doc.setFont('helvetica');

            const addFooter = () => {
                const pageCount = doc.internal.pages.length;
                for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'italic');
                    doc.setTextColor(textColorLight);
                    doc.text('Generated by NutriChef', pageW / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
                }
            };

            // --- 1. Image (Asynchronous Loading) ---
            if (recipe.imageUrl) {
                try {
                    // We 'await' for the image to be fully loaded and converted to Base64.
                    // This is the core fix for the "corrupt file" error.
                    const imgData = await urlToDataUrl(recipe.imageUrl);
                    const imgH = 88;
                    doc.addImage(imgData, 'JPEG', 0, 0, pageW, imgH, undefined, 'FAST');
                    yPos = imgH + 12;
                } catch (e) { 
                    console.error("Could not add image to PDF", e);
                    yPos = margin; // fallback if image fails
                }
            } else {
                 yPos = margin;
            }

            // --- 2. Title & Description ---
            doc.setFontSize(26);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(textColorDark);
            const titleLines = doc.splitTextToSize(recipe.recipeName, contentW);
            doc.text(titleLines, pageW / 2, yPos, { align: 'center' });
            yPos += titleLines.length * 9 + 5;

            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(textColorMedium);
            const descriptionLines = doc.splitTextToSize(recipe.description, contentW - 10);
            doc.text(descriptionLines, pageW / 2, yPos, { align: 'center' });
            yPos += descriptionLines.length * 4.5 + 12;

            // --- 3. Meta Info Bar ---
            const iconSize = 5;
            const metaY = yPos;
            const metaItems = [
                { icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAKxJREFUSEvtlt0RgjAMhV82sJM4ijZxBE/gKN7CSXQSkzkCCzZJqEBBiv+BQt/78qF1+KNRn/FLBRADdoAicAZsgA/8wB+wAo7g8z/ACr6AKeAox/geAnY6gS3ABj77BdyAvgJOAm76AlwCVGCz/4DbwAngC+BCZr8CN4ATwCZgAsn8CrgBnACSABPY5FfAUUAioAowAdb+Ap4CsgJq/7P+BVwNdB74J9j/o6BT8U8AB2C1t3B+QOcjR94O6Nv2gPdv+E01/AJcAH/AZj8D514B/4A35fuC+/0PsNkH/P2fa/wBCc0yL8hL1hAAAAAASUVORK5CYII=', label: language === 'es' ? 'Raciones' : 'Servings', value: recipe.servings.toString() },
                { icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAANhJREFUSEvtlt0RgjAMhV82sJM4ijZxBE/gKN7CSXQSkzkCCzZJqEBBiv+BQp/35UNT1+BPof6FLwxSByyBE+AUeAWOwLwfYA+4Aoeg8z/Aij6BJ8ElzvE9BOx2AduAC3z2C7gC4AAnAc99AS4BOrDVP+AW4ATwBDiEzX4FbgFOAJsAE9jsV+AW4ASQCrCBDX4FPAUEAooAI7DtS+ApIC2g6r9tL4FXgU4D/wT7/xR0Kf4JYAGs9g7OD+h8xMjbAX3bPeD9C35TDX8CToA/YbOfgHOvgH/A2/J9wf3+D7DZd/z9X9f4A0sF8nUAAAAASUVORK5CYII=', label: 'Prep', value: recipe.prepTime },
                { icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAOpJREFUSEvtltsNwjAMRF82YAPGYANs0G5QGyQDaIM2gQ1gAxuIECX+U1IixonlU+lT3++9Azgb6vww/9YBHHASbAIvwBtwwxfgG7gFFuHzP4Bt/AAvgUcc42sI2PgEtgEb+Myv4BPgAZKA574AF4BU/w2/AS4AH4Av4DK/AQ/AE4AEwAQ4+RW4AjwDJAITWOAn4ClQEQAFMAJs/wM8BWQCqf5b/wI8CnQa+D/Y/2PQ5fgngAew2g38H9B5h5E3I/q2O8D7N/yvGv4BHIB/wGY/A879Av4Bb+T3Bff7H2CzD/j+X7P4A1w4MMhO5jV/AAAAAElFTkSuQmCC', label: 'Cook', value: recipe.cookTime },
                { icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAALhJREFUSEvtlt0NwjAMRV82YAO0wQawAWzQblA3SAbQAdoEG8AEsIEVIsU/SkrEkeLkU+lT3++9Azgb6vww/9YBHHASbAIvwBtwwxfgG7gFFuHzP4Bt/AAvgUcc42sI2PgEtgEb+Myv4BPgAZKA574AF4BU/w2/AS4AH4Av4DK/AQ/AE4AEwAQ4+RW4AjwDJAITWOAn4ClQEQAFMAJs/wM8BWQCqf5b/wI8CnQa+D/Y/2PQ5fgngAew2g38H9B5h5E3I/q2O8D7N/yvGv4BHIB/wGY/A879Av4Bb+T3Bff7H2CzD/j+X7P4A26wL2I5/5AAAAAASUVORK5CYII=', label: language === 'es' ? 'Calorías' : 'Calories', value: `~${recipe.calories} kcal` },
            ];

            const metaColWidth = contentW / 4;
            metaItems.forEach((item, index) => {
                const x = margin + (metaColWidth * index) + 3;
                doc.addImage(item.icon, 'PNG', x, metaY, iconSize, iconSize);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(textColorMedium);
                const text = `${item.label}:`;
                doc.text(text, x + iconSize + 2, metaY + (iconSize / 2) + 1.5);
                doc.setFont('helvetica', 'bold');
                doc.text(item.value, x + iconSize + 2 + doc.getTextWidth(text) + 1, metaY + (iconSize / 2) + 1.5);
            });
            yPos += iconSize + 8;
            doc.setDrawColor(borderColor);
            doc.line(margin, yPos, pageW - margin, yPos);
            yPos += 10;
            
            // --- 4. Nutrition & Difficulty ---
            if (recipe.nutrition) {
                doc.setFillColor(bgColor);
                doc.roundedRect(margin, yPos, contentW, 32, 3, 3, 'F');
                
                const nutritionColWidth = contentW / 3;
                const nutritionItems = [
                    { label: (language === 'es' ? 'PROTEÍNA' : 'PROTEIN'), value: recipe.nutrition.protein },
                    { label: 'CARBS', value: recipe.nutrition.carbs },
                    { label: (language === 'es' ? 'GRASAS' : 'FATS'), value: recipe.nutrition.fats },
                ];

                nutritionItems.forEach((item, index) => {
                    const x = margin + (nutritionColWidth * index) + (nutritionColWidth / 2);
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(textColorMedium);
                    doc.text(item.label, x, yPos + 10, { align: 'center' });

                    doc.setFontSize(20);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(textColorDark);
                    doc.text(item.value, x, yPos + 22, { align: 'center' });
                });
                yPos += 32 + 10;
            }

            // Difficulty Meter
            const difficultyMap: Record<string, number> = { 'Very Easy': 1, 'Easy': 2, 'Medium': 3, 'Hard': 4, 'Expert': 5 };
            const level = difficultyMap[recipe.difficulty] || 3;
            const difficultyTextMap: Record<string, Record<'en' | 'es', string>> = { 'Very Easy': {es: 'Muy Fácil', en: 'Very Easy'}, 'Easy': {es: 'Fácil', en: 'Easy'}, 'Medium': {es: 'Media', en: 'Medium'}, 'Hard': {es: 'Difícil', en: 'Hard'}, 'Expert': {es: 'Experta', en: 'Expert'} };
            const difficultyLabel = (difficultyTextMap[recipe.difficulty] || difficultyTextMap['Medium'])[language];
            
            const difficultyY = yPos;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(textColorMedium);
            doc.text(language === 'es' ? 'Dificultad' : 'Difficulty', margin, difficultyY + 3.5);
            doc.setFont('helvetica', 'bold')
            doc.text(difficultyLabel, pageW - margin, difficultyY + 3.5, { align: 'right' });
            
            const barAreaWidth = contentW / 2;
            const barAreaX = margin + (contentW - barAreaWidth);
            const barWidth = (barAreaWidth - (4 * 2)) / 5;
            for (let i = 0; i < 5; i++) {
                const barX = barAreaX + i * (barWidth + 2);
                doc.setFillColor(i < level ? primaryColor : borderColor);
                doc.roundedRect(barX - barWidth - 2, difficultyY, barWidth, 5, 2.5, 2.5, 'F');
            }
            yPos += 12;

            // --- 5. Ingredients & Instructions ---
            const columnsStartY = yPos;
            const gutter = 10;
            const colWidth = (contentW - gutter) / 2;
            const col1X = margin;
            const col2X = margin + colWidth + gutter;

            let leftY = columnsStartY, rightY = columnsStartY;

            // Column 1: Ingredients
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(textColorDark);
            doc.text(language === 'es' ? 'Ingredientes' : 'Ingredients', col1X, leftY);
            leftY += 8;
            doc.setDrawColor(borderColor);
            doc.line(col1X, leftY - 4, col1X + colWidth, leftY-4);


            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(textColorMedium);
            doc.setLineHeightFactor(1.5);
            recipe.ingredients.forEach(ing => {
                const stapleText = ing.isStaple ? (language === 'es' ? ' (sugerido)' : ' (suggested)') : '';
                const ingText = `• ${ing.quantity} ${ing.name}${stapleText}`;
                const ingLines = doc.splitTextToSize(ingText, colWidth);
                if (leftY + ingLines.length * 4.5 > doc.internal.pageSize.getHeight() - 25) {
                    doc.addPage();
                    leftY = margin;
                    rightY = margin;
                };
                doc.text(ingLines, col1X, leftY);
                leftY += ingLines.length * 4 * 1.5;
            });

            // Column 2: Instructions
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(textColorDark);
            doc.text(language === 'es' ? 'Instrucciones' : 'Instructions', col2X, rightY);
            rightY += 8;
            doc.setDrawColor(borderColor);
            doc.line(col2X, rightY-4, col2X + colWidth, rightY-4);
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(textColorMedium);
            recipe.instructions.forEach((step, index) => {
                const stepText = `${index + 1}. ${step}`;
                const stepLines = doc.splitTextToSize(stepText, colWidth);
                 if (rightY + (stepLines.length * 4 * 1.5) > doc.internal.pageSize.getHeight() - 25) {
                    doc.addPage();
                    rightY = margin;
                    leftY = margin;
                 };
                doc.text(stepLines, col2X, rightY);
                rightY += (stepLines.length * 4 * 1.5) + 3;
            });
            doc.setLineHeightFactor(1.0);
            
            yPos = Math.max(leftY, rightY) + 10;

            // --- 6. Health Tip ---
            if (recipe.healthTip && yPos < doc.internal.pageSize.getHeight() - 40) {
                const tipTitle = language === 'es' ? 'Consejo Saludable' : 'Healthy Tip';
                
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setLineHeightFactor(1.4);
                const tipLines = doc.splitTextToSize(recipe.healthTip, contentW - 20);
                const tipBoxHeight = tipLines.length * 4 * 1.4 + 20;

                doc.setFillColor('#f0fdf4');
                doc.setDrawColor('#a7f3d0');
                doc.roundedRect(margin, yPos, contentW, tipBoxHeight, 3, 3, 'FD');
                
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(primaryColor);
                doc.text(tipTitle, margin + 10, yPos + 10);
                
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(textColorMedium);
                doc.text(tipLines, margin + 10, yPos + 20);
                doc.setLineHeightFactor(1.0);
            }

            addFooter();
            doc.save(`${recipe.recipeName.replace(/\s+/g, '_').toLowerCase()}.pdf`);
        } catch (error) {
            console.error("Failed to generate PDF:", error);
            // Optionally, show an error message to the user
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    return (
        <div className="relative bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-t-4 border-green-500">
            <button
                onClick={() => onToggleFavorite(recipe)}
                className="absolute top-4 right-4 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full text-red-500 hover:bg-white transition-colors duration-200"
                aria-label={isFavorite ? (language === 'es' ? 'Quitar de favoritos' : 'Remove from favorites') : (language === 'es' ? 'Añadir a favoritos' : 'Add to favorites')}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
            </button>

            {recipe.imageUrl ? <img src={recipe.imageUrl} alt={recipe.recipeName} className="w-full h-64 object-cover" /> : <ImagePlaceholder />}

            <div className="p-6">
                <h3 className="text-2xl font-bold text-slate-800 mb-2">{recipe.recipeName}</h3>
                <p className="text-slate-600 mb-6 text-sm">{recipe.description}</p>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm text-slate-700 mb-6">
                    <div className="flex items-center gap-2"><ServingsIcon /> <div><strong>{language === 'es' ? 'Raciones' : 'Servings'}:</strong> {recipe.servings}</div></div>
                    <div className="flex items-center gap-2"><PrepIcon /> <div><strong>Prep:</strong> {recipe.prepTime}</div></div>
                    <div className="flex items-center gap-2"><CookIcon /> <div><strong>Cook:</strong> {recipe.cookTime}</div></div>
                    <div className="flex items-center gap-2"><CaloriesIcon /> <div><strong>{language === 'es' ? 'Calorías' : 'Calories'}:</strong> ~{recipe.calories}</div></div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg mb-6">
                    <div className="grid grid-cols-3 text-center">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{language === 'es' ? 'PROTEÍNA' : 'PROTEIN'}</p>
                            <p className="text-xl font-bold text-green-600">{recipe.nutrition?.protein}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">CARBS</p>
                            <p className="text-xl font-bold text-green-600">{recipe.nutrition?.carbs}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{language === 'es' ? 'GRASAS' : 'FATS'}</p>
                            <p className="text-xl font-bold text-green-600">{recipe.nutrition?.fats}</p>
                        </div>
                    </div>
                </div>

                <DifficultyMeter difficulty={recipe.difficulty} language={language}/>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 mt-6">
                    <div>
                        <h4 className="text-lg font-semibold text-slate-700 mb-3 border-b-2 border-green-200 pb-2">{language === 'es' ? 'Ingredientes' : 'Ingredients'}</h4>
                        <ul className="list-disc list-inside space-y-2 text-slate-600 text-sm">
                            {recipe.ingredients.map((ing, i) => (
                                <li key={i}>
                                    <span className="font-medium">{ing.quantity}</span> {ing.name}
                                    {ing.isStaple && <em className="text-xs text-slate-500"> ({language === 'es' ? 'sugerido' : 'suggested'})</em>}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="mt-6 md:mt-0">
                        <h4 className="text-lg font-semibold text-slate-700 mb-3 border-b-2 border-green-200 pb-2">{language === 'es' ? 'Instrucciones' : 'Instructions'}</h4>
                        <ol className="list-decimal list-inside space-y-3 text-slate-600 text-sm">
                            {recipe.instructions.map((step, i) => (
                                <li key={i}>{step}</li>
                            ))}
                        </ol>
                    </div>
                </div>
                
                {recipe.healthTip && (
                    <div className="mt-8 bg-green-50 border-l-4 border-green-400 text-green-800 p-4 rounded-r-lg">
                        <p className="font-bold text-sm">{language === 'es' ? 'Consejo Saludable' : 'Healthy Tip'}</p>
                        <p className="text-sm italic">{recipe.healthTip}</p>
                    </div>
                )}
            </div>
             <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                <button 
                    onClick={() => onShare(recipe)}
                    className="p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-700 rounded-full transition-colors"
                    aria-label={language === 'es' ? 'Compartir receta' : 'Share recipe'}
                >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                    </svg>
                </button>
                <button 
                    onClick={handleDownloadPdf}
                    disabled={isDownloadingPdf}
                    className="p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-700 rounded-full transition-colors disabled:opacity-50 disabled:cursor-wait"
                    aria-label={language === 'es' ? 'Descargar PDF' : 'Download PDF'}
                >
                    {isDownloadingPdf ? (
                         <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" />
                       </svg>
                    )}
                </button>
            </div>
        </div>
    );
};

export default RecipeCard;
