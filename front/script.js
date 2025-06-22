document.addEventListener('DOMContentLoaded', () => {
    const giftSelect = document.getElementById('gift-select');
    const modelSelect = document.getElementById('model-select');
    const backdropSelect = document.getElementById('backdrop-select');
    const symbolSelect = document.getElementById('symbol-select');
    const searchBtn = document.getElementById('search-btn');
    const resultsContainer = document.getElementById('results-container');
    const giftPreviewImg = document.getElementById('gift-preview-img');

    const API_BASE_URL = 'https://glad-social-tapir.ngrok-free.app/';

    // --- Helper Functions ---

    const generateSlug = (name) => {
        // Приводим к нижнему регистру и удаляем все символы, кроме букв и цифр
        return name.toLowerCase().replace(/[^a-z0-9]/g, '');
    };

    const apiFetch = async (endpoint) => {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                headers: {
                    'Accept': 'application/json'
                }
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Fetch error for ${endpoint}:`, error);
            resultsContainer.innerHTML = `<p style="color: #ff4d4d;">Ошибка: ${error.message}</p>`;
            throw error;
        }
    };

    const populateSelect = (selectElement, items, { placeholder, valueKey, textKey, defaultOptionText }) => {
        selectElement.innerHTML = `<option value="">${defaultOptionText}</option>`;
        items.forEach(item => {
            const value = valueKey ? item[valueKey] : item;
            const text = textKey ? `${item[textKey]} (rarity: ${item.rarity || 'N/A'})` : item;
            const option = new Option(text, value);
            selectElement.add(option);
        });
        selectElement.disabled = false;
    };

    const showLoader = () => {
        resultsContainer.innerHTML = '<div class="loader"></div>';
    };

    // --- Data Loading Functions ---

    const resetSelect = (selectEl, placeholderText) => {
        selectEl.innerHTML = `<option value="">${placeholderText}</option>`;
        selectEl.disabled = true;
    };

    const loadInitialData = async () => {
        try {
            const gifts = await apiFetch('/gifts');
            populateSelect(giftSelect, gifts, { defaultOptionText: 'Выберите коллекцию' });
        } catch (e) {
            giftSelect.innerHTML = '<option value="">Ошибка загрузки коллекций</option>';
        }
        // Сброс зависимых селектов
        resetSelect(modelSelect, 'Сначала выберите коллекцию');
        resetSelect(backdropSelect, 'Сначала выберите коллекцию');
        resetSelect(symbolSelect, 'Сначала выберите коллекцию');
    };

    const loadModelsForGift = async (giftName) => {
        resetSelect(modelSelect, 'Загрузка моделей...');
        try {
            const models = await apiFetch(`/models?gift_name=${encodeURIComponent(giftName)}`);
            populateSelect(modelSelect, models, {
                valueKey: 'name',
                textKey: 'name',
                defaultOptionText: 'Любая модель'
            });
        } catch (e) {
            resetSelect(modelSelect, 'Ошибка загрузки моделей');
        }
    };

    const loadBackdropsForGift = async (giftName) => {
        resetSelect(backdropSelect, 'Загрузка фонов...');
        try {
            const backdrops = await apiFetch(`/backdrops?gift_name=${encodeURIComponent(giftName)}`);
            const itemsToUse = backdrops.length ? backdrops : [''];
            populateSelect(backdropSelect, itemsToUse, { defaultOptionText: 'Любой фон' });
        } catch (e) {
            resetSelect(backdropSelect, 'Ошибка загрузки фонов');
        }
    };

    const loadSymbolsForGift = async (giftName) => {
        resetSelect(symbolSelect, 'Загрузка символов...');
        try {
            const symbols = await apiFetch(`/symbols?gift_name=${encodeURIComponent(giftName)}`);
            populateSelect(symbolSelect, symbols, { defaultOptionText: 'Любой символ' });
        } catch (e) {
            resetSelect(symbolSelect, 'Ошибка загрузки символов');
        }
    };

    // --- Event listeners ---

    giftSelect.addEventListener('change', () => {
        const gift = giftSelect.value;
        // всегда сбрасываем зависимые селекты
        resetSelect(modelSelect, 'Сначала выберите коллекцию');
        resetSelect(backdropSelect, 'Сначала выберите коллекцию');
        resetSelect(symbolSelect, 'Сначала выберите коллекцию');

        if (gift) {
            loadModelsForGift(gift);
            loadBackdropsForGift(gift);
            loadSymbolsForGift(gift);
        }
    });

    searchBtn.addEventListener('click', async () => {
        const giftName = giftSelect.value;
        if (!giftName) {
            resultsContainer.innerHTML = '<p>Пожалуйста, выберите коллекцию для поиска.</p>';
            return;
        }

        showLoader();

        const model = modelSelect.value;
        const backdrop = backdropSelect.value;
        const symbol = symbolSelect.value;

        const queryParams = new URLSearchParams({ gift_name: giftName });
        if (model) queryParams.append('model', model);
        if (backdrop) queryParams.append('backdrop', backdrop);
        if (symbol) queryParams.append('symbol', symbol);

        try {
            const data = await apiFetch(`/floor?${queryParams.toString()}`);
            renderResults(data, giftName);
        } catch (error) {
            // Error is already displayed by apiFetch helper
        }
    });

    // --- Rendering ---

    const logos = {
        'Tonnel': `<svg class="marketplace-logo" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="#9d8fff"/><path d="M12 7h-1v10h2v-4h2v-2h-2V7z" fill="#9d8fff"/></svg>`,
        'Portals': `<svg class="marketplace-logo" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16z" fill="#9d8fff"/><path d="M12 10a2 2 0 100 4 2 2 0 000-4z" fill="#9d8fff"/></svg>`,
        'MRKT': `<svg class="marketplace-logo" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM8 8V16H10V13L12 15L14 13V16H16V8H14L12 10L10 8H8Z" fill="#9d8fff"/></svg>`
    };

    const icons = {
        price: `<svg class="info-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 16c-0.81 0-1.55-.3-2.11-.89l-1.42 1.42C9.55 17.6 10.74 18 12 18c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2zm0-8c-.55 0-1 .45-1 1v1h2V9c0-.55-.45-1-1-1z"/></svg>`,
        link: `<svg class="info-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 13.41c.44-.39.44-1.03 0-1.42l-4.24-4.24c-1.17-1.17-3.07-1.17-4.24 0-1.17 1.17-1.17 3.07 0 4.24l4.24 4.24c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L5.34 12l2.83-2.83 2.42 2.42zM14.83 7.76l-4.24-4.24c-1.17-1.17-3.07-1.17-4.24 0L4.93 4.93c-1.17 1.17-1.17 3.07 0 4.24l4.24 4.24c1.17 1.17 3.07 1.17 4.24 0l1.41-1.41c1.17-1.17 1.17-3.07 0-4.24zm-1.41-1.41l1.41 1.41c.39.39.39 1.02 0 1.41l-4.24 4.24c-.39.39-1.02.39-1.41 0-.39-.39-.39-1.02 0-1.41l4.24-4.24c.39-.39 1.02-.39 1.41 0z"/></svg>`
    }

    const renderResultCard = (marketName, data, giftCollectionName) => {
        const logoSvg = logos[marketName] || '';

        if (!data) {
            return `
                <div class="result-card not-found">
                    <div class="result-card-header">
                        <h2>${logoSvg} ${marketName}</h2>
                    </div>
                     <div class="result-card-content">
                        <p>По вашему запросу ничего не найдено.</p>
                    </div>
                </div>`;
        }

        const slug = generateSlug(giftCollectionName);
        const imageUrl = `https://nft.fragment.com/gift/${slug}-${data.tg_id}.large.jpg`;

        return `
            <div class="result-card">
                <div class="result-card-header">
                    <img src="${imageUrl}" alt="${giftCollectionName}" class="result-gift-image" onerror="this.style.display='none'; this.parentElement.style.gap='0';">
                     <h2>${logoSvg} ${marketName}</h2>
                </div>
                <div class="result-card-content">
                    <p>${icons.price}<strong>Цена:</strong> ${data.price} TON</p>
                    <p>${icons.link}<strong>Ссылка:</strong> <a href="${data.link}" target="_blank" rel="noopener noreferrer">Перейти к лоту</a></p>
                </div>
            </div>
        `;
    };

    const renderResults = (data, giftName) => {
        if (!data || (!data.tonnel && !data.portals && !data.mrkt)) {
            resultsContainer.innerHTML = '<p>Ничего не найдено ни на одной из площадок.</p>';
            return;
        }

        resultsContainer.innerHTML = `
            <div class="results-grid">
                ${renderResultCard('Tonnel', data.tonnel, giftName)}
                ${renderResultCard('Portals', data.portals, giftName)}
                ${renderResultCard('MRKT', data.mrkt, giftName)}
            </div>
        `;
    };

    // --- Initial Load ---
    resultsContainer.innerHTML = '<p>Выберите параметры и нажмите "Найти Floor", чтобы увидеть результат.</p>';
    loadInitialData();
}); 
