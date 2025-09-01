import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { Recipe, ImageState } from './types';
import { generateRecipes, generateRecipeImage, identifyIngredientsFromImage, translateRecipe } from './services/geminiService';
import IngredientInput from './components/IngredientInput';
import RecipeCard from './components/RecipeCard';
import Spinner from './components/Spinner';
import ConfirmationModal from './components/ConfirmationModal';
import pako from 'pako';

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
        loadingRecipes: "Crafting healthy recipes...",
        loadingImages: "Plating your healthy dish...",
        myFavoriteRecipes: "My Favorite Recipes",
        scanning: "Scanning...",
        linkCopied: "Link copied to clipboard!",
        sharedRecipeTitle: "A Recipe Shared With You",
        backToGenerator: "Back to Recipe Generator",
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
        loadingRecipes: "Creando recetas saludables...",
        loadingImages: "Emplatando tu plato saludable...",
        myFavoriteRecipes: "Mis Recetas Favoritas",
        scanning: "Escaneando...",
        linkCopied: "¡Enlace copiado al portapapeles!",
        sharedRecipeTitle: "Una Receta Compartida Contigo",
        backToGenerator: "Volver al Generador de Recetas",
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

// --- Data Compaction/Expansion for Sharing ---
const compactRecipe = (recipe: Omit<Recipe, 'imageUrl' | 'imageState'>) => {
    return {
        v: 1, // Version number
        id: recipe.id,
        n: recipe.recipeName,
        d: recipe.description,
        g: recipe.ingredients.map(i => [i.name, i.quantity, i.isStaple ? 1 : 0]), // ingredients
        i: recipe.instructions, // instructions
        pt: recipe.prepTime,
        ct: recipe.cookTime,
        c: recipe.calories,
        df: recipe.difficulty,
        h: recipe.healthTip,
        s: recipe.servings,
        nu: recipe.nutrition ? [recipe.nutrition.protein, recipe.nutrition.carbs, recipe.nutrition.fats] : undefined,
    };
};

const expandRecipe = (compact: any): Omit<Recipe, 'imageState'> => {
    if (compact.v !== 1) throw new Error("Unsupported recipe version");
    return {
        id: compact.id,
        recipeName: compact.n,
        description: compact.d,
        ingredients: compact.g.map((i: [string, string, number]) => ({
            name: i[0],
            quantity: i[1],
            isStaple: i[2] === 1,
        })),
        instructions: compact.i,
        prepTime: compact.pt,
        cookTime: compact.ct,
        calories: compact.c,
        difficulty: compact.df,
        healthTip: compact.h,
        servings: compact.s,
        nutrition: compact.nu ? {
            protein: compact.nu[0],
            carbs: compact.nu[1],
            fats: compact.nu[2],
        } : undefined,
    };
};


const NutriChefLogo = () => (
    <div className="bg-black w-12 h-12 flex items-center justify-center rounded-lg shadow-md">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 18H18V20H6V18Z"/>
            <path d="M12 2C9.24 2 7 4.24 7 7C7 8.33 7.55 9.51 8.44 10.33C7.58 10.74 7 11.55 7 12.5V17H17V12.5C17 11.55 16.42 10.74 15.56 10.33C16.45 9.51 17 8.33 17 7C17 4.24 14.76 2 12 2ZM12 9C10.9 9 10 8.1 10 7C10 5.9 10.9 5 12 5C13.1 5 14 5.9 14 7C14 8.1 13.1 9 12 9Z"/>
        </svg>
    </div>
);


