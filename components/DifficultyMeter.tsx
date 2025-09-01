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

const DifficultyMeter: React.FC<DifficultyMeterProps> = ({ difficulty, language }) => {
    const level = difficultyLevels[difficulty] || 1;
    const maxLevel = 5;

    return (
        <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{language === 'es' ? 'Dificultad' : 'Difficulty'}</p>
            <div className="flex items-center mt-1">
                 <p className="text-xl font-bold text-slate-800 mr-3 whitespace-nowrap">{difficulty}</p>
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
