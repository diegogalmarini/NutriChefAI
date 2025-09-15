import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { Recipe, ImageState } from './types';
import { generateRecipes, generateRecipeImage, identifyIngredientsFromImage, translateRecipe, saveSharedRecipe, getSharedRecipe } from './services/geminiService';
import IngredientInput from './components/IngredientInput';
import RecipeCard from './components/RecipeCard';
import Spinner from './components/Spinner';
import ConfirmationModal from './components/ConfirmationModal';
import NutriChefLogo from './components/NutriChefLogo';

const locales = {
    en: {
        title: "NutriChef",
        subtitle: "Healthy meals from your ingredients, in seconds.",
        yourIngredients: "Your Ingredients",
        generate: "Generate Healthy Recipes",
        generating: "Generating...",
        addPlaceholder: "e.g., Quinoa, Broccoli, Chicken",
        add: "Add",
        errorTitle: "Oops!",
        errorContent: "An unknown error occurred.",
        errorEmptyIngredients: "Please add at least one ingredient to generate a healthy recipe.",
        errorQuotaExceeded: "Image generation quota exceeded. Please check your plan and billing details.",
        errorGeneration: "Failed to generate recipes. The AI chef might be on a break. Please check your ingredients and try again.",
        errorImageGeneration: "Failed to create a healthy image for the recipe. Please try again.",
        errorApiKey: "The application is not configured correctly. Please contact the administrator.",
        errorIdentification: "Failed to identify ingredients from the image. Please try another photo.",
        errorOffline: "You appear to be offline. Please check your internet connection.",
        errorSharedRecipeNotFound: "The shared recipe could not be found or has expired.",
        loadingRecipes: "Crafting healthy recipes...",
        loadingImages: "Plating your healthy dish...",
        myFavoriteRecipes: "My Favorite Recipes",
        scanning: "Scanning...",
        linkCopied: "Link copied to clipboard!",
        sharedRecipeTitle: "A Recipe Shared With You",
        backToGenerator: "Back to Recipe Generator",
        retry: "Retry",
    },
    es: {
        title: "NutriChef",
        subtitle: "Platos saludables con tus ingredientes, en segundos.",
        yourIngredients: "Tus Ingredientes",
        generate: "Generar Recetas Saludables",
        generating: "Generando...",
        addPlaceholder: "Ej: Quinoa, Brócoli, Pollo",
        add: "Añadir",
        errorTitle: "¡Ups!",
        errorContent: "Ocurrió un error desconocido.",
        errorEmptyIngredients: "Por favor, añade al menos un ingrediente para generar una receta saludable.",
        errorQuotaExceeded: "Se ha excedido la cuota de generación de imágenes. Revisa tu plan y detalles de facturación.",
        errorGeneration: "No se pudieron generar las recetas. El chef de IA podría estar en un descanso. Revisa tus ingredientes e inténtalo de nuevo.",
        errorImageGeneration: "No se pudo crear una imagen para la receta. Por favor, inténtalo de nuevo.",
        errorApiKey: "La aplicación no está configurada correctamente. Por favor, contacta al administrador.",
        errorIdentification: "No se pudieron identificar los ingredientes de la imagen. Por favor, intenta con otra foto.",
        errorOffline: "Parece que no tienes conexión. Por favor, revisa tu conexión a internet.",
        errorSharedRecipeNotFound: "La receta compartida no se pudo encontrar o ha expirado.",
        loadingRecipes: "Creando recetas saludables...",
        loadingImages: "Emplatando tu plato saludable...",
        myFavoriteRecipes: "Mis Recetas Favoritas",
        scanning: "Escaneando...",
        linkCopied: "¡Enlace copiado al portapapeles!",
        sharedRecipeTitle: "Una Receta Compartida Contigo",
        backToGenerator: "Volver al Generador de Recetas",
        retry: "Reintentar",
    }
};

