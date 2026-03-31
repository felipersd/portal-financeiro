import React from 'react';

export const LoadingScreen: React.FC = () => {
    return (
        <div className="loading-container">
            <div className="loading-spinner">
                <div className="spinner-ring"></div>
                <div className="spinner-core"></div>
            </div>
            <h2 className="loading-text">Carregando...</h2>
            <p className="loading-subtext">Preparando o seu painel financeiro, só um instante</p>
        </div>
    );
};
