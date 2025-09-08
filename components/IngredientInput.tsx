import React, { useState } from 'react';

interface IngredientInputProps {
    ingredients: string[];
    onAddIngredient: (ingredient: string) => void;
    onRemoveIngredient: (ingredient: string) => void;
    placeholder: string;
    addButtonText: string;
    onScanRequest: () => void;
    isScanning: boolean;
}

const IngredientInput: React.FC<IngredientInputProps> = ({ ingredients, onAddIngredient, onRemoveIngredient, placeholder, addButtonText, onScanRequest, isScanning }) => {
    const [inputValue, setInputValue] = useState('');

    const handleAdd = () => {
        const trimmedValue = inputValue.trim();
        if (trimmedValue) {
            const newIngredients = trimmedValue.split(',').map(ing => ing.trim()).filter(Boolean);
            newIngredients.forEach(onAddIngredient);
            setInputValue('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
        }
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row gap-2">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="flex-grow w-full px-4 py-2 text-slate-700 bg-slate-100 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-colors"
                    aria-label="Add a new ingredient"
                />
                 <button
                    onClick={onScanRequest}
                    disabled={isScanning}
                    className="bg-slate-200 text-slate-800 font-semibold px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait"
                    aria-label="Scan ingredients from an image"
                >
                    {isScanning ? (
                        <svg className="animate-spin h-5 w-5 text-slate-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                            <circle cx="12" cy="13" r="4"></circle>
                        </svg>
                    )}
                </button>
                <button
                    onClick={handleAdd}
                    className="bg-green-200 text-green-800 font-semibold px-6 py-2 rounded-lg hover:bg-green-300 transition-colors duration-200"
                >
                    {addButtonText}
                </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
                {ingredients.map(ingredient => (
                    <span key={ingredient} className="flex items-center bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full shadow-sm">
                        {ingredient}
                        <button
                            onClick={() => onRemoveIngredient(ingredient)}
                            className="ml-2 text-green-500 hover:text-green-700"
                            aria-label={`Remove ${ingredient}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </span>
                ))}
            </div>
        </div>
    );
};

export default IngredientInput;