const allIngredients = {
    en: {
        proteins: ['Chicken Breast', 'Salmon', 'Tofu', 'Black Beans', 'Greek Yogurt', 'Eggs', 'Lentils'],
        vegetables: ['Broccoli', 'Spinach', 'Kale', 'Bell Pepper', 'Onion', 'Tomato', 'Sweet Potato', 'Zucchini'],
        carbsFats: ['Quinoa', 'Brown Rice', 'Avocado', 'Olive Oil', 'Almonds', 'Oats']
    },
    es: {
        proteins: ['Pechuga de Pollo', 'Salmón', 'Tofu', 'Frijoles Negros', 'Yogur Griego', 'Huevos', 'Lentejas'],
        vegetables: ['Brócoli', 'Espinacas', 'Kale', 'Pimiento', 'Cebolla', 'Tomate', 'Batata', 'Calabacín'],
        carbsFats: ['Quinoa', 'Arroz Integral', 'Aguacate', 'Aceite de Oliva', 'Almendras', 'Avena']
    }
};

const allEnIngredients = [
    ...allIngredients.en.proteins,
    ...allIngredients.en.vegetables,
    ...allIngredients.en.carbsFats,
];
const allEsIngredients = [
    ...allIngredients.es.proteins,
    ...allIngredients.es.vegetables,
    ...allIngredients.es.carbsFats,
];

const getRandomIngredients = (): string[] => {
    const { proteins, vegetables, carbsFats } = allIngredients.es; // Default to Spanish
    const randomProtein = proteins[Math.floor(Math.random() * proteins.length)];
    const randomVegetable = vegetables[Math.floor(Math.random() * vegetables.length)];
    const randomCarbFat = carbsFats[Math.floor(Math.random() * carbsFats.length)];
    return [randomProtein, randomVegetable, randomCarbFat];
};

