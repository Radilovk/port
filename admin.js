// =======================================================
//          1. ИНИЦИАЛИЗАЦИЯ И СЪСТОЯНИЕ
// =======================================================

// API Endpoint
const API_URL = 'https://port.radilov-k.workers.dev';

// Централизирани DOM елементи
const DOM = {
    // Основни
    saveBtn: document.getElementById('save-all-btn'),
    saveStatus: document.getElementById('save-status'),
    // Табове
    tabNav: document.querySelector('.tab-nav'),
    tabPanes: document.querySelectorAll('.tab-pane'),
    // Контейнери
    globalSettingsContainer: document.getElementById('global-settings-container'),
    navigationList: document.getElementById('navigation-list'),
    pageBuilderList: document.getElementById('page-builder-list'),
    footerSettingsContainer: document.getElementById('footer-settings-container'),
    // Поръчки
    ordersTableBody: document.getElementById('orders-table-body'),
    orderSearchInput: document.getElementById('order-search-input'),
    refreshOrdersBtn: document.getElementById('refresh-orders-btn'),
    // Добавяне на компонент
    addComponentDropdown: document.getElementById('add-component-dropdown'),
    addComponentToggleBtn: document.querySelector('[data-action="toggle-add-component-menu"]'),
    // Модал
    modal: {
        container: document.getElementById('modal-container'),
        backdrop: document.getElementById('modal-backdrop'),
        title: document.getElementById('modal-title'),
        body: document.getElementById('modal-body'),
        saveBtn: document.getElementById('save-modal-btn'),
        cancelBtn: document.getElementById('cancel-modal-btn'),
        closeBtn: document.getElementById('close-modal-btn'),
    },
    // Нотификации
    notificationContainer: document.getElementById('notification-container'),
    undoNotification: document.getElementById('undo-notification'),
    undoBtn: document.getElementById('undo-delete-btn'),
    // Шаблони
    templates: {
        listItem: document.getElementById('list-item-template'),
        orderRow: document.getElementById('order-row-template'),
    }
};

// Глобално състояние
let appData = {};
let ordersData = [];
let filteredOrdersData = [];
let unsavedChanges = false;
let activeUndoAction = null;
let currentModalSaveCallback = null;

// =======================================================
//          2. API КОМУНИКАЦИЯ
// =======================================================

async function fetchData() {
    try {
        const response = await fetch(`${API_URL}/page_content.json?v=${Date.now()}`);
        if (!response.ok) throw new Error(`HTTP грешка! Статус: ${response.status}`);
        return await response.json();
    } catch (error) {
        showNotification('Критична грешка при зареждане на данните.', 'error');
        console.error("Грешка при зареждане на page_content:", error);
        return null;
    }
}

async function fetchOrders() {
    try {
        const response = await fetch(`${API_URL}/orders?v=${Date.now()}`);
        if (!response.ok) throw new Error(`HTTP грешка! Статус: ${response.status}`);
        // Ensure orders have a unique ID if not provided by API
        const rawOrders = await response.json();
        ordersData = rawOrders.map((order, index) => ({ ...order, id: order.id || `order_${index}_${Date.now()}` }));
        filteredOrdersData = [...ordersData];
    } catch (error) {
        showNotification('Грешка при зареждане на поръчките.', 'error');
        console.error("Грешка при зареждане на поръчки:", error);
        ordersData = [];
        filteredOrdersData = [];
    }
}

async function saveData() {
    if (!unsavedChanges) return;

    DOM.saveBtn.disabled = true;
    DOM.saveStatus.textContent = 'Записване...';
    DOM.saveStatus.className = 'save-status is-saving';

    try {
        const response = await fetch(`${API_URL}/page_content.json`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appData, null, 2)
        });

        if (response.ok) {
            setUnsavedChanges(false);
            showNotification('Промените са записани успешно.', 'success');
        } else {
            throw new Error(`Грешка от сървъра: ${response.statusText}`);
        }
    } catch (err) {
        showNotification('Грешка при записване на данните.', 'error');
        console.error('Грешка при записване:', err);
        DOM.saveBtn.disabled = false; // Позволи нов опит
        DOM.saveStatus.textContent = 'Грешка при запис!';
        DOM.saveStatus.className = 'save-status is-dirty';
    }
}

// =======================================================
//          3. УПРАВЛЕНИЕ НА СЪСТОЯНИЕТО
// =======================================================

