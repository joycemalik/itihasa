
import React from 'react';
import { GenerativeCanvas } from './Chronicle/GenerativeCanvas';
import { useScene } from '../context/SceneContext';

const BackgroundLayer = () => {
    const { activeScene } = useScene();

    // If no scene is active, we can either hide it or show an idle state.
    // However, for smooth transitions, it's better to keep it mounted.
    // GenerativeCanvas handles 'null' scene by clearing/stopping.

    // We only show the overlay if there is an active scene that warrants it.
    // The overlay came from ChronicleView intended for text readability.
    // We assume if activeScene is set, we are in a mode that needs this background.

    const showOverlay = activeScene && activeScene !== 'none';

    return (
        <div
            className="fixed inset-0 w-screen h-screen z-0 pointer-events-none"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                zIndex: 0 // Behind everything (assuming content is z-10+)
            }}
        >
            <GenerativeCanvas activeScene={activeScene} />

            {/* Dark Gradient Overlay for readability - Only visible when scene is active */}
            {showOverlay && (
                <div className="absolute inset-0 bg-gradient-to-r from-[#0c0a08]/90 via-[#0c0a08]/70 to-[#0c0a08]/30 transition-opacity duration-1000"></div>
            )}
        </div>
    );
};

export default BackgroundLayer;
