export const generateEffectBar = effect => `
    <div class="effect-bar-group">
        <div class="effect-label">${effect.label}</div>
        <div class="effect-bar-container">
            <div class="effect-bar" data-width="${effect.value}%">${(effect.value / 10).toFixed(1)} / 10</div>
        </div>
    </div>`;