const App: React.FC = () => {
    const [ingredients, setIngredients] = useState<string[]>([]);
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [favoriteRecipes, setFavoriteRecipes] = useState<Recipe[]>(() => {
        try {
            const savedFavorites = localStorage.getItem('nutriChefFavorites');
            const parsed = savedFavorites ? JSON.parse(savedFavorites) : [];
            // Add imageState to old favorites for compatibility
            return parsed.map((r: Recipe) => ({ ...r, imageState: r.imageUrl ? 'success' : 'idle' }));
        } catch (error) {
            console.error("Could not load favorites from localStorage", error);
            return [];
        }
    });
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [language, setLanguage] = useState<'en' | 'es'>('es');
    const [sharedRecipe, setSharedRecipe] = useState<Recipe | null>(null);
    const [isScanning, setIsScanning] = useState<boolean>(false);
    const [detectedIngredients, setDetectedIngredients] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [showCopyToast, setShowCopyToast] = useState<boolean>(false);
    
    const prevLangRef = useRef(language);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const t = locales[language];
    
    useEffect(() => {
        try {
            localStorage.setItem('nutriChefFavorites', JSON.stringify(favoriteRecipes));
        } catch (error) {
            console.error("Could not save favorites to localStorage", error);
        }
    }, [favoriteRecipes]);

    useEffect(() => {
        const hash = window.location.hash;
        const match = hash.match(/^#\/share\/([a-zA-Z0-9]+)$/);

        if (match) {
            const recipeId = match[1];
            (async () => {
                try {
                    const recipe = await getSharedRecipe(recipeId);
                    setSharedRecipe(recipe);
                    // Clean the URL so a refresh doesn't try to load the shared recipe again
                    window.history.replaceState({}, document.title, window.location.pathname);
                } catch (e) {
                    console.error("Failed to load shared recipe:", e);
                    setError(t.errorSharedRecipeNotFound);
                    // Also clean the URL on error
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            })();
        } else {
            // Default behavior if no shared recipe is in the URL
            setIngredients(getRandomIngredients());
        }
    }, []); // Only run on initial app load

    useEffect(() => {
        const prevLang = prevLangRef.current;
        if (prevLang === language) {
            return; // Don't run on initial render or if language hasn't changed
        }
    
        // --- 1. Translate Input Ingredients ---
        if (!sharedRecipe) {
            const translateIngredient = (ingredient: string): string => {
                const lowerCaseIngredient = ingredient.toLowerCase();
                let index = -1;
                if (prevLang === 'en' && language === 'es') {
                    index = allEnIngredients.findIndex(ing => ing.toLowerCase() === lowerCaseIngredient);
                    if (index !== -1) return allEsIngredients[index];
                } else if (prevLang === 'es' && language === 'en') {
                    index = allEsIngredients.findIndex(ing => ing.toLowerCase() === lowerCaseIngredient);
                    if (index !== -1) return allEnIngredients[index];
                }
                return ingredient;
            };
            setIngredients(currentIngredients => currentIngredients.map(translateIngredient));
        }
    
        // --- 2. Translate Displayed Recipes ---
        const translateAllRecipes = async () => {
            const translateList = (list: Recipe[]) => Promise.all(
                list.map(async (recipe) => {
                    // Pass both source and target language for accurate translation
                    const translatedFields = await translateRecipe(recipe, language, prevLang);
                    return { ...recipe, ...translatedFields };
                })
            );
    
            // Use non-blocking promises to update each list
            if (recipes.length > 0) {
                translateList(recipes).then(setRecipes);
            }
            if (favoriteRecipes.length > 0) {
                translateList(favoriteRecipes).then(setFavoriteRecipes);
            }
            if (sharedRecipe) {
                translateList([sharedRecipe]).then(translated => setSharedRecipe(translated[0]));
            }
        };
    
        translateAllRecipes();
        prevLangRef.current = language;
    }, [language]); // This effect should ONLY run when the language changes


    const handleAddIngredient = (ingredient: string) => {
        if (ingredient && !ingredients.map(i => i.toLowerCase()).includes(ingredient.toLowerCase())) {
            setIngredients([...ingredients, ingredient]);
        }
    };
    
    const handleAddMultipleIngredients = (newIngredients: string[]) => {
        const uniqueNewIngredients = newIngredients.filter(newIng => 
            !ingredients.map(i => i.toLowerCase()).includes(newIng.toLowerCase())
        );
        setIngredients(prev => [...prev, ...uniqueNewIngredients]);
    };

    const handleRemoveIngredient = (ingredientToRemove: string) => {
        setIngredients(ingredients.filter(ingredient => ingredient !== ingredientToRemove));
    };

    const handleToggleFavorite = (recipeToToggle: Recipe) => {
        setFavoriteRecipes(prev => {
            const isFavorited = prev.some(r => r.id === recipeToToggle.id);
            if (isFavorited) {
                return prev.filter(r => r.id !== recipeToToggle.id);
            } else {
                 const recipeToAdd = { ...recipeToToggle };
                if (!recipeToAdd.imageState) {
                    recipeToAdd.imageState = recipeToAdd.imageUrl ? 'success' : 'idle';
                }
                return [...prev, recipeToAdd];
            }
        });
    };

    const handleGenerateRecipes = useCallback(async () => {
        if (!navigator.onLine) {
            setError(t.errorOffline);
            return;
        }
        if (ingredients.length === 0) {
            setError(t.errorEmptyIngredients);
            return;
        }
        setIsLoading(true);
        setLoadingMessage(t.loadingRecipes);
        setError(null);
        setRecipes([]);
        try {
            const generated = await generateRecipes(ingredients, language);
            const recipesWithIds = generated.map(r => ({ ...r, id: `recipe-${Date.now()}-${Math.random()}`, imageState: 'idle' as ImageState }));
            setRecipes(recipesWithIds);
            
        } catch (err) {
            if (err instanceof Error) {
                switch(err.message) {
                    case 'API_KEY_INVALID':
                        setError(t.errorApiKey);
                        break;
                    case 'GENERATION_FAILED':
                        setError(t.errorGeneration);
                        break;
                    default:
                        setError(err.message);
                }
            } else {
                setError(t.errorContent);
            }
        } finally {
            setIsLoading(false);
        }
    }, [ingredients, language, t]);

    const handleGenerateImageForRecipe = useCallback(async (recipeId: string) => {
        const recipeToUpdate = [...recipes, ...favoriteRecipes].find(r => r.id === recipeId);
        if (!recipeToUpdate) {
            console.error("Recipe not found for image generation:", recipeId);
            return;
        }

        const updateRecipeState = (id: string, updates: Partial<Recipe>) => {
            setRecipes(current => current.map(r => r.id === id ? { ...r, ...updates } : r));
            setFavoriteRecipes(current => current.map(r => r.id === id ? { ...r, ...updates } : r));
        };

        updateRecipeState(recipeId, { imageState: 'loading' });
        setError(null); // Clear previous errors

        try {
            const imageUrl = await generateRecipeImage(recipeToUpdate.recipeName, recipeToUpdate.description);
            updateRecipeState(recipeId, { imageUrl, imageState: 'success' });
        } catch (imgErr) {
            let errorState: ImageState = 'error';
            let errorMessage = t.errorImageGeneration;

            if (imgErr instanceof Error) {
                 if (imgErr.message === "QUOTA_EXCEEDED") {
                    errorState = 'error_quota';
                    errorMessage = t.errorQuotaExceeded;
                } else if (imgErr.message === 'API_KEY_INVALID') {
                    errorMessage = t.errorApiKey;
                }
            } else {
                 errorMessage = t.errorContent;
            }
            
            setError(errorMessage);
            updateRecipeState(recipeId, { imageState: errorState });
        }
    }, [recipes, favoriteRecipes, language, t]);


    const handleScanRequest = () => {
        fileInputRef.current?.click();
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        setError(null);

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            try {
                const base64String = (reader.result as string).split(',')[1];
                const identified = await identifyIngredientsFromImage(base64String, file.type, language);
                setDetectedIngredients(identified);
                setIsModalOpen(true);
            } catch (err) {
                 if (err instanceof Error) {
                    switch(err.message) {
                        case 'API_KEY_INVALID':
                            setError(t.errorApiKey);
                            break;
                        case 'IDENTIFICATION_FAILED':
                            setError(t.errorIdentification);
                            break;
                        default:
                             setError(err.message);
                    }
                 } else {
                    setError(t.errorContent);
                 }
            } finally {
                setIsScanning(false);
                if(fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.onerror = () => {
             setError(t.errorContent);
             setIsScanning(false);
        };
    };
    
    const handleShareRecipe = useCallback(async (recipe: Recipe) => {
        try {
            const { id, imageState, ...recipeToShare } = recipe;

            // 1. Call the service to save the recipe and get a short ID
            const sharedId = await saveSharedRecipe(recipeToShare, recipe.imageUrl);

            // 2. Construct the new, clean URL using a hash for SPA routing
            const url = `${window.location.origin}${window.location.pathname}#/share/${sharedId}`;

            // 3. Copy the URL to the clipboard and show a confirmation toast
            await navigator.clipboard.writeText(url);
            setShowCopyToast(true);
            setTimeout(() => setShowCopyToast(false), 3000);
        } catch (error) {
            console.error("Failed to create share link:", error);
            setError(t.errorContent); // Show a generic error to the user
        }
    }, [t]);

    const renderGenerator = () => (
        <>
            <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg p-6 md:p-8 mb-8 border border-slate-200">
                <h2 className="text-2xl font-semibold text-slate-700 mb-4">{t.yourIngredients}</h2>
                <IngredientInput
                    ingredients={ingredients}
                    onAddIngredient={handleAddIngredient}
                    onRemoveIngredient={handleRemoveIngredient}
                    placeholder={t.addPlaceholder}
                    addButtonText={t.add}
                    onScanRequest={handleScanRequest}
                    isScanning={isScanning}
                />
                <button
                    onClick={handleGenerateRecipes}
                    disabled={isLoading || ingredients.length === 0}
                    className="mt-6 w-full flex items-center justify-center gap-3 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 disabled:bg-green-300 disabled:cursor-not-allowed transform hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-green-300 shadow-lg hover:shadow-xl"
                >
                    {isLoading ? (
                        <>
                            <Spinner />
                            {loadingMessage || t.generating}
                        </>
                    ) : t.generate}
                </button>
            </div>

            {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-md mb-6" role="alert">
                    <div className="flex justify-between items-start gap-4">
                        <div>
                            <p className="font-bold">{t.errorTitle}</p>
                            <p>{error}</p>
                        </div>
                        {error === t.errorGeneration && (
                            <button
                                onClick={handleGenerateRecipes}
                                disabled={isLoading}
                                className="bg-red-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600 transition-colors whitespace-nowrap disabled:bg-red-300"
                            >
                                {t.retry}
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className="space-y-16">
                {recipes.map((recipe) => (
                    <RecipeCard 
                      key={recipe.id} 
                      recipe={recipe} 
                      language={language}
                      onToggleFavorite={handleToggleFavorite}
                      isFavorite={favoriteRecipes.some(fav => fav.id === recipe.id)}
                      onShare={handleShareRecipe}
                      onGenerateImage={handleGenerateImageForRecipe}
                    />
                ))}
            </div>

            {favoriteRecipes.length > 0 && (
                <section className="mt-24">
                    <h2 className="text-4xl font-bold text-slate-800 text-center mb-12">{t.myFavoriteRecipes}</h2>
                    <div className="space-y-16">
                        {favoriteRecipes.map((recipe) => (
                            <RecipeCard 
                                key={recipe.id} 
                                recipe={recipe} 
                                language={language}
                                onToggleFavorite={handleToggleFavorite}
                                isFavorite={true}
                                onShare={handleShareRecipe}
                                onGenerateImage={handleGenerateImageForRecipe}
                            />
                        ))}
                    </div>
                </section>
            )}
        </>
    );
    
    const renderSharedRecipe = () => (
        <div>
            <h2 className="text-4xl font-bold text-slate-800 text-center mb-12">{t.sharedRecipeTitle}</h2>
            <div className="max-w-5xl mx-auto">
                 {sharedRecipe && <RecipeCard 
                    key={sharedRecipe.id} 
                    recipe={sharedRecipe} 
                    language={language}
                    onToggleFavorite={handleToggleFavorite}
                    isFavorite={favoriteRecipes.some(fav => fav.id === sharedRecipe.id)}
                    onShare={handleShareRecipe}
                    onGenerateImage={handleGenerateImageForRecipe}
                 />}
            </div>
             <div className="text-center mt-12">
                <button
                    onClick={() => {
                        setSharedRecipe(null);
                        // Ensure the hash is cleared from the URL when going back
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300"
                >
                    {t.backToGenerator}
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen font-sans">
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
            <ConfirmationModal 
                isOpen={isModalOpen}
                initialIngredients={detectedIngredients}
                onConfirm={handleAddMultipleIngredients}
                onClose={() => setIsModalOpen(false)}
                language={language}
             />
            {showCopyToast && (
                <div className="fixed bottom-6 right-6 bg-slate-800 text-white py-2 px-4 rounded-lg shadow-lg z-50 animate-fade-in-out">
                    {t.linkCopied}
                </div>
            )}
            
            <div className="w-full bg-green-500">
                <header className="w-full max-w-5xl mx-auto flex flex-col sm:flex-row items-center sm:justify-between gap-4 px-4 sm:px-6 lg:px-8 py-5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 flex items-center justify-center">
                            <NutriChefLogo />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white tracking-tight">
                                {t.title}
                            </h1>
                            <p className="text-md text-green-100">{t.subtitle}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex gap-1 bg-green-600/50 rounded-full p-1">
                            <button
                                onClick={() => setLanguage('es')}
                                className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${language === 'es' ? 'bg-white text-green-600' : 'text-white hover:bg-green-500/80'}`}
                                aria-label="Cambiar a Español"
                            >
                                ES
                            </button>
                            <button
                                onClick={() => setLanguage('en')}
                                className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${language === 'en' ? 'bg-white text-green-600' : 'text-white hover:bg-green-500/80'}`}
                                aria-label="Switch to English"
                            >
                                EN
                            </button>
                        </div>
                        <a href="https://github.com/diegogalmarini/NutriChefAI" target="_blank" rel="noopener noreferrer" aria-label="View source code on GitHub" title="View source code on GitHub">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white hover:text-green-200 transition-colors">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                            </svg>
                        </a>
                        <a href="https://ai.studio/apps/drive/1IwLe9osCWkeonwjZj8PHEDiPpYw9t707" target="_blank" rel="noopener noreferrer" aria-label="Open in AI Studio" title="Open in AI Studio">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white hover:text-green-200 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                             <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 22.5l-.648-1.938a3.375 3.375 0 00-2.684-2.684L11.25 18l1.938-.648a3.375 3.375 0 002.684-2.684L16.25 13l.648 1.938a3.375 3.375 0 002.684 2.684L21.5 18l-1.938.648a3.375 3.375 0 00-2.684 2.684z" />
                           </svg>
                        </a>
                    </div>
                </header>
            </div>

            <main className="w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
                {sharedRecipe ? renderSharedRecipe() : renderGenerator()}
            </main>
        </div>
    );
};

export default App;