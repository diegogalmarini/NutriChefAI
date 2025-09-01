import { GoogleGenAI, Type } from "@google/genai";
import type { Recipe, Difficulty } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      recipeName: {
        type: Type.STRING,
        description: "The name of the recipe."
      },
      description: {
        type: Type.STRING,
        description: "A short, enticing description of the healthy dish."
      },
      prepTime: {
        type: Type.STRING,
        description: "Estimated preparation time, e.g., '15 minutes'."
      },
      cookTime: {
        type: Type.STRING,
        description: "Estimated cooking time, e.g., '30 minutes'."
      },
      servings: {
          type: Type.NUMBER,
          description: "The number of people this recipe serves."
      },
      calories: {
          type: Type.NUMBER,
          description: "Estimated calorie count per serving."
      },
      difficulty: {
          type: Type.STRING,
          description: "The cooking difficulty, must be one of: 'Very Easy', 'Easy', 'Medium', 'Hard', 'Expert'."
      },
      healthTip: {
          type: Type.STRING,
          description: "A useful tip on how to make the dish even healthier, or a nutritional benefit."
      },
      nutrition: {
        type: Type.OBJECT,
        description: "Nutritional information per serving.",
        properties: {
          protein: {
            type: Type.STRING,
            description: "Amount of protein per serving, including unit, e.g., '30g'."
          },
          carbs: {
            type: Type.STRING,
            description: "Amount of carbohydrates per serving, including unit, e.g., '45g'."
          },
          fats: {
            type: Type.STRING,
            description: "Amount of fats per serving, including unit, e.g., '15g'."
          }
        },
        required: ['protein', 'carbs', 'fats']
      },
      ingredients: {
        type: Type.ARRAY,
        description: "A list of all ingredients required for the recipe.",
        items: {
          type: Type.OBJECT,
          properties: {
            quantity: {
              type: Type.STRING,
              description: "The amount of the ingredient, e.g., '1 cup', '2 tbsp'."
            },
            name: {
              type: Type.STRING,
              description: "The name of the ingredient, e.g., 'quinoa', 'broccoli'."
            },
            isStaple: {
                type: Type.BOOLEAN,
                description: "Set to true if this ingredient is a suggested pantry staple, not from the user's original list. Only use for the third creative recipe."
            }
          },
          required: ['quantity', 'name']
        }
      },
      instructions: {
        type: Type.ARRAY,
        description: "Step-by-step instructions for preparing the dish.",
        items: {
          type: Type.STRING
        }
      }
    },
    required: ['recipeName', 'description', 'prepTime', 'cookTime', 'servings', 'calories', 'difficulty', 'healthTip', 'nutrition', 'ingredients', 'instructions']
  }
};

export const generateRecipes = async (ingredients: string[], language: 'en' | 'es'): Promise<Omit<Recipe, 'id'>[]> => {
    if (!ingredients || ingredients.length === 0) {
        throw new Error("Please provide at least one ingredient.");
    }
    
    const model = "gemini-2.5-flash";
    const languageInstruction = language === 'es' ? 'Spanish' : 'English';

    const prompt = `You are an expert nutritionist and chef. Your task is to generate 3 healthy recipes based on these ingredients: ${ingredients.join(', ')}. Respond entirely in ${languageInstruction}.

- The first two recipes must STRICTLY use ONLY the provided ingredients. For these, the 'isStaple' property for all ingredients must be false or omitted.
- The third recipe should use the provided ingredients and can creatively add 1-3 common pantry staples (like oil, spices, onion). For any added staple ingredient, set its 'isStaple' property to true.

For each of the three recipes, provide all the information required by the JSON schema.`;

    const maxRetries = 5; // Increased retries for maximum resilience
    let lastError: any = null;
    let delay = 3000; // Increased initial delay to 3 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model: model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema
                },
            });

            const jsonText = response.text.trim();
            if (!jsonText) {
                throw new Error("API returned an empty response. This may be due to safety filters.");
            }
            const recipes = JSON.parse(jsonText);
            
            if (Array.isArray(recipes) && recipes.length > 0) {
                return recipes as Omit<Recipe, 'id'>[];
            } else {
                 throw new Error("API returned invalid or empty recipe data.");
            }

        } catch (error) {
            lastError = error;
            console.error(`Error generating recipes (Attempt ${attempt}/${maxRetries}):`, error);

            if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID'))) {
                throw new Error("API_KEY_INVALID"); // Fail fast on critical errors
            }
            
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff: 3s, 6s, 12s, 24s
            }
        }
    }
    
    console.error("Failed to generate recipes after all retries. Last error:", lastError);
    throw new Error("GENERATION_FAILED");
};


