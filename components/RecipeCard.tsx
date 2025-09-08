
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
        prep: 'Prep',
        cook: 'Cook',
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
        prep: 'Prep',
        cook: 'Cook',
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

        const generateRecipePdf = async (recipeProp: Recipe) => {
            const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

            const difficultyTranslations = {
                en: { 'Very Easy': 'Very Easy', 'Easy': 'Easy', 'Medium': 'Medium', 'Hard': 'Hard', 'Expert': 'Expert' },
                es: { 'Very Easy': 'Muy Fácil', 'Easy': 'Fácil', 'Medium': 'Medio', 'Hard': 'Difícil', 'Expert': 'Experto' }
            };

            const recipeData = {
                imageUrl: recipeProp.imageUrl,
                title: recipeProp.recipeName,
                description: recipeProp.description,
                stats: {
                    servings: String(recipeProp.servings),
                    prepTime: recipeProp.prepTime,
                    cookTime: recipeProp.cookTime,
                    calories: `~${recipeProp.calories} kcal`
                },
                macros: {
                    protein: recipeProp.nutrition?.protein || 'N/A',
                    carbs: recipeProp.nutrition?.carbs || 'N/A',
                    fats: recipeProp.nutrition?.fats || 'N/A'
                },
                difficulty: difficultyTranslations[language][recipeProp.difficulty] || recipeProp.difficulty,
                ingredients: recipeProp.ingredients.map(ing => `${ing.quantity} ${ing.name}${ing.isStaple ? ` (${t.suggested})` : ''}`),
                instructions: recipeProp.instructions,
                healthyTip: {
                    title: t.healthyTip,
                    text: recipeProp.healthTip
                }
            };

            const PAGE_W = doc.internal.pageSize.getWidth();
            const MARGIN = 15;
            const CONTENT_W = PAGE_W - MARGIN * 2;
            let yPos = 0;

            const COLORS = {
                HEADER_GREEN: '#22C55E',
                WHITE: '#FFFFFF',
                DARK_TEXT: '#1E293B',
                MEDIUM_TEXT: '#475569',
                LIGHT_TEXT: '#9CA3AF',
                STATS_BG: '#F1F5F9',
                TIP_BG: '#F0FDF4',
                TIP_BORDER: '#22C55E',
                TIP_TITLE: '#16A34A'
            };
            
            const drawNutriChefLogo = (doc: jsPDF, x: number, y: number, size: number) => {
                doc.setFillColor(COLORS.WHITE);
                doc.setDrawColor(COLORS.WHITE);
            
                const r = size / 2;
                const cx = x + r;
                const cy = y + r;
                // Kappa, a constant for approximating circles with Bezier curves
                const k = r * 0.552284749831;
            
                // Define the four cardinal points of the circle
                const p0 = { x: cx + r, y: cy };     // 3 o'clock
                const p1 = { x: cx,     y: cy + r }; // 6 o'clock
                const p2 = { x: cx - r, y: cy };     // 9 o'clock
                const p3 = { x: cx,     y: cy - r }; // 12 o'clock
            
                // Start path at the bottom point (6 o'clock)
                doc.moveTo(p1.x, p1.y);
            
                // Curve 1: From P1 to P2 (bottom-left quadrant)
                (doc as any).curveTo(
                    cx - k, cy + r, // Control point 1
                    cx - r, cy + k, // Control point 2
                    p2.x, p2.y      // End point (P2)
                );
            
                // Curve 2: From P2 to P3 (top-left quadrant)
                (doc as any).curveTo(
                    cx - r, cy - k, // Control point 1
                    cx - k, cy - r, // Control point 2
                    p3.x, p3.y      // End point (P3)
                );
                
                // Curve 3: From P3 to P0 (top-right quadrant)
                (doc as any).curveTo(
                    cx + k, cy - r, // Control point 1
                    cx + r, cy - k, // Control point 2
                    p0.x, p0.y      // End point (P0)
                );
            
                // Curve 4 (The cutout): An inward curve from P0 back to P1
                // This replaces the standard bottom-right quadrant curve.
                // The control points are pulled inwards to create the "leaf" shape.
                (doc as any).curveTo(
                    cx + r,       cy + r * 0.4,  // Control point 1 (pulls down from P0)
                    cx + r * 0.4, cy + r,        // Control point 2 (pulls left from P1)
                    p1.x, p1.y                   // End point (P1)
                );
            
                // Fill the completed path
                doc.fill();
            };

            // --- HEADER ---
            doc.setFillColor(COLORS.HEADER_GREEN);
            doc.rect(0, 0, PAGE_W, 30, 'F');

            const logoSize = 12;
            const logoPadding = 4;
            drawNutriChefLogo(doc, MARGIN, (30 - logoSize) / 2, logoSize);
            
            const textStartX = MARGIN + logoSize + logoPadding;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(20);
            doc.setTextColor(COLORS.WHITE);
            doc.text("NutriChef", textStartX, 15);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.text(language === 'es' ? "Platos saludables con tus ingredientes, en segundos." : "Healthy meals from your ingredients, in seconds.", textStartX, 22);
            yPos = 30 + 12;

            // --- IMAGE ---
            if (recipeData.imageUrl) {
                try {
                    const { dataUrl, width, height } = await urlToDataUrl(recipeData.imageUrl);
                    const aspectRatio = width / height;
                    const imgWidth = 120;
                    const imgHeight = imgWidth / aspectRatio;
                    const imgX = (PAGE_W - imgWidth) / 2;
                    doc.addImage(dataUrl, 'JPEG', imgX, yPos, imgWidth, imgHeight);
                    yPos += imgHeight + 10;
                } catch (e) {
                    console.error("Could not add image to PDF", e);
                    yPos += 10;
                }
            }

            // --- TITLE & DESC ---
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(24);
            doc.setTextColor(COLORS.DARK_TEXT);
            const titleLines = doc.splitTextToSize(recipeData.title, CONTENT_W * 0.9);
            const titleHeight = doc.getTextDimensions(titleLines).h;
            doc.text(titleLines, PAGE_W / 2, yPos, { align: 'center' });
            yPos += titleHeight + 3;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.setTextColor(COLORS.MEDIUM_TEXT);
            const descLines = doc.splitTextToSize(recipeData.description, CONTENT_W * 0.95);
            const descHeight = doc.getTextDimensions(descLines).h;
            doc.text(descLines, PAGE_W / 2, yPos, { align: 'center' });
            yPos += descHeight + 10;

            // --- STATS BAR ---
            doc.setFillColor(COLORS.STATS_BG);
            doc.roundedRect(MARGIN, yPos, CONTENT_W, 20, 5, 5, 'F');
            const stats = [
                { label: t.servings.toUpperCase(), value: recipeData.stats.servings },
                { label: t.prep.toUpperCase(), value: recipeData.stats.prepTime },
                { label: t.cook.toUpperCase(), value: recipeData.stats.cookTime },
                { label: t.calories.toUpperCase(), value: recipeData.stats.calories },
            ];
            stats.forEach((stat, i) => {
                const colX = MARGIN + (CONTENT_W / 4) * (i + 0.5);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7);
                doc.setTextColor(COLORS.LIGHT_TEXT);
                doc.text(stat.label, colX, yPos + 8, { align: 'center' });
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(11);
                doc.setTextColor(COLORS.DARK_TEXT);
                doc.text(stat.value, colX, yPos + 15, { align: 'center' });
            });
            yPos += 20 + 8;

            // --- MACROS & DIFFICULTY ---
            const macroData = [
                { label: t.protein.toUpperCase(), value: recipeData.macros.protein, hasBar: true },
                { label: t.carbs.toUpperCase(), value: recipeData.macros.carbs, hasBar: true },
                { label: t.fats.toUpperCase(), value: recipeData.macros.fats, hasBar: true },
                { label: t.difficulty.toUpperCase(), value: recipeData.difficulty, hasBar: false }
            ];
            macroData.forEach((item, i) => {
                const colX = MARGIN + (CONTENT_W / 4) * (i + 0.5);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7);
                doc.setTextColor(COLORS.LIGHT_TEXT);
                doc.text(item.label, colX, yPos, { align: 'center' });
                doc.setFontSize(11);
                doc.setTextColor(COLORS.DARK_TEXT);
                doc.text(item.value, colX, yPos + 7, { align: 'center' });
                if (item.hasBar) {
                    doc.setFillColor(COLORS.HEADER_GREEN);
                    doc.rect(colX - 15, yPos + 11, 30, 2, 'F');
                }
            });
            yPos += 12 + 10;

            // --- 2-COLUMN LAYOUT ---
            const colStartY = yPos;
            const COL_GAP = 10;
            const COL_WIDTH = (CONTENT_W - COL_GAP) / 2;
            const COL1_X = MARGIN;
            const COL2_X = MARGIN + COL_WIDTH + COL_GAP;
            const lineHeight = 1.4;

            // Ingredients Column
            let yPosLeft = colStartY;
            doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(COLORS.DARK_TEXT);
            doc.text(t.ingredients, COL1_X, yPosLeft);
            yPosLeft += 6;
            doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(COLORS.MEDIUM_TEXT);
            recipeData.ingredients.forEach(ing => {
                const lines = doc.splitTextToSize(ing, COL_WIDTH - 5);
                const textHeight = doc.getTextDimensions(lines, { lineHeightFactor: lineHeight } as any).h;
                doc.setFillColor(COLORS.HEADER_GREEN);
                doc.circle(COL1_X + 1.5, yPosLeft, 1, 'F');
                doc.text(lines, COL1_X + 5, yPosLeft, { lineHeightFactor: lineHeight });
                yPosLeft += textHeight + 2;
            });

            // Instructions Column
            let yPosRight = colStartY;
            doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(COLORS.DARK_TEXT);
            doc.text(t.instructions, COL2_X, yPosRight);
            yPosRight += 6;
            doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(COLORS.MEDIUM_TEXT);
            recipeData.instructions.forEach((step, i) => {
                const lines = doc.splitTextToSize(step, COL_WIDTH - 8);
                const textHeight = doc.getTextDimensions(lines, { lineHeightFactor: lineHeight } as any).h;
                if (yPosRight + textHeight > doc.internal.pageSize.getHeight() - 25) {
                    return; // Avoid overflowing the page
                }
                doc.setFillColor(COLORS.HEADER_GREEN);
                doc.circle(COL2_X + 2.5, yPosRight + 1, 2.5, 'F');
                doc.setTextColor(COLORS.WHITE).setFont('helvetica', 'bold').setFontSize(8);
                doc.text(String(i + 1), COL2_X + 2.5, yPosRight + 2.2, { align: 'center' });
                doc.setTextColor(COLORS.MEDIUM_TEXT).setFont('helvetica', 'normal').setFontSize(9.5);
                doc.text(lines, COL2_X + 8, yPosRight, { lineHeightFactor: lineHeight });
                yPosRight += textHeight + 3;
            });
            
            yPos = Math.max(yPosLeft, yPosRight) + 10;

            // --- HEALTHY TIP ---
            if(recipeData.healthyTip.text && yPos < doc.internal.pageSize.getHeight() - 35) {
                doc.setFillColor(COLORS.TIP_BG);
                const tipLines = doc.splitTextToSize(recipeData.healthyTip.text, CONTENT_W - 15);
                const tipHeight = doc.getTextDimensions(tipLines, { lineHeightFactor: 1.5 } as any).h + 15;
                doc.rect(MARGIN, yPos, CONTENT_W, tipHeight, 'F');
                doc.setFillColor(COLORS.TIP_BORDER);
                doc.rect(MARGIN, yPos, 2, tipHeight, 'F');
                doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(COLORS.TIP_TITLE);
                doc.text(recipeData.healthyTip.title, MARGIN + 10, yPos + 7);
                doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(COLORS.MEDIUM_TEXT);
                doc.text(tipLines, MARGIN + 10, yPos + 14, { lineHeightFactor: 1.5 });
            }
            
            // --- FOOTER ---
            doc.setFontSize(8).setTextColor(COLORS.LIGHT_TEXT);
            doc.text("Generated by NutriChef", PAGE_W / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
            
            const sanitizedTitle = recipeData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            doc.save(`nutrichef_${sanitizedTitle}.pdf`);
        };

        try {
            await generateRecipePdf(recipe);
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
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{recipe.recipeName}</h3>
                <p className="text-slate-600 mt-2">{recipe.description}</p>
                
                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4 text-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t.servings}</p>
                        <p className="text-xl font-bold text-slate-800 mt-1">{recipe.servings}</p>
                    </div>
                     <div>
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t.prep}</p>
                        <p className="text-xl font-bold text-slate-800 mt-1">{recipe.prepTime}</p>
                    </div>
                     <div>
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t.cook}</p>
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

                <div className="mt-8 pt-6 border-t border-slate-200 flex flex-wrap items-center justify-center gap-4">
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