
import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { Recipe } from './types';
import { generateRecipes, generateRecipeImage, identifyIngredientsFromImage } from './services/geminiService';
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
    const { proteins, vegetables, carbsFats } = allIngredients.en;
    const randomProtein = proteins[Math.floor(Math.random() * proteins.length)];
    const randomVegetable = vegetables[Math.floor(Math.random() * vegetables.length)];
    const randomCarbFat = carbsFats[Math.floor(Math.random() * carbsFats.length)];
    return [randomProtein, randomVegetable, randomCarbFat];
};

// --- Data Compaction/Expansion for Sharing ---
const compactRecipe = (recipe: Omit<Recipe, 'imageUrl'>) => {
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

const expandRecipe = (compact: any): Recipe => {
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
    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-600">
        <path d="M14.5 13.25C14.5 12.0074 15.5074 11 16.75 11C17.9926 11 19 12.0074 19 13.25V21H14.5V13.25Z" fill="currentColor" fillOpacity="0.3"/>
        <path d="M5 13.25C5 12.0074 6.00736 11 7.25 11C8.49264 11 9.5 12.0074 9.5 13.25V21H5V13.25Z" fill="currentColor" fillOpacity="0.3"/>
        <path d="M9.5 16.25C9.5 15.0074 10.5074 14 11.75 14C12.9926 14 14 15.0074 14 16.25V21H9.5V16.25Z" fill="currentColor" fillOpacity="0.3"/>
        <path fillRule="evenodd" clipRule="evenodd" d="M12 3.25C12.4142 3.25 12.75 3.58579 12.75 4V8.53554C13.9926 8.53554 15 9.5429 15 10.7855V11.25H9V10.7855C9 9.5429 10.0074 8.53554 11.25 8.53554V4C11.25 3.58579 11.5858 3.25 12 3.25ZM16.5 9.75C16.9142 9.75 17.25 10.0858 17.25 10.5V11.25H19.5V10.75C19.5 8.67893 17.8211 7 15.75 7C14.7364 7 13.844 7.39953 13.187 8.03153C12.8256 8.2431 12.7214 8.7402 12.933 9.10157C13.1445 9.46294 13.6417 9.5671 14.0031 9.35553C14.4442 9.10023 14.9546 8.97341 15.5 9.00638V9.75H16.5ZM8.5 7C6.42893 7 4.75 8.67893 4.75 10.75V11.25H7V10.5C7 10.0858 7.33579 9.75 7.75 9.75H8.5V9.00638C9.04543 8.97341 9.55578 9.10023 9.99691 9.35553C10.3583 9.5671 10.8555 9.46294 11.067 9.10157C11.2786 8.7402 11.1744 8.2431 10.813 8.03153C10.156 7.39953 9.26359 7 8.25 7H8.5Z" fill="currentColor"/>
    </svg>
);


const App: React.FC = () => {
    const [ingredients, setIngredients] = useState<string[]>([]);
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [favoriteRecipes, setFavoriteRecipes] = useState<Recipe[]>(() => {
        try {
            const savedFavorites = localStorage.getItem('nutriChefFavorites');
            return savedFavorites ? JSON.parse(savedFavorites) : [];
        } catch (error) {
            console.error("Could not load favorites from localStorage", error);
            return [];
        }
    });
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [language, setLanguage] = useState<'en' | 'es'>('en');
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

                setSharedRecipe(decodedRecipe);
                window.history.replaceState({}, document.title, window.location.pathname);

                (async () => {
                    try {
                        const imageUrl = await generateRecipeImage(decodedRecipe.recipeName, decodedRecipe.description);
                        setSharedRecipe(currentRecipe => 
                            currentRecipe && currentRecipe.id === decodedRecipe.id 
                                ? { ...currentRecipe, imageUrl } 
                                : currentRecipe
                        );
                    } catch (imgErr) {
                         console.error(`Failed to regenerate image for shared recipe "${decodedRecipe.recipeName}":`, imgErr);
                         if (imgErr instanceof Error && imgErr.message.includes("quota exceeded")) {
                            setError(t.errorQuotaExceeded);
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
        if (prevLang === language || sharedRecipe) return;

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
        prevLangRef.current = language;
    }, [language, sharedRecipe]);


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
                return [...prev, recipeToToggle];
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
            const recipesWithIds = generated.map(r => ({ ...r, id: `recipe-${Date.now()}-${Math.random()}` }));
            setRecipes(recipesWithIds); 
            setLoadingMessage(t.loadingImages);

            for (const recipe of recipesWithIds) {
                try {
                    const imageUrl = await generateRecipeImage(recipe.recipeName, recipe.description);
                    setRecipes(currentRecipes =>
                        currentRecipes.map(r =>
                            r.id === recipe.id ? { ...r, imageUrl } : r
                        )
                    );
                } catch (imgErr) {
                    console.error(`Failed to generate image for "${recipe.recipeName}":`, imgErr);
                    if (imgErr instanceof Error && imgErr.message.includes("quota exceeded")) {
                        setError(t.errorQuotaExceeded);
                        break;
                    }
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : t.errorContent);
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
                 setError(err instanceof Error ? err.message : t.errorContent);
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
        const { imageUrl, ...recipeToShare } = recipe;
        const compacted = compactRecipe(recipeToShare);
        const recipeString = JSON.stringify(compacted);
        const compressed = pako.deflate(recipeString);
        const encodedString = btoa(String.fromCharCode.apply(null, Array.from(compressed)));

        const url = `${window.location.origin}${window.location.pathname}?recipe=${encodedString}`;

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
            <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg p-6 md:p-8 mb-8 border border-slate-200">
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

            <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
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
                <section className="mt-16">
                    <h2 className="text-3xl font-bold text-slate-800 text-center mb-8">{t.myFavoriteRecipes}</h2>
                    <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
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
        <div className="w-full">
            <h2 className="text-3xl font-bold text-slate-800 text-center mb-8">{t.sharedRecipeTitle}</h2>
            <div className="grid gap-8 grid-cols-1 lg:grid-cols-2 max-w-5xl mx-auto">
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
        <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 lg:p-8 font-sans">
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
            
            <header className="w-full max-w-5xl text-center mb-10">
                 <div className="flex justify-end w-full max-w-5xl mx-auto mb-4">
                    <div className="flex border border-slate-300 rounded-lg p-1 bg-white shadow-sm">
                        <button onClick={() => setLanguage('en')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${language === 'en' ? 'bg-green-600 text-white' : 'text-slate-600 hover:bg-green-100'}`}>EN</button>
                        <button onClick={() => setLanguage('es')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${language === 'es' ? 'bg-green-600 text-white' : 'text-slate-600 hover:bg-green-100'}`}>ES</button>
                    </div>
                </div>
                <div className="flex flex-col justify-center items-center gap-4">
                    <NutriChefLogo />
                    <h1 className="text-4xl sm:text-6xl font-bold text-slate-800 tracking-tight">
                        {t.title}
                    </h1>
                </div>
                <p className="text-lg text-slate-600 mt-3 max-w-2xl mx-auto">
                    {t.subtitle}
                </p>
            </header>

            <main className="w-full max-w-5xl">
                {sharedRecipe ? renderSharedRecipe() : renderGenerator()}
            </main>
        </div>
    );
};

export default App;
