import React, { useState } from 'react';
import type { Recipe, ImageState } from '../types';
import jsPDF from 'jspdf';
import DifficultyMeter from './DifficultyMeter';

const localeStrings = {
    en: {
        imageFailed: "Image generation failed.",
        imageFailedQuota: "Image quota exceeded.",
        plating: "Plating your dish...",
        generateImage: 'Generate Image',
        imageGenerationPrompt: 'Generate a beautiful, photorealistic image for this recipe.',
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
        generateImage: 'Generar Imagen',
        imageGenerationPrompt: 'Genera una imagen hermosa y fotorrealista para esta receta.',
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

interface ImagePlaceholderProps {
    state: ImageState | undefined;
    language: 'en' | 'es';
    onGenerateClick: () => void;
}

const ImagePlaceholder = ({ state, language, onGenerateClick }: ImagePlaceholderProps) => {
    const t = localeStrings[language];

    const renderContent = () => {
        switch (state) {
            case 'idle':
            case undefined:
                return (
                    <div className="text-center p-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.12,4.24a1,1,0,0,0-1.12-.22l-6,2.72a1,1,0,0,0-.53.91V19.4a1,1,0,0,0,.52.9l6,2.73a1,1,0,0,0,1.12-.22,1,1,0,0,0,.36-.68V5A1,1,0,0,0,21.12,4.24Z" style={{ strokeWidth: '1.5' }} />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11,19.4V6.93a1,1,0,0,0-1-1H4a1,1,0,0,0-1,1V19.4a1,1,0,0,0,1,1h6A1,1,0,0,0,11,19.4Z" style={{ strokeWidth: '1.5', fill: 'rgb(203, 213, 225)', stroke: 'rgb(100, 116, 139)' }} />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.52,2.69,8.2,1.21a1,1,0,0,0-1.09.21L4.27,3.58a1,1,0,0,0-.27.7v1.65" style={{ strokeWidth: '1.5' }} />
                        </svg>

                        <p className="mt-2 text-sm text-slate-500 font-medium">{t.imageGenerationPrompt}</p>
                        <button
                            onClick={onGenerateClick}
                            className="mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-5 rounded-lg transition-all duration-300 transform hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400"
                        >
                            {t.generateImage}
                        </button>
                    </div>
                );
            case 'error':
            case 'error_quota':
                const message = state === 'error_quota' ? t.imageFailedQuota : t.imageFailed;
                return (
                    <div className="flex flex-col items-center justify-center text-center p-4 h-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-400 mb-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm font-semibold text-slate-600">{message}</p>
                    </div>
                );
            case 'loading':
            default:
                return (
                    <div className="flex flex-col items-center justify-center text-center p-4 h-full">
                        <svg className="animate-spin h-8 w-8 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-sm font-semibold text-slate-500 mt-2">{t.plating}</p>
                    </div>
                );
        }
    };

    return (
        <div className="w-full aspect-[16/9] bg-slate-200 flex items-center justify-center rounded-t-2xl">
            {renderContent()}
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
    onGenerateImage: (recipeId: string) => void;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, language, onToggleFavorite, isFavorite, onShare, onGenerateImage }) => {
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
                healthTip: recipeProp.healthTip
            };

            const PAGE_W = doc.internal.pageSize.getWidth();
            const PAGE_H = doc.internal.pageSize.getHeight();
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
                TIP_BG: '#E0F2FE', // sky-100
                TIP_BORDER: '#7DD3FC', // sky-300
                TIP_TITLE: '#0C4A6E', // sky-900
                TIP_TEXT: '#075985' // sky-800
            };
            
            const drawNutriChefLogo = (doc: jsPDF, x: number, y: number, size: number) => {
                doc.setFillColor(COLORS.WHITE);
                doc.setDrawColor(COLORS.WHITE);
                const r = size / 2;
                const cx = x + r;
                const cy = y + r;
                doc.circle(cx, cy, r, 'F');
            };

            // --- HEADER ---
            doc.setFillColor(COLORS.HEADER_GREEN);
            doc.rect(0, 0, PAGE_W, 28, 'F');

            const logoSize = 10;
            const logoPadding = 4;
            drawNutriChefLogo(doc, MARGIN, (28 - logoSize) / 2, logoSize);
            
            const textStartX = MARGIN + logoSize + logoPadding;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.setTextColor(COLORS.WHITE);
            doc.text("NutriChef", textStartX, 14);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text(language === 'es' ? "Platos saludables con tus ingredientes, en segundos." : "Healthy meals from your ingredients, in seconds.", textStartX, 20);
            yPos = 28 + 10;

            // --- IMAGE ---
            if (recipeData.imageUrl) {
                try {
                    const { dataUrl, width, height } = await urlToDataUrl(recipeData.imageUrl);
                    const aspectRatio = width / height;
                    const imgWidth = 75; // Reduced image width
                    const imgHeight = imgWidth / aspectRatio;
                    const imgX = (PAGE_W - imgWidth) / 2;
                    doc.addImage(dataUrl, 'JPEG', imgX, yPos, imgWidth, imgHeight);
                    yPos += imgHeight + 6;
                } catch (e) {
                    console.error("Could not add image to PDF", e);
                    yPos += 6;
                }
            }

            // --- TITLE & DESC ---
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.setTextColor(COLORS.DARK_TEXT);
            const titleLines = doc.splitTextToSize(recipeData.title, CONTENT_W * 0.9);
            const titleHeight = doc.getTextDimensions(titleLines).h;
            doc.text(titleLines, PAGE_W / 2, yPos, { align: 'center' });
            yPos += titleHeight - 2;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(COLORS.MEDIUM_TEXT);
            const descLines = doc.splitTextToSize(recipeData.description, CONTENT_W * 0.95);
            const descHeight = doc.getTextDimensions(descLines).h;
            doc.text(descLines, PAGE_W / 2, yPos, { align: 'center' });
            yPos += descHeight + 6;

            // --- STATS BAR ---
            doc.setFillColor(COLORS.STATS_BG);
            doc.roundedRect(MARGIN, yPos, CONTENT_W, 18, 4, 4, 'F');
            const stats = [
                { label: t.servings.toUpperCase(), value: recipeData.stats.servings },
                { label: t.prep.toUpperCase(), value: recipeData.stats.prepTime },
                { label: t.cook.toUpperCase(), value: recipeData.stats.cookTime },
                { label: t.calories.toUpperCase(), value: recipeData.stats.calories },
            ];
            stats.forEach((stat, i) => {
                const colX = MARGIN + (CONTENT_W / 4) * (i + 0.5);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6);
                doc.setTextColor(COLORS.LIGHT_TEXT);
                doc.text(stat.label, colX, yPos + 7, { align: 'center' });
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                doc.setTextColor(COLORS.DARK_TEXT);
                doc.text(stat.value, colX, yPos + 13, { align: 'center' });
            });
            yPos += 18 + 5;

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
                doc.setFontSize(6);
                doc.setTextColor(COLORS.LIGHT_TEXT);
                doc.text(item.label, colX, yPos, { align: 'center' });
                doc.setFontSize(10);
                doc.setTextColor(COLORS.DARK_TEXT);
                doc.text(item.value, colX, yPos + 6, { align: 'center' });
                if (item.hasBar) {
                    doc.setFillColor(COLORS.HEADER_GREEN);
                    doc.rect(colX - 15, yPos + 10, 30, 2, 'F');
                }
            });
            yPos += 12 + 6;

            // --- 2-COLUMN LAYOUT ---
            const colStartY = yPos;
            const COL_GAP = 10;
            const COL_WIDTH = (CONTENT_W - COL_GAP) / 2;
            const COL1_X = MARGIN;
            const COL2_X = MARGIN + COL_WIDTH + COL_GAP;
            const lineHeight = 1.3;

            // Ingredients Column
            let yPosLeft = colStartY;
            doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(COLORS.DARK_TEXT);
            doc.text(t.ingredients, COL1_X, yPosLeft);
            yPosLeft += 5;
            doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(COLORS.MEDIUM_TEXT);
            recipeData.ingredients.forEach(ing => {
                const lines = doc.splitTextToSize(ing, COL_WIDTH - 5);
                const textHeight = doc.getTextDimensions(lines, { lineHeightFactor: lineHeight } as any).h;
                 if (yPosLeft + textHeight > PAGE_H - 25) { // Reserve space for tip & footer
                    return; 
                }
                doc.setFillColor(COLORS.HEADER_GREEN);
                doc.circle(COL1_X + 1.5, yPosLeft, 1, 'F');
                doc.text(lines, COL1_X + 5, yPosLeft, { lineHeightFactor: lineHeight });
                yPosLeft += textHeight + 2;
            });

            // Instructions Column
            let yPosRight = colStartY;
            doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(COLORS.DARK_TEXT);
            doc.text(t.instructions, COL2_X, yPosRight);
            yPosRight += 5;
            doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(COLORS.MEDIUM_TEXT);
            recipeData.instructions.forEach((step, i) => {
                const lines = doc.splitTextToSize(step, COL_WIDTH - 8);
                const textHeight = doc.getTextDimensions(lines, { lineHeightFactor: lineHeight } as any).h;
                if (yPosRight + textHeight > PAGE_H - 25) { // Reserve space for tip & footer
                    return;
                }
                doc.setFillColor(COLORS.HEADER_GREEN);
                doc.circle(COL2_X + 2.5, yPosRight + 1, 2.5, 'F');
                doc.setTextColor(COLORS.WHITE).setFont('helvetica', 'bold').setFontSize(7);
                doc.text(String(i + 1), COL2_X + 2.5, yPosRight + 2.2, { align: 'center' });
                doc.setTextColor(COLORS.MEDIUM_TEXT).setFont('helvetica', 'normal').setFontSize(8);
                doc.text(lines, COL2_X + 8, yPosRight, { lineHeightFactor: lineHeight });
                yPosRight += textHeight + 3;
            });
            
            yPos = Math.max(yPosLeft, yPosRight) + 5;
            
            // --- HEALTHY TIP ---
            if (recipeData.healthTip) {
                const tipBoxPadding = 4;
                const tipTitleLines = doc.setFont('helvetica', 'bold').setFontSize(9).splitTextToSize(t.healthyTip, CONTENT_W - (tipBoxPadding * 2));
                const tipTitleHeight = doc.getTextDimensions(tipTitleLines).h;
                const tipBodyLines = doc.setFont('helvetica', 'normal').setFontSize(8).splitTextToSize(recipeData.healthTip, CONTENT_W - (tipBoxPadding * 2));
                const tipBodyHeight = doc.getTextDimensions(tipBodyLines).h;
                const totalTipHeight = tipTitleHeight + tipBodyHeight + tipBoxPadding * 2 + 2;

                if (yPos + totalTipHeight < PAGE_H - 15) { // Check if it fits before footer
                    doc.setFillColor(COLORS.TIP_BG);
                    doc.setDrawColor(COLORS.TIP_BORDER);
                    doc.setLineWidth(0.25);
                    doc.roundedRect(MARGIN, yPos, CONTENT_W, totalTipHeight, 3, 3, 'FD');

                    let tipTextY = yPos + tipBoxPadding + 1;
                    doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(COLORS.TIP_TITLE);
                    doc.text(tipTitleLines, MARGIN + tipBoxPadding, tipTextY);
                    tipTextY += tipTitleHeight;

                    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(COLORS.TIP_TEXT);
                    doc.text(tipBodyLines, MARGIN + tipBoxPadding, tipTextY);
                }
            }
            
            // --- FOOTER ---
            doc.setFontSize(8).setTextColor(COLORS.LIGHT_TEXT);
            doc.text("Generated by NutriChef", PAGE_W / 2, PAGE_H - 8, { align: 'center' });
            
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
                 <ImagePlaceholder 
                    state={recipe.imageState} 
                    language={language} 
                    onGenerateClick={() => onGenerateImage(recipe.id)} 
                />
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