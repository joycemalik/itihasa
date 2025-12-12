
import React, { createContext, useContext, useState } from 'react';

const SceneContext = createContext();

export const SceneProvider = ({ children }) => {
    const [activeScene, setActiveScene] = useState(null);

    return (
        <SceneContext.Provider value={{ activeScene, setActiveScene }}>
            {children}
        </SceneContext.Provider>
    );
};

export const useScene = () => {
    const context = useContext(SceneContext);
    if (!context) {
        throw new Error('useScene must be used within a SceneProvider');
    }
    return context;
};