function setUnsavedChanges(isDirty) {
    unsavedChanges = isDirty;
    if (isDirty) {
        DOM.saveBtn.disabled = false;
        DOM.saveStatus.textContent = 'Има незаписани промени.';
        DOM.saveStatus.className = 'save-status is-dirty';
    } else {
        DOM.saveBtn.disabled = true;
        DOM.saveStatus.textContent = 'Всички промени са записани.';
        DOM.saveStatus.className = 'save-status';
    }
}

// =======================================================
//          4. РЕНДИРАНЕ НА ИНТЕРФЕЙСА (VIEW)
// =======================================================

function renderAll() {
    renderGlobalSettings();
    renderNavigation();
    renderPageContent();
    renderFooter();
    filterOrders(); // This will call renderOrders
}

function renderGlobalSettings() {
    DOM.globalSettingsContainer.innerHTML = '';
    const item = createListItem({
        type: 'Настройки на сайта',
        title: appData.settings.site_name,
        actions: [
            { label: 'Редактирай', action: 'edit-global-settings', class: 'btn-secondary' }
        ]
    });
    item.querySelector('.handle').style.display = 'none';
    DOM.globalSettingsContainer.appendChild(item);
}

function renderNavigation() {
    DOM.navigationList.innerHTML = '';
    appData.navigation.forEach((navItem, index) => {
        const item = createListItem({
            id: index,
            type: 'Линк',
            title: navItem.text,
            actions: [
                { label: 'Редактирай', action: 'edit-nav-item', class: 'btn-secondary' },
                { label: 'Изтрий', action: 'delete-nav-item', class: 'btn-danger' }
            ]
        });
        DOM.navigationList.appendChild(item);
    });
    initSortable(DOM.navigationList, appData.navigation);
}

function renderPageContent() {
    DOM.pageBuilderList.innerHTML = '';
    const componentTypes = {
        hero_banner: 'Hero Banner',
        product_category: 'Продуктова Категория',
        info_card: 'Информационен Кард',
    };
    appData.page_content.forEach(component => {
        const item = createListItem({
            id: component.component_id,
            type: componentTypes[component.type] || component.type,
            title: component.title,
            actions: [
                { label: 'Редактирай', action: 'edit-component', class: 'btn-secondary' },
                { label: 'Изтрий', action: 'delete-component', class: 'btn-danger' }
            ]
        });
        DOM.pageBuilderList.appendChild(item);
    });
    initSortable(DOM.pageBuilderList, appData.page_content);
}

function renderFooter() {
    DOM.footerSettingsContainer.innerHTML = '';
     const item = createListItem({
        type: 'Copyright',
        title: appData.footer.copyright_text,
        actions: [
            { label: 'Редактирай', action: 'edit-footer', class: 'btn-secondary' }
        ]
    });
    item.querySelector('.handle').style.display = 'none';
    DOM.footerSettingsContainer.appendChild(item);
}

function renderOrders() {
    DOM.ordersTableBody.innerHTML = '';
    filteredOrdersData.forEach((order) => {
        const rowTemplate = DOM.templates.orderRow.content.cloneNode(true);
        const customer = order.customer || {};
        const products = (order.products || []).map(p => `${p.name} x${p.quantity}`).join('<br>');

        const originalIndex = ordersData.findIndex(o => o.id === order.id);

        const row = rowTemplate.querySelector('tr');
        row.dataset.index = originalIndex;

        rowTemplate.querySelector('.order-customer').textContent = `${customer.firstName || ''} ${customer.lastName || ''}`;
        rowTemplate.querySelector('.order-phone').textContent = customer.phone || '';
        rowTemplate.querySelector('.order-email').textContent = customer.email || '';
        rowTemplate.querySelector('.order-products').innerHTML = products;

        const statusSelect = rowTemplate.querySelector('.order-status');
        statusSelect.value = order.status || 'Нова';

        DOM.ordersTableBody.appendChild(rowTemplate);
    });
}

function createListItem({ id, type, title, actions = [] }) {
    const template = DOM.templates.listItem.content.cloneNode(true);
    const itemElement = template.querySelector('.list-item');
    if (id !== undefined) itemElement.dataset.id = id;

    template.querySelector('.item-type').textContent = type;
    template.querySelector('.item-title').textContent = title || '(без заглавие)';

    const actionsContainer = template.querySelector('.item-actions');
    actions.forEach(actionInfo => {
        const button = document.createElement('button');
        button.className = `btn btn-sm ${actionInfo.class}`;
        button.textContent = actionInfo.label;
        button.dataset.action = actionInfo.action;
        actionsContainer.appendChild(button);
    });

    return itemElement;
}

