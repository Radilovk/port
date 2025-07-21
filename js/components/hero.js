export const generateHeroHTML = component => `
    <header class="hero-section">
        <canvas id="neuron-canvas"></canvas>
        <div class="container">
            <div class="hero-content">
                <h1>${component.title}</h1>
                <p>${component.subtitle}</p>
            </div>
        </div>
    </header>`;
