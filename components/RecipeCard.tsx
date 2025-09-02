import React, { useState } from 'react';
import type { Recipe, ImageState } from '../types';
import jsPDF from 'jspdf';
import DifficultyMeter from './DifficultyMeter';

const localeStrings = {
    en: {
        imageFailed: "Image generation failed.",
        imageFailedQuota: "Image quota exceeded.",
        plating: "Plating your dish...",
        servings: 'Servings',
        calories: 'Calories',
        ingredients: 'Ingredients',
        instructions: 'Instructions',
        suggested: 'suggested',
        healthyTip: 'Healthy Tip',
        favorite: 'Favorite',
        share: 'Share',
        pdf: 'PDF',
        removeFromFavorites: 'Remove from favorites',
        addToFavorites: 'Add to favorites',
        shareRecipe: 'Share recipe',
        downloadPdf: 'Download PDF',
        protein: 'Protein',
        carbs: 'Carbs',
        fats: 'Fats',
        difficulty: 'Difficulty',
        cont: 'cont.',
    },
    es: {
        imageFailed: "Falló la generación de imagen.",
        imageFailedQuota: "Se excedió la cuota de imágenes.",
        plating: "Emplatando tu platillo...",
        servings: 'Raciones',
        calories: 'Calorías',
        ingredients: 'Ingredientes',
        instructions: 'Instrucciones',
        suggested: 'sugerido',
        healthyTip: 'Consejo Saludable',
        favorite: 'Favorito',
        share: 'Compartir',
        pdf: 'PDF',
        removeFromFavorites: 'Quitar de favoritos',
        addToFavorites: 'Añadir a favoritos',
        shareRecipe: 'Compartir receta',
        downloadPdf: 'Descargar PDF',
        protein: 'Proteína',
        carbs: 'Carbs',
        fats: 'Grasas',
        difficulty: 'Dificultad',
        cont: 'cont.',
    }
};

const ImagePlaceholder = ({ state, language }: { state: ImageState | undefined, language: 'en' | 'es' }) => {
    const t = localeStrings[language];
    
    let content;
    if (state === 'error' || state === 'error_quota') {
        const message = state === 'error_quota' ? t.imageFailedQuota : t.imageFailed;
        content = (
             <div className="flex flex-col items-center justify-center text-center p-4 h-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-400 mb-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-sm font-semibold text-slate-600">{message}</p>
            </div>
        );
    } else {
        content = (
             <div className="flex flex-col items-center justify-center text-center p-4 h-full">
                <svg className="animate-spin h-8 w-8 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-sm font-semibold text-slate-500 mt-2">{t.plating}</p>
             </div>
        );
    }
    
    return (
        <div className="w-full aspect-[16/9] bg-slate-100 flex items-center justify-center">
            {content}
        </div>
    );
};

const urlToDataUrl = (url: string): Promise<{ dataUrl: string; width: number; height: number; }> =>
  new Promise((resolve, reject) => {
    const img = new Image();
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
      resolve({
          dataUrl: canvas.toDataURL('image/jpeg', 0.9),
          width: img.naturalWidth,
          height: img.naturalHeight
      });
    };
    img.onerror = (err) => {
      reject(new Error(`Failed to load image from url: ${url}. Error: ${err}`));
    };
    img.src = url;
  });

const svgToPngDataUrl = (svgString: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        // Use btoa to handle SVG string correctly in data URL
        const svgDataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || 28;
            canvas.height = img.naturalHeight || 28;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("Could not get canvas context"));
                return;
            }
            ctx.drawImage(img, 0, 0);
            const pngDataUrl = canvas.toDataURL('image/png');
            resolve(pngDataUrl);
        };
        img.onerror = (err) => {
            reject(new Error(`Failed to load SVG for PDF conversion. Error: ${err}`));
        };
        img.src = svgDataUrl;
    });
};