function populateAddComponentMenu() {
    DOM.addComponentDropdown.innerHTML = '';
    const componentTemplates = {
        'hero_banner': { label: 'Hero Banner', templateId: 'form-hero-banner-template' },
        'info_card': { label: 'Инфо Кард', templateId: 'form-info-card-template' },
        'product_category': { label: 'Продуктова Категория', templateId: 'form-product-category-template' },
    };

    for (const [type, info] of Object.entries(componentTemplates)) {
        const link = document.createElement('a');
        link.href = '#';
        link.textContent = `Добави ${info.label}`;
        link.dataset.action = 'add-component';
        link.dataset.componentType = type;
        link.dataset.templateId = info.templateId;
        DOM.addComponentDropdown.appendChild(link);
    }
}

// =======================================================
//          5. УПРАВЛЕНИЕ НА МОДАЛЕН ПРОЗОРЕЦ
// =======================================================

function openModal(title, formTemplateId, data, onSave) {
    DOM.modal.title.textContent = title;
    
    const formTemplate = document.getElementById(formTemplateId);
    if (!formTemplate) {
        console.error(`Шаблон за форма с ID '${formTemplateId}' не е намерен!`);
        showNotification(`Грешка: Шаблон за форма '${formTemplateId}' липсва.`, 'error');
        return;
    }
    DOM.modal.body.innerHTML = '';
    DOM.modal.body.appendChild(formTemplate.content.cloneNode(true));
    
    if (data) {
        populateForm(DOM.modal.body.querySelector('form'), data);
    }

    currentModalSaveCallback = onSave;
    
    initModalTabs();
    
    DOM.modal.container.classList.add('show');
    DOM.modal.backdrop.classList.add('show');
}

function closeModal() {
    DOM.modal.container.classList.remove('show');
    DOM.modal.backdrop.classList.remove('show');
    currentModalSaveCallback = null;
    DOM.modal.body.innerHTML = ''; // Изчистване
}

function populateForm(form, data) {
    form.querySelectorAll('[data-field]').forEach(input => {
        const path = input.dataset.field;
        const value = getProperty(data, path);
        if (input.type === 'checkbox') {
            input.checked = !!value;
        } else {
            input.value = value ?? '';
        }
    });

    if (data.products) {
        const productsContainer = form.querySelector('#products-editor');
        if(productsContainer) {
            data.products.forEach(productData => {
                addNestedItem(productsContainer, 'product-editor-template', productData);
            });
        }
    }
}

function serializeForm(form) {
    const data = {};
    form.querySelectorAll('[data-field]').forEach(input => {
        const path = input.dataset.field;
        if (input.closest('.nested-item-template')) return;
        
        const value = input.type === 'checkbox' ? input.checked : (input.type === 'number' ? (input.value ? parseFloat(input.value) : null) : input.value);
        setProperty(data, path, value);
    });

    const productsContainer = form.querySelector('#products-editor');
    if (productsContainer) {
        data.products = [];
        productsContainer.querySelectorAll(':scope > .nested-item[data-type="product"]').forEach(productNode => {
            const productData = {};
            productNode.querySelectorAll('[data-field]').forEach(input => {
                 const path = input.dataset.field;
                 const value = input.type === 'checkbox' ? input.checked : (input.type === 'number' ? (input.value ? parseFloat(input.value) : null) : input.value);
                 setProperty(productData, path, value);
            });

            const effectsContainer = productNode.querySelector('[data-sub-container="effects"]');
            if (effectsContainer) {
                productData.effects = [];
                effectsContainer.querySelectorAll(':scope > .nested-sub-item[data-type="effect"]').forEach(effectNode => {
                    const effectData = {};
                    effectNode.querySelectorAll('[data-field]').forEach(input => {
                        effectData[input.dataset.field] = (input.type === 'number' ? (input.value ? parseFloat(input.value) : null) : input.value);
                    });
                    productData.effects.push(effectData);
                });
            }
            data.products.push(productData);
        });
    }
    return data;
}

function addNestedItem(container, templateId, data) {
    const template = document.getElementById(templateId);
    const newItem = template.content.cloneNode(true);
    const itemElement = newItem.querySelector('.nested-item, .nested-sub-item');
    
    if (data) {
        itemElement.querySelectorAll('[data-field]').forEach(input => {
            const path = input.dataset.field;
            const value = getProperty(data, path);
            if (value !== undefined && value !== null) input.value = value;
        });

        if (data.effects) {
            const effectsContainer = itemElement.querySelector('[data-sub-container="effects"]');
            if(effectsContainer) {
                data.effects.forEach(effectData => {
                    addNestedItem(effectsContainer, 'effect-editor-template', effectData);
                });
            }
        }
    }
    container.appendChild(newItem);
}

