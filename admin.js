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
    ordersTableBody: document.getElementById('orders-table-body'),
    addComponentDropdown: document.getElementById('add-component-dropdown'),
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
let unsavedChanges = false;
let activeUndoAction = null;
let currentModalSaveCallback = null;
let currentEditingComponentId = null; // НОВО: За да знаем коя категория се редактира

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
        return await response.json();
    } catch (error) {
        showNotification('Грешка при зареждане на поръчките.', 'error');
        console.error("Грешка при зареждане на поръчки:", error);
        return [];
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
    renderOrders();
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
    initSortable(DOM.pageBuilderList, appData.page_content, 'component_id');
}

function renderFooter() {
    DOM.footerSettingsContainer.innerHTML = '';
     const item = createListItem({
        type: 'Copyright & Колони',
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
    ordersData.forEach((order, index) => {
        const rowTemplate = DOM.templates.orderRow.content.cloneNode(true);
        const customer = order.customer || {};
        const products = (order.products || []).map(p => `${p.name} x${p.quantity}`).join('<br>');

        const row = rowTemplate.querySelector('tr');
        row.dataset.index = index;

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
    if (id) itemElement.dataset.id = id;

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


// =======================================================
//          5. УПРАВЛЕНИЕ НА МОДАЛЕН ПРОЗОРЕЦ
// =======================================================

function openModal(title, formTemplateId, data, onSave) {
    DOM.modal.title.textContent = title;
    
    const formTemplate = document.getElementById(formTemplateId);
    if (!formTemplate) {
        console.error(`Шаблон за форма с ID '${formTemplateId}' не е намерен!`);
        return;
    }
    DOM.modal.body.innerHTML = '';
    DOM.modal.body.appendChild(formTemplate.content.cloneNode(true));
    
    if (data) {
        populateForm(DOM.modal.body.querySelector('form'), data);
    }

    currentModalSaveCallback = onSave;

    DOM.modal.container.classList.add('show');
    DOM.modal.backdrop.classList.add('show');
}

function closeModal() {
    DOM.modal.container.classList.remove('show');
    DOM.modal.backdrop.classList.remove('show');
    currentModalSaveCallback = null;
    currentEditingComponentId = null; // НОВО: Изчистваме ID-то при затваряне
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
}

function serializeForm(form) {
    const data = {};
    form.querySelectorAll('[data-field]').forEach(input => {
        const path = input.dataset.field;
        const value = input.type === 'checkbox' ? input.checked : input.value;
        setProperty(data, path, value);
    });
    return data;
}


// =======================================================
//          6. ГЛАВЕН КОНТРОЛЕР И EVENT LISTENERS
// =======================================================

function setupEventListeners() {
    document.body.addEventListener('click', e => {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        
        const action = target.dataset.action;
        const id = target.closest('.list-item')?.dataset.id;
        
        handleAction(action, id);
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
    DOM.modal.cancelBtn.addEventListener('click', closeModal);
    DOM.modal.closeBtn.addEventListener('click', closeModal);
    DOM.modal.backdrop.addEventListener('click', closeModal);
    
    DOM.tabNav.addEventListener('click', e => {
        const target = e.target.closest('.tab-btn');
        if (!target) return;
        
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
                body: JSON.stringify({ index, status: newStatus })
            });
            showNotification('Статусът е обновен.', 'success');
        } catch (err) {
            showNotification('Грешка при запис на статуса.', 'error');
            console.error('Update status error:', err);
        }
    });

    // НОВО: Слушател за промяна на скритото поле за качване на файл.
    // Използваме делегиране от `document`, защото полето се създава динамично.
    document.addEventListener('change', e => {
        if (e.target.id === 'product-import-input') {
            handleProductImport(e);
        }
    });
}

function handleAction(action, id) {
    switch(action) {
        case 'edit-global-settings':
            openModal(
                'Редакция на глобални настройки', 
                'form-global-settings-template', 
                appData.settings,
                (form) => {
                    appData.settings = serializeForm(form);
                    return true;
                }
            );
            break;
        case 'edit-nav-item':
            openModal(
                'Редакция на линк',
                'form-nav-item-template',
                appData.navigation[id],
                (form) => {
                    Object.assign(appData.navigation[id], serializeForm(form));
                    return true;
                }
            );
            break;
        // ПРОМЕНЕНО: Добавяме запазване на ID-то на компонента, който се редактира
        case 'edit-component':
            const component = appData.page_content.find(c => c.component_id === id);
            if (!component) return;

            currentEditingComponentId = id; // Запазваме ID-то за бъдещо ползване (от импорта)

            const formTemplateId = `form-${component.type}-template`;
            openModal(
                `Редакция на: ${component.title}`,
                formTemplateId,
                component,
                (form) => {
                    // Тази логика трябва да се направи по-сложна, за да запазва и вложените елементи.
                    // Засега запазва само основните полета.
                    Object.assign(component, serializeForm(form));
                    return true;
                }
            );
            break;
        // НОВО: Действие, което задейства клик върху скритото поле за качване
        case 'import-product':
            const importInput = document.getElementById('product-import-input');
            if (importInput) {
                importInput.click();
            }
            break;
    }
}

// НОВО: ЦЯЛАТА ФУНКЦИЯ ЗА ОБРАБОТКА НА ИМПОРТА
function handleProductImport(event) {
    const file = event.target.files[0];
    if (!file || !currentEditingComponentId) {
        return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);

            if (!importedData.product_id || !importedData.public_data || !importedData.system_data) {
                 throw new Error("Файлът не съдържа необходимите ключове: product_id, public_data, system_data.");
            }
            
            const targetCategory = appData.page_content.find(c => c.component_id === currentEditingComponentId);
            if (!targetCategory || targetCategory.type !== 'product_category') {
                showNotification('Грешка: Не е избрана валидна продуктова категория.', 'error');
                return;
            }

            const newProduct = {
                ...importedData.public_data,
                price: 0, 
                system_data: importedData.system_data
            };

            if (!targetCategory.products) {
                targetCategory.products = [];
            }
            targetCategory.products.push(newProduct);

            setUnsavedChanges(true);
            showNotification(`Продукт "${newProduct.name}" е добавен успешно.`, 'success');

            closeModal();
            setTimeout(() => {
                handleAction('edit-component', currentEditingComponentId);
            }, 100);

        } catch (error) {
            console.error("Грешка при импортиране:", error);
            showNotification(`Грешка при импорт: ${error.message}`, 'error');
        } finally {
            event.target.value = '';
        }
    };

    reader.readAsText(file);
}

// =======================================================
//          7. ПОМОЩНИ ФУНКЦИИ (UTILITIES)
// =======================================================

function initSortable(element, dataArray, idKey = null) {
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
        }
    });
}

function showNotification(message, type = 'success') {
    const note = document.createElement('div');
    note.className = `notification ${type}`;
    note.textContent = message;
    DOM.notificationContainer.appendChild(note);
    setTimeout(() => {
        note.style.opacity = '0';
        note.style.transform = 'translateX(100%)';
        setTimeout(() => note.remove(), 300);
    }, 4000);
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
    
    appData = await fetchData();
    ordersData = await fetchOrders();

    if (appData) {
        renderAll();
    } else {
        document.querySelector('.admin-container').innerHTML = '<h1>Грешка при зареждане на данните. Проверете конзолата.</h1>';
    }
}

init();