interface RecipeCardProps {
    recipe: Recipe;
    language: 'en' | 'es';
    onToggleFavorite: (recipe: Recipe) => void;
    isFavorite: boolean;
    onShare: (recipe: Recipe) => void;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, language, onToggleFavorite, isFavorite, onShare }) => {
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
    const t = localeStrings[language];
    
    const handleDownloadPdf = async () => {
        setIsDownloadingPdf(true);
        try {
            const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            
            // --- DOCUMENT SETUP ---
            const PAGE_W = doc.internal.pageSize.getWidth();
            const PAGE_H = doc.internal.pageSize.getHeight();
            const MARGIN = 15;
            const CONTENT_W = PAGE_W - MARGIN * 2;
            const HEADER_H = 25;
            const FOOTER_H = 15;
            let yPos = 0;

            const COLORS = {
                PRIMARY_GREEN: '#22C55E',
                DARK_TEXT: '#0F172A',
                MEDIUM_TEXT: '#475569',
                LIGHT_TEXT: '#94A3B8',
                BG_LIGHT_GRAY: '#F1F5F9',
                WHITE: '#FFFFFF',
                TIP_BG: '#F0FDF4',
                TIP_BORDER: '#4ADE80',
                GREEN_TEXT: '#166534',
            };

            const chefHatLogo = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M6 18H18V20H6V18Z"/><path d="M12 2C9.24 2 7 4.24 7 7C7 8.33 7.55 9.51 8.44 10.33C7.58 10.74 7 11.55 7 12.5V17H17V12.5C17 11.55 16.42 10.74 15.56 10.33C16.45 9.51 17 8.33 17 7C17 4.24 14.76 2 12 2ZM12 9C10.9 9 10 8.1 10 7C10 5.9 10.9 5 12 5C13.1 5 14 5.9 14 7C14 8.1 13.1 9 12 9Z"/></svg>`;
            const logoPngDataUrl = await svgToPngDataUrl(chefHatLogo);

            // --- PDF GENERATION START ---
            doc.setFillColor(COLORS.BG_LIGHT_GRAY);
            doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

            // --- HEADER ---
            doc.setFillColor(COLORS.PRIMARY_GREEN);
            doc.rect(0, 0, PAGE_W, HEADER_H, 'F');
            doc.addImage(logoPngDataUrl, 'PNG', MARGIN, 6, 13, 13);
            doc.setFontSize(16).setFont('helvetica', 'bold').setTextColor(COLORS.WHITE);
            doc.text("NutriChef", MARGIN + 16, 12);
            doc.setFontSize(9).setFont('helvetica', 'normal');
            const subtitle = language === 'es' ? "Platos saludables con tus ingredientes, en segundos." : "Healthy meals from your ingredients, in seconds.";
            doc.text(subtitle, MARGIN + 16, 17);
            yPos = HEADER_H + 10;

            // --- TITLE & DESCRIPTION ---
            doc.setFontSize(24).setFont('helvetica', 'bold').setTextColor(COLORS.DARK_TEXT);
            const titleLines = doc.splitTextToSize(recipe.recipeName, CONTENT_W);
            doc.text(titleLines, PAGE_W / 2, yPos, { align: 'center' });
            yPos += titleLines.length * 8.5;

            doc.setFontSize(11).setFont('helvetica', 'normal').setTextColor(COLORS.MEDIUM_TEXT);
            const descLines = doc.splitTextToSize(recipe.description, CONTENT_W - 10);
            doc.text(descLines, PAGE_W / 2, yPos, { align: 'center' });
            yPos += descLines.length * 4.5 + 5;

            // --- RECIPE IMAGE ---
            if (recipe.imageUrl) {
                try {
                    const { dataUrl, width, height } = await urlToDataUrl(recipe.imageUrl);
                    const imgHeight = 55;
                    const imgWidth = imgHeight * (width / height);
                    const imgX = (PAGE_W - imgWidth) / 2;
                    doc.saveGraphicsState();
                    doc.roundedRect(imgX, yPos, imgWidth, imgHeight, 5, 5);
                    doc.clip();
                    doc.addImage(dataUrl, 'JPEG', imgX, yPos, imgWidth, imgHeight);
                    doc.restoreGraphicsState();
                    yPos += imgHeight + 8;
                } catch (e) {
                    console.error("Could not load image for PDF:", e);
                    yPos += 10; // Add space even if image fails
                }
            } else {
                yPos += 10;
            }

            // --- INFO & NUTRITION CARD ---
            const cardStartY = yPos;
            const infoItems = [
                { l: t.servings.toUpperCase(), v: String(recipe.servings) },
                { l: 'PREP', v: recipe.prepTime },
                { l: 'COOK', v: recipe.cookTime },
                { l: t.calories.toUpperCase(), v: `~${recipe.calories} kcal` },
            ];
            doc.setFillColor(COLORS.WHITE).setDrawColor(COLORS.WHITE);
            doc.roundedRect(MARGIN, cardStartY, CONTENT_W, 25, 5, 5, 'FD');
            const infoCardW = CONTENT_W / 4;
            infoItems.forEach((item, i) => {
                const cardX = MARGIN + i * infoCardW;
                doc.setFontSize(7).setTextColor(COLORS.LIGHT_TEXT).setFont('helvetica', 'bold');
                doc.text(item.l, cardX + infoCardW / 2, cardStartY + 6, { align: 'center' });
                doc.setFontSize(10).setTextColor(COLORS.DARK_TEXT).setFont('helvetica', 'bold');
                doc.text(item.v, cardX + infoCardW / 2, cardStartY + 11, { align: 'center' });
            });
            
            const nutritionItems = [
                { l: t.protein.toUpperCase(), v: recipe.nutrition?.protein || 'N/A' },
                { l: t.carbs.toUpperCase(), v: recipe.nutrition?.carbs || 'N/A' },
                { l: t.fats.toUpperCase(), v: recipe.nutrition?.fats || 'N/A' },
            ];
            const nutritionW = (CONTENT_W / 4) * 3;
            const nutritionItemW = nutritionW / 3;
            nutritionItems.forEach((item, i) => {
                const itemX = MARGIN + i * nutritionItemW;
                doc.setFontSize(7).setTextColor(COLORS.LIGHT_TEXT).setFont('helvetica', 'bold');
                doc.text(item.l, itemX + nutritionItemW / 2, cardStartY + 17, { align: 'center' });
                doc.setFontSize(10).setTextColor(COLORS.GREEN_TEXT).setFont('helvetica', 'bold');
                doc.text(item.v, itemX + nutritionItemW / 2, cardStartY + 22, { align: 'center' });
            });
            
            const difficultyX = MARGIN + nutritionW;
            doc.setFontSize(7).setTextColor(COLORS.LIGHT_TEXT).setFont('helvetica', 'bold');
            doc.text(t.difficulty.toUpperCase(), difficultyX + infoCardW / 2, cardStartY + 17, { align: 'center' });
            const difficultyMap = { 'Very Easy': 1, 'Easy': 2, 'Medium': 3, 'Hard': 4, 'Expert': 5 };
            const difficultyLevel = difficultyMap[recipe.difficulty] || 1;
            for(let i = 0; i < 5; i++) {
                doc.setFillColor(i < difficultyLevel ? COLORS.PRIMARY_GREEN : '#E2E8F0');
                const barX = difficultyX + (infoCardW / 2) - 15 + (i * 6.5);
                doc.roundedRect(barX, cardStartY + 20, 5.5, 2.5, 1, 1, 'F');
            }
            yPos = cardStartY + 25 + 8;

            // --- INGREDIENTS AND INSTRUCTIONS COLUMNS ---
            const columnStartY = yPos;
            let yLeft = columnStartY;
            let yRight = columnStartY;
            const colWidth = (CONTENT_W - 10) / 2;
            const col1X = MARGIN;
            const col2X = MARGIN + colWidth + 10;
            const FONT_SIZE_BODY = 9.5;
            const LINE_HEIGHT = 1.4;
            const PT_TO_MM = 0.352778;

            doc.setFontSize(14).setFont('helvetica', 'bold').setTextColor(COLORS.DARK_TEXT);
            doc.text(t.ingredients, col1X, yLeft);
            yLeft += 7;
            doc.setFontSize(FONT_SIZE_BODY).setFont('helvetica', 'normal').setTextColor(COLORS.MEDIUM_TEXT).setLineHeightFactor(LINE_HEIGHT);
            
            const ingredientItems = recipe.ingredients.map(ing => `\u2022 ${ing.quantity} ${ing.name}${ing.isStaple ? ` (${t.suggested})` : ''}`);
            ingredientItems.forEach(item => {
                const lines = doc.splitTextToSize(item, colWidth);
                const textHeight = lines.length * FONT_SIZE_BODY * PT_TO_MM * LINE_HEIGHT;
                if (yLeft + textHeight > PAGE_H - FOOTER_H) return;
                doc.text(lines, col1X, yLeft);
                yLeft += textHeight + 1;
            });

            doc.setFontSize(14).setFont('helvetica', 'bold').setTextColor(COLORS.DARK_TEXT);
            doc.text(t.instructions, col2X, yRight);
            yRight += 7;
            doc.setFontSize(FONT_SIZE_BODY).setFont('helvetica', 'normal').setTextColor(COLORS.MEDIUM_TEXT).setLineHeightFactor(LINE_HEIGHT);
            
            recipe.instructions.forEach((step) => {
                const itemText = `${recipe.instructions.indexOf(step) + 1}. ${step}`;
                const lines = doc.splitTextToSize(itemText, colWidth);
                const textHeight = lines.length * FONT_SIZE_BODY * PT_TO_MM * LINE_HEIGHT;
                if (yRight + textHeight > PAGE_H - FOOTER_H) return;
                doc.text(lines, col2X, yRight);
                yRight += textHeight + 2;
            });

            yPos = Math.max(yLeft, yRight) + 5;
            
            // --- HEALTHY TIP (if it fits) ---
            if (recipe.healthTip) {
                const tipLines = doc.splitTextToSize(recipe.healthTip, CONTENT_W - 10);
                const tipBoxHeight = 8 + (tipLines.length * 9 * PT_TO_MM * 1.4);
                if (yPos + tipBoxHeight < PAGE_H - FOOTER_H) {
                    doc.setFillColor(COLORS.TIP_BG);
                    doc.roundedRect(MARGIN, yPos, CONTENT_W, tipBoxHeight, 3, 3, 'F');
                    doc.setDrawColor(COLORS.TIP_BORDER).setLineWidth(0.5);
                    doc.line(MARGIN + 2, yPos, MARGIN + 2, yPos + tipBoxHeight);

                    doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(COLORS.GREEN_TEXT);
                    doc.text(t.healthyTip, MARGIN + 5, yPos + 5);
                    doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(COLORS.MEDIUM_TEXT).setLineHeightFactor(1.4);
                    doc.text(tipLines, MARGIN + 5, yPos + 10);
                }
            }

            // --- FOOTER ---
            doc.setFontSize(8).setTextColor(COLORS.LIGHT_TEXT);
            doc.text("Generated by NutriChef", PAGE_W / 2, PAGE_H - 7, { align: 'center' });
            
            doc.save(`${recipe.recipeName.replace(/\s+/g, '_').toLowerCase()}.pdf`);
        } catch (error) {
            console.error("Failed to generate PDF:", error);
        } finally {
            setIsDownloadingPdf(false);
        }
    };


    return (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {recipe.imageState === 'success' && recipe.imageUrl ? (
                <img src={recipe.imageUrl} alt={recipe.recipeName} className="w-full h-64 md:h-80 object-cover" />
            ) : (
                <ImagePlaceholder state={recipe.imageState} language={language} />
            )}
            
            <div className="p-6 md:p-8">
                <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900">{recipe.recipeName}</h3>
                <p className="text-slate-600 mt-2">{recipe.description}</p>
                
                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4 text-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t.servings}</p>
                        <p className="text-xl font-bold text-slate-800 mt-1">{recipe.servings}</p>
                    </div>
                     <div>
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Prep</p>
                        <p className="text-xl font-bold text-slate-800 mt-1">{recipe.prepTime}</p>
                    </div>
                     <div>
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Cook</p>
                        <p className="text-xl font-bold text-slate-800 mt-1">{recipe.cookTime}</p>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t.calories}</p>
                        <p className="text-xl font-bold text-slate-800 mt-1">~{recipe.calories} kcal</p>
                    </div>
                     {recipe.nutrition && (
                        <>
                            <div>
                                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t.protein}</p>
                                <p className="text-xl font-bold text-green-600 mt-1">{recipe.nutrition.protein}</p>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t.carbs}</p>
                                <p className="text-xl font-bold text-green-600 mt-1">{recipe.nutrition.carbs}</p>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t.fats}</p>
                                <p className="text-xl font-bold text-green-600 mt-1">{recipe.nutrition.fats}</p>
                            </div>
                        </>
                    )}
                    <div>
                        <DifficultyMeter difficulty={recipe.difficulty} language={language} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 mt-8">
                    <div>
                        <h4 className="text-2xl font-bold text-slate-800 mb-4">{t.ingredients}</h4>
                        <ul className="space-y-2 text-slate-700">
                            {recipe.ingredients.map((ing, i) => (
                                <li key={i} className="flex items-start">
                                   <span className="text-green-500 font-bold mr-2 mt-1">&#10003;</span>
                                   <span> <span className="font-semibold">{ing.quantity}</span> {ing.name}
                                    {ing.isStaple && <em className="text-xs text-slate-500 ml-1">({t.suggested})</em>}
                                   </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="mt-8 md:mt-0">
                        <h4 className="text-2xl font-bold text-slate-800 mb-4">{t.instructions}</h4>
                        <ol className="space-y-4 text-slate-700">
                            {recipe.instructions.map((step, i) => (
                                <li key={i} className="flex">
                                    <span className="bg-green-500 text-white rounded-full w-6 h-6 text-sm font-bold flex items-center justify-center mr-3 flex-shrink-0 mt-1">{i + 1}</span>
                                    <span>{step}</span>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
                
                {recipe.healthTip && (
                    <div className="mt-8 bg-sky-50 border-l-4 border-sky-400 text-sky-800 p-4 rounded-r-lg">
                        <p className="font-bold">{t.healthyTip}</p>
                        <p className="italic">{recipe.healthTip}</p>
                    </div>
                )}

                <div className="mt-8 pt-6 border-t border-slate-200 flex flex-wrap items-center justify-center gap-2">
                    <button 
                        onClick={() => onToggleFavorite(recipe)}
                        className={`p-2 rounded-full transition-colors flex items-center gap-2 px-4 text-sm font-medium ${isFavorite ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                        aria-label={isFavorite ? t.removeFromFavorites : t.addToFavorites}
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                        <span>{t.favorite}</span>
                    </button>
                    <button 
                        onClick={() => onShare(recipe)}
                        className="p-2 bg-slate-200 text-slate-600 hover:bg-slate-300 rounded-full transition-colors flex items-center gap-2 px-4 text-sm font-medium"
                        aria-label={t.shareRecipe}
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                        </svg>
                        <span>{t.share}</span>
                    </button>
                    <button 
                        onClick={handleDownloadPdf}
                        disabled={isDownloadingPdf}
                        className="p-2 bg-slate-200 text-slate-600 hover:bg-slate-300 rounded-full transition-colors disabled:opacity-50 disabled:cursor-wait flex items-center gap-2 px-4 text-sm font-medium"
                        aria-label={t.downloadPdf}
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
                         <span>{t.pdf}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RecipeCard;