// =======================================================
//          6. ГЛАВЕН КОНТРОЛЕР И EVENT LISTENERS
// =======================================================

function setupEventListeners() {
    document.body.addEventListener('click', e => {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        
        // Предотвратява презареждане при клик на <a href="#">
        e.preventDefault(); 
        
        const action = target.dataset.action;
        const listItem = target.closest('.list-item');
        const id = listItem?.dataset.id;
        
        handleAction(action, target, id);
    });

    DOM.modal.saveBtn.addEventListener('click', () => {
        if (currentModalSaveCallback) {
            const form = DOM.modal.body.querySelector('form');
            if (form) {
                const success = currentModalSaveCallback(form);
                if (success) {
                    setUnsavedChanges(true);
                    renderAll();
                    closeModal();
                }
            }
        }
    });

    [DOM.modal.cancelBtn, DOM.modal.closeBtn, DOM.modal.backdrop].forEach(el => el.addEventListener('click', closeModal));
    
    DOM.tabNav.addEventListener('click', e => {
        const target = e.target.closest('.tab-btn');
        if (!target || target.classList.contains('active')) return;
        
        DOM.tabNav.querySelector('.active').classList.remove('active');
        target.classList.add('active');
        
        DOM.tabPanes.forEach(pane => pane.classList.remove('active'));
        document.getElementById(target.dataset.tab).classList.add('active');
    });

    DOM.saveBtn.addEventListener('click', saveData);

    DOM.ordersTableBody.addEventListener('change', async e => {
        if (!e.target.classList.contains('order-status')) return;
        const row = e.target.closest('tr');
        const index = Number(row.dataset.index);
        const newStatus = e.target.value;
        ordersData[index].status = newStatus;
        try {
            await fetch(`${API_URL}/orders`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: ordersData[index].id, status: newStatus })
            });
            showNotification('Статусът е обновен.', 'success');
        } catch (err) {
            showNotification('Грешка при запис на статуса.', 'error');
            console.error('Update status error:', err);
        }
    });
    
    DOM.orderSearchInput.addEventListener('input', () => filterOrders());
    DOM.refreshOrdersBtn.addEventListener('click', async () => {
        showNotification('Опресняване на поръчките...', 'info');
        await fetchOrders();
        filterOrders();
    });

    DOM.undoBtn.addEventListener('click', () => {
        if (activeUndoAction) {
            activeUndoAction();
            activeUndoAction = null;
            DOM.undoNotification.classList.remove('show');
        }
    });
}

function handleAction(action, target, id) {
    const componentType = target.dataset.componentType;
    const templateId = target.dataset.templateId;
    
    switch(action) {
        // Глобални
        case 'edit-global-settings':
            openModal('Редакция на глобални настройки', 'form-global-settings-template', appData.settings,
                (form) => {
                    appData.settings = serializeForm(form);
                    return true;
                });
            break;

        // Навигация
        case 'add-nav-item':
             openModal('Добавяне на нов линк', 'form-nav-item-template', { text: '', link: '#' },
                (form) => {
                    appData.navigation.push(serializeForm(form));
                    return true;
                });
            break;
        case 'edit-nav-item':
            openModal('Редакция на линк', 'form-nav-item-template', appData.navigation[id],
                (form) => {
                    Object.assign(appData.navigation[id], serializeForm(form));
                    return true;
                });
            break;
        case 'delete-nav-item':
            deleteItemWithUndo('nav-item', id, () => renderNavigation());
            break;

        // Съдържание (компоненти)
        case 'toggle-add-component-menu':
            DOM.addComponentDropdown.classList.toggle('show');
            break;
        case 'add-component':
            openModal(`Добавяне на: ${componentType.replace(/_/g, ' ')}`, templateId, null,
                (form) => {
                    const newComponent = serializeForm(form);
                    newComponent.type = componentType;
                    newComponent.component_id = `comp_${Date.now()}`;
                    if(!newComponent.title) newComponent.title = `Нов ${componentType}`;
                    appData.page_content.push(newComponent);
                    DOM.addComponentDropdown.classList.remove('show');
                    return true;
                });
            break;
        case 'edit-component': {
            const component = id ? appData.page_content.find(c => c.component_id === id) : null;
            if (!component) return;
            const correctedType = component.type.replace(/_/g, '-');
            const editTemplateId = `form-${correctedType}-template`;
            openModal(`Редакция на: ${component.title}`, editTemplateId, component,
                (form) => {
                    const updatedData = serializeForm(form);
                    Object.assign(component, updatedData);
                    return true;
                });
            break;
        }
        case 'delete-component':
             deleteItemWithUndo('component', id, () => renderPageContent());
            break;

        // Футър
        case 'edit-footer':
            openModal('Редакция на футър', 'form-footer-template', appData.footer,
                (form) => {
                    const updatedData = serializeForm(form);
                    Object.assign(appData.footer, updatedData);
                    return true;
                });
            break;
            
        // Вложени елементи в модал
        case 'add-nested-item': {
            const containerSelector = target.dataset.container;
            const nestedTemplateId = target.dataset.template;
            const container = target.closest('.modal-body').querySelector(containerSelector);
            if (container) {
                addNestedItem(container, nestedTemplateId, null);
            }
            break;
        }
        case 'delete-nested-item': {
            const itemToDelete = target.closest('.nested-item, .nested-sub-item');
            if (itemToDelete) {
                itemToDelete.remove();
            }
            break;
        }
    }
}


