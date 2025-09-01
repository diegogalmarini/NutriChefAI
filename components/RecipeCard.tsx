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
            
            doc.setFont('helvetica', 'normal');
            const colors = {
                primaryGreen: '#2EAE6A',
                darkText: '#0F172A',
                mediumText: '#334155',
                lightText: '#64748B',
                background: '#F1F5F9',
                cardBackground: '#FFFFFF',
                tipBackground: '#F0FDF4',
                tipBorder: '#22C55E',
                greenText: '#166534',
            };
            const pageW = 210, pageH = 297;
            const margin = 15;
            const headerHeight = 35;
            const contentW = pageW - margin * 2;
            const bodyBottomMargin = pageH - 25;

            doc.setFillColor(colors.background);
            doc.rect(0, 0, pageW, pageH, 'F');
            
            const chefHatLogo = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M6 18H18V20H6V18Z"/><path d="M12 2C9.24 2 7 4.24 7 7C7 8.33 7.55 9.51 8.44 10.33C7.58 10.74 7 11.55 7 12.5V17H17V12.5C17 11.55 16.42 10.74 15.56 10.33C16.45 9.51 17 8.33 17 7C17 4.24 14.76 2 12 2ZM12 9C10.9 9 10 8.1 10 7C10 5.9 10.9 5 12 5C13.1 5 14 5.9 14 7C14 8.1 13.1 9 12 9Z"/></svg>`;
            const logoIconSVG = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(chefHatLogo);
            let logoDataUrl: string | null = null;
             try {
                const { dataUrl } = await urlToDataUrl(logoIconSVG);
                logoDataUrl = dataUrl;
            } catch(e) { console.error('logo error', e)}

            const drawHeader = () => {
                doc.setFillColor(colors.primaryGreen);
                doc.rect(0, 0, pageW, headerHeight, 'F');
                if (logoDataUrl) doc.addImage(logoDataUrl, 'SVG', margin, 12, 10, 10);
                doc.setFontSize(20).setFont('helvetica', 'bold').setTextColor('#FFFFFF');
                doc.text("NutriChef", margin + 12, 18.5);
                doc.setFontSize(10).setFont('helvetica', 'normal');
                doc.text(language === 'es' ? "Platos saludables con tus ingredientes, en segundos." : "Healthy meals from your ingredients, in seconds.", margin + 12, 23.5);
            };

            drawHeader();
            
            let yPos = headerHeight + 15;
            
            doc.setFontSize(26).setFont('helvetica', 'bold').setTextColor(colors.darkText);
            const titleLines = doc.splitTextToSize(recipe.recipeName, contentW);
            doc.text(titleLines, pageW / 2, yPos, { align: 'center' });
            yPos += titleLines.length * 10;
            
            doc.setFontSize(12).setFont('helvetica', 'normal').setTextColor(colors.lightText);
            const descLines = doc.splitTextToSize(recipe.description, contentW - 20);
            doc.text(descLines, pageW / 2, yPos, { align: 'center' });
            yPos += descLines.length * 5 + 10;
            
            const drawPlaceholder = (y: number) => {
                doc.setFillColor('#E2E8F0').setDrawColor('#CBD5E1');
                doc.roundedRect(margin, y, contentW, 70, 5, 5, 'F');
                doc.setFontSize(10).setTextColor(colors.lightText);
                doc.text("Image not available", pageW / 2, y + 35 + 3.5, { align: 'center' });
                return y + 70 + 10;
            };

            if (recipe.imageUrl) {
                try {
                    const { dataUrl, width, height } = await urlToDataUrl(recipe.imageUrl);
                    let imgW = contentW, imgH = contentW / (width / height);
                    const maxImgHeight = 70;
                    if (imgH > maxImgHeight) { imgH = maxImgHeight; imgW = imgH * (width / height); }
                    const imgX = (pageW - imgW) / 2;
                    doc.saveGraphicsState();
                    doc.roundedRect(imgX, yPos, imgW, imgH, 5, 5);
                    doc.clip();
                    doc.addImage(dataUrl, 'JPEG', imgX, yPos, imgW, imgH);
                    doc.restoreGraphicsState();
                    yPos += imgH + 10;
                } catch (e) { yPos = drawPlaceholder(yPos); }
            } else { yPos = drawPlaceholder(yPos); }
            
            const infoItems1 = [
                { l: language === 'es' ? 'RACIONES' : 'SERVINGS', v: String(recipe.servings) },
                { l: 'PREP', v: recipe.prepTime }, { l: 'COOK', v: recipe.cookTime },
                { l: language === 'es' ? 'CALORÍAS' : 'CALORIES', v: `~${recipe.calories} kcal` },
            ];
            const cardW = (contentW - 3 * 5) / 4;
            const cardH = 20;
            doc.setFillColor(colors.cardBackground).setDrawColor(colors.cardBackground);
            doc.roundedRect(margin, yPos, contentW, cardH, 5, 5, 'FD');
            infoItems1.forEach((item, i) => {
                const cardX = margin + i * (cardW + 5);
                doc.setFontSize(8).setTextColor(colors.lightText).setFont('helvetica', 'bold');
                doc.text(item.l, cardX + cardW / 2, yPos + 7, { align: 'center' });
                doc.setFontSize(12).setTextColor(colors.darkText).setFont('helvetica', 'bold');
                doc.text(item.v, cardX + cardW / 2, yPos + 14, { align: 'center' });
            });
            yPos += cardH + 10;
            
            // --- NEW: Robust Line-by-Line Content Drawing Logic ---
            // Fix: Moved BODY_FONT_SIZE to this scope to be accessible by health tip box height calculation.
            const BODY_FONT_SIZE = 10;
            const drawContentWithPageBreaks = (startY: number) => {
                let currentY = startY;
                const ptToMm = 25.4 / 72;
                const TITLE_FONT_SIZE = 16;
                const TITLE_HEIGHT = TITLE_FONT_SIZE * ptToMm + 6;
                const LINE_HEIGHT_FACTOR = 1.5;
                const BODY_LINE_HEIGHT = BODY_FONT_SIZE * LINE_HEIGHT_FACTOR * ptToMm;
            
                const addNewPage = () => {
                    doc.addPage();
                    drawHeader();
                    return headerHeight + 15;
                };

                const sections = [
                    { title: t.ingredients, items: recipe.ingredients.map(ing => `\u2022 ${ing.quantity} ${ing.name}${ing.isStaple ? ` (${t.suggested})` : ''}`) },
                    { title: t.instructions, items: recipe.instructions.map((step, i) => `${i + 1}. ${step}`) }
                ];

                for (let i = 0; i < sections.length; i++) {
                    const section = sections[i];
                    
                    if (i > 0) currentY += 8;

                    if (currentY + TITLE_HEIGHT > bodyBottomMargin) {
                        currentY = addNewPage();
                    }
                    doc.setFontSize(TITLE_FONT_SIZE).setFont('helvetica', 'bold').setTextColor(colors.darkText);
                    doc.text(section.title, margin, currentY);
                    currentY += TITLE_HEIGHT;

                    doc.setFontSize(BODY_FONT_SIZE).setFont('helvetica', 'normal').setTextColor(colors.mediumText).setLineHeightFactor(LINE_HEIGHT_FACTOR);
                    
                    for (let itemIndex = 0; itemIndex < section.items.length; itemIndex++) {
                        const item = section.items[itemIndex];
                        const lines = doc.splitTextToSize(item, contentW);
                        
                        if (itemIndex > 0) currentY += 4;

                        for (const line of lines) {
                            if (currentY + BODY_LINE_HEIGHT > bodyBottomMargin) {
                                currentY = addNewPage();
                                doc.setFontSize(TITLE_FONT_SIZE).setFont('helvetica', 'bold').setTextColor(colors.darkText);
                                doc.text(`${section.title} (${t.cont})`, margin, currentY);
                                currentY += TITLE_HEIGHT;
                                doc.setFontSize(BODY_FONT_SIZE).setFont('helvetica', 'normal').setTextColor(colors.mediumText).setLineHeightFactor(LINE_HEIGHT_FACTOR);
                            }
                            doc.text(line, margin, currentY);
                            currentY += BODY_LINE_HEIGHT;
                        }
                    }
                }
                return currentY;
            };

            yPos = drawContentWithPageBreaks(yPos);
            
            if (recipe.healthTip) {
                const tipTitle = t.healthyTip;
                const tipTextLines = doc.splitTextToSize(recipe.healthTip, contentW - 15);
                const tipBoxHeight = 10 + 5 + (tipTextLines.length * BODY_FONT_SIZE * 0.35 * 1.4);

                if (yPos + tipBoxHeight > bodyBottomMargin) {
                    yPos = headerHeight + 15;
                    doc.addPage();
                    drawHeader();
                } else {
                    yPos += 5;
                }

                doc.setFillColor(colors.tipBackground);
                doc.roundedRect(margin, yPos, contentW, tipBoxHeight, 5, 5, 'F');
                doc.setDrawColor(colors.tipBorder).setLineWidth(1.5);
                doc.line(margin + 0.75, yPos, margin + 0.75, yPos + tipBoxHeight);
                doc.setFontSize(12).setFont('helvetica', 'bold').setTextColor(colors.greenText);
                doc.text(tipTitle, margin + 10, yPos + 8);
                doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(colors.mediumText).setLineHeightFactor(1.4);
                doc.text(tipTextLines, margin + 10, yPos + 15);
            }
            
            const totalPages = doc.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(9).setTextColor(colors.lightText);
                doc.text("Generated by NutriChef", pageW / 2, pageH - 10, { align: 'center' });
            }
            
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