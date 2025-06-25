document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('search-btn');
    const resultsContainer = document.getElementById('results-container');

    const API_BASE_URL = 'http://127.0.0.1:8000';

    const tomSelects = {}; // Store all TomSelect instances

    // --- Helper Functions ---
    const generateSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const showLoader = () => {
        resultsContainer.innerHTML = '<div class="loader"></div>';
    };

    const apiFetch = async (endpoint) => {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`);
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

    // --- TomSelect Initializers ---
    const createTomSelect = (selector, settings) => {
        const el = document.querySelector(selector);
        if (el) {
            tomSelects[el.id] = new TomSelect(el, settings);
        }
    };

    const imageRender = {
        option: (data, escape) => `
            <div>
                <img src="${escape(data.imageUrl)}" class="dropdown-gift-icon" alt="" onerror="this.style.display='none'">
                ${escape(data.text)}
            </div>`,
        item: (data, escape) => `
            <div>
                <img src="${escape(data.imageUrl)}" class="dropdown-gift-icon" alt="" onerror="this.style.display='none'">
                ${escape(data.text)}
            </div>`
    };

    // Initialize all dropdowns
    createTomSelect('#gift-select', {
        valueField: 'value',
        labelField: 'text',
        searchField: 'text',
        placeholder: 'Загрузка коллекций...',
        render: imageRender
    });

    createTomSelect('#model-select', {
        placeholder: 'Сначала выберите коллекцию',
        render: imageRender
    });

    ['backdrop-select', 'symbol-select'].forEach(id => {
        createTomSelect(`#${id}`, {
            placeholder: 'Сначала выберите коллекцию',
        });
    });

    ['model-select', 'backdrop-select', 'symbol-select'].forEach(id => {
        if (tomSelects[id]) {
            tomSelects[id].disable();
        }
    });

    // --- Data Loading Functions ---
    const populateSelect = (selectId, items, { valueKey, textKey, defaultOptionText, hasRarity, imageKey }) => {
        const instance = tomSelects[selectId];
        if (!instance) return;

        instance.clear();
        instance.clearOptions();
        instance.addOption({ value: '', text: defaultOptionText });

        const options = items.map(item => {
            const value = valueKey ? item[valueKey] : item;
            let text = textKey ? item[textKey] : item;
            const finalOption = { value, text };
            if (imageKey && item[imageKey]) {
                finalOption.imageUrl = item[imageKey];
            }
            return finalOption;
        });

        instance.addOptions(options);
        instance.setValue('', true);
        instance.enable();
    };

    const resetSelect = (selectId, placeholderText) => {
        const instance = tomSelects[selectId];
        if (!instance) return;
        instance.clear();
        instance.clearOptions();
        instance.settings.placeholder = placeholderText;
        instance.disable();
        instance.sync();
    };

    const loadInitialData = async () => {
        try {
            const gifts = await apiFetch('/gifts');
            const giftItems = gifts.map(name => ({
                name: name,
                imageUrl: `https://fragment.com/file/gifts/${generateSlug(name)}/thumb.webp`
            }));
            populateSelect('gift-select', giftItems, {
                valueKey: 'name',
                textKey: 'name',
                imageKey: 'imageUrl',
                defaultOptionText: 'Выберите коллекцию'
            });
            tomSelects['gift-select'].settings.placeholder = 'Выберите коллекцию';
            tomSelects['gift-select'].sync();

        } catch (e) {
            resetSelect('gift-select', 'Ошибка загрузки коллекций');
        }
    };

    const loadDependentData = async (giftName) => {
        const dataMap = {
            'model-select': {
                endpoint: `/models?gift_name=${encodeURIComponent(giftName)}`,
                options: {
                    valueKey: 'name',
                    textKey: 'name',
                    defaultOptionText: 'Любая модель',
                    imageKey: 'url'
                }
            },
            'backdrop-select': { endpoint: `/backdrops?gift_name=${encodeURIComponent(giftName)}`, options: { defaultOptionText: 'Любой фон' } },
            'symbol-select': { endpoint: `/symbols?gift_name=${encodeURIComponent(giftName)}`, options: { defaultOptionText: 'Любой символ' } }
        };

        for (const [selectId, { endpoint, options }] of Object.entries(dataMap)) {
            resetSelect(selectId, `Загрузка...`);
            try {
                const data = await apiFetch(endpoint);
                const itemsToUse = Array.isArray(data) && data.length > 0 ? data : [];
                populateSelect(selectId, itemsToUse, options);
            } catch (e) {
                resetSelect(selectId, 'Ошибка загрузки');
            }
        }
    };

    // --- Event listeners ---
    tomSelects['gift-select']?.on('change', (value) => {
        ['model-select', 'backdrop-select', 'symbol-select'].forEach(id => resetSelect(id, 'Сначала выберите коллекцию'));
        if (value) {
            loadDependentData(value);
        }
    });

    searchBtn.addEventListener('click', async () => {
        const giftName = tomSelects['gift-select']?.getValue();
        if (!giftName) {
            resultsContainer.innerHTML = '<p>Пожалуйста, выберите коллекцию для поиска.</p>';
            return;
        }
        showLoader();

        const model = tomSelects['model-select']?.getValue();
        const backdrop = tomSelects['backdrop-select']?.getValue();
        const symbol = tomSelects['symbol-select']?.getValue();

        const queryParams = new URLSearchParams({ gift_name: giftName });
        if (model) queryParams.append('model', model);
        if (backdrop) queryParams.append('backdrop', backdrop);
        if (symbol) queryParams.append('symbol', symbol);

        try {
            const data = await apiFetch(`/floor?${queryParams.toString()}`);
            renderResults(data, giftName);
        } catch (error) { /* Error is already displayed by apiFetch helper */ }
    });

    // --- Rendering (Existing code is mostly fine) ---
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