// =======================================================
//          7. ПОМОЩНИ ФУНКЦИИ (UTILITIES)
// =======================================================

function initSortable(element, dataArray) {
    new Sortable(element, {
        handle: '.handle',
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: (evt) => {
            const { oldIndex, newIndex } = evt;
            if (oldIndex === newIndex) return;
            
            const [movedItem] = dataArray.splice(oldIndex, 1);
            dataArray.splice(newIndex, 0, movedItem);
            
            setUnsavedChanges(true);
            if(element.id === 'navigation-list') renderNavigation();
        }
    });
}

function showNotification(message, type = 'info', duration = 4000) {
    const note = document.createElement('div');
    note.className = `notification ${type}`;
    note.textContent = message;
    DOM.notificationContainer.appendChild(note);
    setTimeout(() => {
        note.classList.add('fade-out');
        note.addEventListener('transitionend', () => note.remove());
    }, duration);
}

function deleteItemWithUndo(itemType, id, renderFunc) {
    let item, index, array;
    if (itemType === 'nav-item') {
        array = appData.navigation;
        index = parseInt(id, 10);
        item = array[index];
    } else if (itemType === 'component') {
        array = appData.page_content;
        index = array.findIndex(c => c.component_id === id);
        item = array[index];
    }

    if (item === undefined) return;
    
    array.splice(index, 1);
    setUnsavedChanges(true);
    renderFunc();

    DOM.undoNotification.classList.add('show');

    activeUndoAction = () => {
        array.splice(index, 0, item);
        setUnsavedChanges(true);
        renderFunc();
        showNotification('Елементът е възстановен.', 'success');
        activeUndoAction = null;
    };
    
    setTimeout(() => {
        if(DOM.undoNotification.classList.contains('show')) {
            DOM.undoNotification.classList.remove('show');
            activeUndoAction = null;
        }
    }, 5000);
}

function filterOrders() {
    const searchTerm = DOM.orderSearchInput.value.toLowerCase().trim();
    if (!searchTerm) {
        filteredOrdersData = [...ordersData];
    } else {
        filteredOrdersData = ordersData.filter(order => {
            const customer = order.customer || {};
            const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.toLowerCase();
            const phone = (customer.phone || '').toLowerCase();
            const email = (customer.email || '').toLowerCase();
            return fullName.includes(searchTerm) || phone.includes(searchTerm) || email.includes(searchTerm);
        });
    }
    renderOrders();
}

function initModalTabs() {
    const tabNav = DOM.modal.body.querySelector('.modal-tab-nav');
    if (!tabNav) return;

    tabNav.addEventListener('click', e => {
        const target = e.target.closest('.modal-tab-btn');
        if (!target || target.classList.contains('active')) return;

        const container = target.closest('.modal-form');
        container.querySelector('.modal-tab-btn.active').classList.remove('active');
        container.querySelector('.modal-tab-pane.active').classList.remove('active');
        
        target.classList.add('active');
        container.querySelector(target.dataset.modalTab).classList.add('active');
    });
}

function getProperty(obj, path) {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

function setProperty(obj, path, value) {
    const parts = path.split('.');
    const last = parts.pop();
    const target = parts.reduce((acc, part) => acc[part] = acc[part] || {}, obj);
    target[last] = value;
}


// =======================================================
//          8. ИНИЦИАЛИЗАЦИЯ НА ПРИЛОЖЕНИЕТО
// =======================================================

async function init() {
    setupEventListeners();
    populateAddComponentMenu();

    appData = await fetchData();
    await fetchOrders();

    if (appData) {
        renderAll();
    } else {
        document.querySelector('.admin-container').innerHTML = '<h1>Грешка при зареждане на данните. Проверете конзолата.</h1>';
    }
}

// Старт на приложението
init();