export const generateRecipeImage = async (recipeName: string, recipeDescription: string): Promise<string> => {
    const prompt = `Photorealistic food photography of "${recipeName}". The dish is beautifully plated and is the only subject of the image. Close-up shot, bright natural lighting, clean and modern background. The image must look delicious and appetizing, highlighting the fresh ingredients. ${recipeDescription}. IMPORTANT: The image must NOT contain any people, animals, hands, or landscapes. Focus exclusively on the food.`;
    
    const maxRetries = 4; // Increased retries
    let delay = 3000; // Increased initial delay
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: prompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: '16:9',
                },
            });

            if (response.generatedImages && response.generatedImages.length > 0) {
                const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
                return `data:image/jpeg;base64,${base64ImageBytes}`;
            } else {
                throw new Error("No image was generated by the API.");
            }
        } catch (error: any) {
            lastError = error;
            const errorMessage = error?.error?.message || error?.message || '';
            const errorStatus = error?.error?.status || '';

            // If it's a quota error, fail immediately without logging or retrying.
            if (errorStatus === "RESOURCE_EXHAUSTED" || errorMessage.toLowerCase().includes("quota")) {
                throw new Error("QUOTA_EXCEEDED");
            }
             if (errorMessage.includes('API key not valid') || errorMessage.includes('API_KEY_INVALID')) {
                throw new Error("API_KEY_INVALID");
            }

            // For other errors, log and prepare for retry.
            console.error(`Error generating image for "${recipeName}" (Attempt ${attempt}/${maxRetries}):`, error);
            
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
            }
        }
    }
    
    // After all retries for non-quota errors, throw a generic error
    console.error(`Failed to generate image for "${recipeName}" after all retries. Last error:`, lastError);
    throw new Error("IMAGE_GENERATION_FAILED");
};

export const identifyIngredientsFromImage = async (base64ImageData: string, mimeType: string, language: 'en' | 'es'): Promise<string[]> => {
    const model = "gemini-2.5-flash";
    const languageInstruction = language === 'es' ? 'Spanish' : 'English';

    const imagePart = {
        inlineData: {
            mimeType: mimeType,
            data: base64ImageData,
        },
    };

    const textPart = {
        text: `Analyze this image and identify all the food ingredients present. List only the names of the ingredients. Respond entirely in ${languageInstruction}. The response must be a JSON array of strings.`
    };
    
    const ingredientsSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.STRING,
            description: "The name of an identified ingredient."
        }
    };

    const maxRetries = 4;
    let delay = 3000;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model: model,
                contents: { parts: [imagePart, textPart] },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: ingredientsSchema,
                },
            });
            const jsonText = response.text.trim();
            if (!jsonText) {
                throw new Error("API returned an empty response. This may be due to safety filters.");
            }
            const result = JSON.parse(jsonText);
            return Array.isArray(result) ? result : [];

        } catch (error) {
            lastError = error;
            console.error(`Error identifying ingredients (Attempt ${attempt}/${maxRetries}):`, error);

            if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID'))) {
                throw new Error("API_KEY_INVALID");
            }
            
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
            }
        }
    }
    
    console.error("Failed to identify ingredients after all retries. Last error:", lastError);
    throw new Error("IDENTIFICATION_FAILED");
};

const translationSchema = {
    type: Type.OBJECT,
    properties: {
      recipeName: { type: Type.STRING },
      description: { type: Type.STRING },
      ingredients: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            quantity: { type: Type.STRING },
          },
          required: ['name', 'quantity']
        }
      },
      instructions: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      prepTime: { type: Type.STRING },
      cookTime: { type: Type.STRING },
      difficulty: { type: Type.STRING },
      healthTip: { type: Type.STRING },
    },
    required: ['recipeName', 'description', 'ingredients', 'instructions', 'prepTime', 'cookTime', 'difficulty', 'healthTip']
};

export const translateRecipe = async (recipe: Recipe, targetLanguage: 'en' | 'es', sourceLanguage: 'en' | 'es'): Promise<Partial<Recipe>> => {
    const targetLanguageName = targetLanguage === 'es' ? 'Spanish' : 'English';
    const sourceLanguageName = sourceLanguage === 'es' ? 'Spanish' : 'English';

    const translatablePart = {
        recipeName: recipe.recipeName,
        description: recipe.description,
        ingredients: recipe.ingredients.map(i => ({ name: i.name, quantity: i.quantity })),
        instructions: recipe.instructions,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        difficulty: recipe.difficulty,
        healthTip: recipe.healthTip,
    };

    const prompt = `Translate the following recipe content from ${sourceLanguageName} to ${targetLanguageName}.
- Translate all text values, including ingredient names, quantities (e.g., 'cup' to 'taza'), instructions, and time units (e.g., 'minutes' to 'minutos').
- For the 'difficulty' field, translate the value to its ${targetLanguageName} equivalent. The possible English values are: 'Very Easy', 'Easy', 'Medium', 'Hard', 'Expert'. The Spanish equivalents are: 'Muy Fácil', 'Fácil', 'Medio', 'Difícil', 'Experto'.
- Respond ONLY with a JSON object matching the provided schema.

Recipe to translate:
${JSON.stringify(translatablePart, null, 2)}`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: translationSchema,
            },
        });

        const jsonText = response.text.trim();
        const translatedPart = JSON.parse(jsonText);
        
        const difficultyMap: { [key: string]: Difficulty } = {
            'Muy Fácil': 'Very Easy', 'Fácil': 'Easy', 'Medio': 'Medium', 'Difícil': 'Hard', 'Experto': 'Expert',
            'Very Easy': 'Very Easy', 'Easy': 'Easy', 'Medium': 'Medium', 'Hard': 'Hard', 'Expert': 'Expert'
        };
        const mappedDifficulty = difficultyMap[translatedPart.difficulty as string] || recipe.difficulty;

        const translatedIngredients = recipe.ingredients.map((originalIng, index) => ({
            ...originalIng,
            name: translatedPart.ingredients[index]?.name || originalIng.name,
            quantity: translatedPart.ingredients[index]?.quantity || originalIng.quantity,
        }));

        return {
            ...translatedPart,
            difficulty: mappedDifficulty,
            ingredients: translatedIngredients
        };

    } catch (error) {
        console.error(`Error translating recipe "${recipe.recipeName}":`, error);
        return {}; // Return empty object on failure to avoid overwriting with bad data
    }
};