const App: React.FC = () => {
    const [ingredients, setIngredients] = useState<string[]>([]);
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [favoriteRecipes, setFavoriteRecipes] = useState<Recipe[]>(() => {
        try {
            const savedFavorites = localStorage.getItem('nutriChefFavorites');
            const parsed = savedFavorites ? JSON.parse(savedFavorites) : [];
            // Add imageState to old favorites for compatibility
            return parsed.map((r: Recipe) => ({ ...r, imageState: r.imageUrl ? 'success' : 'error' }));
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
        const params = new URLSearchParams(window.location.search);
        const recipeData = params.get('recipe');
        if (recipeData) {
            try {
                const decodedData = atob(recipeData);
                const charData = decodedData.split('').map(c => c.charCodeAt(0));
                const binaryData = new Uint8Array(charData);
                const decompressed = pako.inflate(binaryData, { to: 'string' });
                const compact = JSON.parse(decompressed);
                const decodedRecipe = expandRecipe(compact);

                setSharedRecipe({ ...decodedRecipe, imageState: 'loading' });
                window.history.replaceState({}, document.title, window.location.pathname);

                (async () => {
                    try {
                        const imageUrl = await generateRecipeImage(decodedRecipe.recipeName, decodedRecipe.description);
                        setSharedRecipe(currentRecipe => 
                            currentRecipe && currentRecipe.id === decodedRecipe.id 
                                ? { ...currentRecipe, imageUrl, imageState: 'success' } 
                                : currentRecipe
                        );
                    } catch (imgErr) {
                         console.error(`Failed to regenerate image for shared recipe "${decodedRecipe.recipeName}":`, imgErr);
                         if (imgErr instanceof Error) {
                            if (imgErr.message === "QUOTA_EXCEEDED") {
                                setError(t.errorQuotaExceeded);
                                setSharedRecipe(current => current ? { ...current, imageState: 'error_quota' } : null);
                            } else if (imgErr.message === 'API_KEY_INVALID') {
                                setError(t.errorApiKey);
                                setSharedRecipe(current => current ? { ...current, imageState: 'error' } : null);
                            } else {
                                setError(t.errorImageGeneration);
                                setSharedRecipe(current => current ? { ...current, imageState: 'error' } : null);
                            }
                        } else {
                             setError(t.errorContent);
                             setSharedRecipe(current => current ? { ...current, imageState: 'error' } : null);
                        }
                    }
                })();

            } catch (e) {
                console.error("Failed to parse shared recipe:", e);
            }
        } else {
            setIngredients(getRandomIngredients());
        }
    }, []);

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
                    recipeToAdd.imageState = recipeToAdd.imageUrl ? 'success' : 'error';
                }
                return [...prev, recipeToAdd];
            }
        });
    };

    const handleGenerateRecipes = useCallback(async () => {
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
            const recipesWithIds = generated.map(r => ({ ...r, id: `recipe-${Date.now()}-${Math.random()}`, imageState: 'loading' as ImageState }));
            setRecipes(recipesWithIds);
            setLoadingMessage(t.loadingImages);

            for (const recipe of recipesWithIds) {
                try {
                    const imageUrl = await generateRecipeImage(recipe.recipeName, recipe.description);
                    setRecipes(currentRecipes =>
                        currentRecipes.map(r =>
                            r.id === recipe.id ? { ...r, imageUrl, imageState: 'success' as const } : r
                        )
                    );
                } catch (imgErr) {
                    if (imgErr instanceof Error) {
                        // Handle fatal, gracefully handled errors without logging
                        if (imgErr.message === "QUOTA_EXCEEDED") {
                            setError(t.errorQuotaExceeded);
                            setRecipes(current => current.map(r =>
                                r.imageState === 'loading' ? { ...r, imageState: 'error_quota' as const } : r
                            ));
                            break; 
                        } 
                        if (imgErr.message === 'API_KEY_INVALID') {
                            setError(t.errorApiKey);
                            setRecipes(current => current.map(r => r.imageState === 'loading' ? { ...r, imageState: 'error' as const } : r));
                            break;
                        }
                        
                        // Handle other, non-fatal image generation errors (and log them)
                        console.error(`Failed to generate image for "${recipe.recipeName}":`, imgErr);
                        setError(t.errorImageGeneration);
                        setRecipes(currentRecipes =>
                            currentRecipes.map(r =>
                                r.id === recipe.id ? { ...r, imageState: 'error' as const } : r
                            )
                        );
                    } else {
                        // Handle and log unknown errors
                        console.error(`An unknown error occurred while generating image for "${recipe.recipeName}":`, imgErr);
                        setError(t.errorContent);
                        setRecipes(current => current.map(r => r.imageState === 'loading' ? { ...r, imageState: 'error' as const } : r));
                        break;
                    }
                }
            }
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
        const { imageUrl, imageState, ...recipeToShare } = recipe;
        const compacted = compactRecipe(recipeToShare);
        const recipeString = JSON.stringify(compacted);
        const compressed = pako.deflate(recipeString);
        const encodedString = btoa(String.fromCharCode.apply(null, Array.from(compressed)));

        const safeEncodedString = encodeURIComponent(encodedString);
        const url = `${window.location.origin}${window.location.pathname}?recipe=${safeEncodedString}`;

        try {
            await navigator.clipboard.writeText(url);
            setShowCopyToast(true);
            setTimeout(() => setShowCopyToast(false), 3000);
        } catch (error) {
            console.error("Failed to copy link:", error);
            alert("Failed to copy link.");
        }
    }, []);

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
                    <p className="font-bold">{t.errorTitle}</p>
                    <p>{error}</p>
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
                 />}
            </div>
             <div className="text-center mt-12">
                <button
                    onClick={() => setSharedRecipe(null)}
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
                <header className="w-full max-w-5xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-5">
                    <div className="flex items-center gap-4">
                        <NutriChefLogo />
                        <div>
                            <h1 className="text-3xl font-bold text-white tracking-tight">
                                {t.title}
                            </h1>
                            <p className="text-md text-green-100">{t.subtitle}</p>
                        </div>
                    </div>
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
                </header>
            </div>

            <main className="w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
                {sharedRecipe ? renderSharedRecipe() : renderGenerator()}
            </main>
        </div>
    );
};

export default App;