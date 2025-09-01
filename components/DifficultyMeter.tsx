import React from 'react';
import type { Difficulty } from '../types';

interface DifficultyMeterProps {
    difficulty: Difficulty;
    language: 'en' | 'es';
}

const difficultyLevels: { [key in Difficulty]: number } = {
    'Very Easy': 1,
    'Easy': 2,
    'Medium': 3,
    'Hard': 4,
    'Expert': 5,
};

const difficultyTranslations: { [key in 'en' | 'es']: { [key in Difficulty]: string } } = {
    en: {
        'Very Easy': 'Very Easy',
        'Easy': 'Easy',
        'Medium': 'Medium',
        'Hard': 'Hard',
        'Expert': 'Expert',
    },
    es: {
        'Very Easy': 'Muy Fácil',
        'Easy': 'Fácil',
        'Medium': 'Medio',
        'Hard': 'Difícil',
        'Expert': 'Experto',
    }
};

const DifficultyMeter: React.FC<DifficultyMeterProps> = ({ difficulty, language }) => {
    const level = difficultyLevels[difficulty] || 1;
    const maxLevel = 5;
    const displayText = difficultyTranslations[language][difficulty] || difficulty;

    return (
        <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{language === 'es' ? 'Dificultad' : 'Difficulty'}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start mt-1 gap-1 sm:gap-2">
                 <p className="text-lg sm:text-xl font-bold text-slate-800">{displayText}</p>
                 <div className="flex gap-1 items-center">
                    {Array.from({ length: maxLevel }).map((_, index) => (
                        <div
                            key={index}
                            className={`w-5 h-2 rounded-full ${index < level ? 'bg-green-500' : 'bg-slate-200'}`}
                            title={`${level} out of ${maxLevel}`}
                        ></div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DifficultyMeter;