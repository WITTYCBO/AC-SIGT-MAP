// URL del Google Apps Script (Debe ser reemplazada por el usuario después de desplegar)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyK--eLRSSXPPsSLSwuqiCG-Vm9CsC93_8x1NLY98ujoKsFbroIe61qLkq1a3mxq4EZGg/exec";

let locationsData = [];
let contactsData = [];
let activeLocation = null;
let sessionPassword = ""; // Guardar la contraseña de la sesión actual

// ====== Service Worker ======
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registrado', reg))
            .catch(err => console.error('Error registrando Service Worker', err));
    });
}

// DOM Elements
const listContainer = document.getElementById('locations-list');
const searchInput = document.getElementById('search-input');
const filterBtns = document.querySelectorAll('.filter-btn');
const detailPanel = document.getElementById('detail-panel');
const detailContent = document.getElementById('detail-content');
const closeDetailBtn = document.getElementById('close-detail');

const mapIframe = document.getElementById('map-iframe');
const ORIGINAL_MAP_URL = "https://www.google.com/maps/d/u/0/embed?mid=1PIF4MtsWShAjzFKoaUbBQCNv1VjdxrM";

function restoreOriginalMap() {
    if (mapIframe && mapIframe.src !== ORIGINAL_MAP_URL) {
        mapIframe.src = ORIGINAL_MAP_URL;
    }
}

const editPanel = document.getElementById('edit-panel');
const closeEditBtn = document.getElementById('close-edit');
const dataForm = document.getElementById('data-form');

const agendaPanel = document.getElementById('agenda-panel');
const btnOpenAgenda = document.getElementById('btn-open-agenda');
const closeAgendaBtn = document.getElementById('close-agenda');
const filterBtnsAgenda = document.querySelectorAll('.filter-btn-agenda');
const contactsListContainer = document.getElementById('contacts-list');

const editContactPanel = document.getElementById('edit-contact-panel');
const closeContactEditBtn = document.getElementById('close-contact-edit');
const contactForm = document.getElementById('contact-form');
const btnNewContact = document.getElementById('btn-new-contact');

// Login Elements
const loginOverlay = document.getElementById('login-overlay');
const loginForm = document.getElementById('login-form');
const pwdInput = document.getElementById('login-pwd');
const loginError = document.getElementById('login-error');

// Video Elements
const videoLoadingOverlay = document.getElementById('video-loading-overlay');
const loadingVideo = document.getElementById('loading-video');

if (loadingVideo) {
    // Voltear el video horizontalmente para corregir el mapa de fondo
    loadingVideo.style.transform = "translate(-50%, -50%) scaleX(-1)";
    
    // Ocultar el video de carga cuando termina o después de un tiempo máximo para no en bucle
    const hideVideo = () => {
        if(videoLoadingOverlay) {
            videoLoadingOverlay.style.opacity = '0';
            setTimeout(() => {
                videoLoadingOverlay.style.display = 'none';
            }, 500); // 0.5s transition
        }
    };

    loadingVideo.addEventListener('ended', hideVideo);
    
    // Fallback por si no detecta el end o para forzar un límite (ej. 6 segundos)
    setTimeout(hideVideo, 6000);
}

// ====== Theme Toggle ======
const themeToggleBtn = document.getElementById('theme-toggle');
if (localStorage.getItem('theme') === 'light') {
    document.documentElement.classList.add('light-mode');
}
if(themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        document.documentElement.classList.toggle('light-mode');
        if (document.documentElement.classList.contains('light-mode')) {
            localStorage.setItem('theme', 'light');
        } else {
            localStorage.setItem('theme', 'dark');
        }
    });
}

// Loader Overlay
function showLoading(show, text = 'Cargando datos...') {
    let overlay = document.getElementById('loading-overlay');
    if (show) {
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `<div class="spinner"></div><p id="loading-text">${text}</p>`;
            document.body.appendChild(overlay);
        } else {
            document.getElementById('loading-text').innerText = text;
            overlay.style.display = 'flex';
        }
    } else if (overlay) {
        overlay.style.display = 'none';
    }
}

// Fetch Data from Google Sheets
async function loadData() {
    if (!sessionPassword) return; // No intentamos cargar sin contraseña

    // Si no hay URL, cargamos datos por defecto para que no se vea vacío mientras se configura
    if (SCRIPT_URL === "TU_URL_DE_APPS_SCRIPT_AQUI" || SCRIPT_URL === "") {
        console.warn("No hay SCRIPT_URL configurada. Mostrando ejemplo por defecto.");
        if(sessionPassword === "1234") {
            // Mock test for default password
            locationsData = [
                { id: "1", name: "SUN CITY", type: "Salón", address: "", phone: "", email: "", manager: "", operators: "", techBox: "", observations: "" },
                { id: "2", name: "CRYSTAL PARK", type: "Salón", address: "", phone: "", email: "", manager: "", operators: "", techBox: "", observations: "" },
                { id: "3", name: "CESARS PALACE", type: "Salón", address: "", phone: "", email: "", manager: "", operators: "", techBox: "", observations: "" },
                { id: "4", name: "OCEAN", type: "Salón", address: "", phone: "", email: "", manager: "", operators: "", techBox: "", observations: "" },
                { id: "5", name: "PARAISO", type: "Salón", address: "", phone: "", email: "", manager: "", operators: "", techBox: "", observations: "" }
            ];
            contactsData = [
                { id: "c1", category: "Central", name: "Soporte Central", phone: "+34 928 000 000", extraInfo: "Lunes a Viernes 8-16h", obs: "Avisar en caso de caída del servidor general." }
            ];
            renderList(locationsData);
            renderContactsList(contactsData);
            
            // Ocultamos la pantalla de login
            loginOverlay.style.opacity = '0';
            setTimeout(() => { loginOverlay.style.display = 'none'; }, 300);
            
            alert("Atención: Aún no has enlazado el Google Sheets. Se muestran datos de ejemplo. Sigue las instrucciones para desplegar el backend.");
        } else {
            loginError.innerText = "Contraseña incorrecta (Usa '1234' para simulación sin backend)";
            loginError.style.display = "block";
            sessionPassword = "";
        }
        return;
    }

    try {
        showLoading(true, 'Cargando base de datos y verificando...');
        const response = await fetch(`${SCRIPT_URL}?action=get&pwd=${encodeURIComponent(sessionPassword)}`);
        const result = await response.json();
        
        if (result.success) {
            locationsData = result.data; // Los salones del original
            if (result.contacts) {
                contactsData = result.contacts;
            }
            renderList(locationsData);
            renderContactsList(contactsData);
            
            // Ocultamos la pantalla de login tras éxito
            loginOverlay.style.opacity = '0';
            setTimeout(() => { loginOverlay.style.display = 'none'; }, 300);
            loginError.style.display = "none";
        } else {
            console.error("Error cargando datos:", result.error);
            sessionPassword = ""; // Resetear en caso de fallo
            loginError.innerText = result.error || "Contraseña incorrecta";
            loginError.style.display = "block";
        }
    } catch (error) {
        console.error("Fetch error:", error);
        sessionPassword = "";
        loginError.innerText = "Error de conexión con el servidor";
        loginError.style.display = "block";
    } finally {
        showLoading(false);
    }
}

// Evento Submit de Login
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pwd = pwdInput.value.trim();
    if(pwd) {
        sessionPassword = pwd;
        loginError.style.display = 'none';
        loadData();
    }
});

// Renderizar lista lateral
function renderList(dataToRender) {
    listContainer.innerHTML = '';
    
    if(dataToRender.length === 0) {
        listContainer.innerHTML = '<div style="color: #9ca3af; text-align: center; margin-top: 40px;">No se encontraron resultados</div>';
        return;
    }

    dataToRender.forEach(loc => {
        const item = document.createElement('div');
        item.className = 'location-item';
        item.dataset.id = loc.id;
        
        const typeClass = loc.type === 'Salón' ? 'type-salon' : 'type-empresa';
        
        item.innerHTML = `
            <div class="location-name">${loc.name}</div>
            <div class="location-type ${typeClass}">${loc.type}</div>
            <div class="location-address">
                <span class="material-symbols-outlined" style="font-size: 14px;">pin_drop</span>
                ${loc.address}
            </div>
        `;
        
        item.addEventListener('click', () => {
            showDetails(loc);
        });
        
        listContainer.appendChild(item);
    });
}

// Mostrar Detalle de Lectura
function showDetails(loc) {
    activeLocation = loc;
    const typeClass = loc.type === 'Salón' ? 'type-salon' : 'type-empresa';
    
    // Centrar mapa dinámicamente
    if (loc.address && mapIframe) {
        const query = encodeURIComponent(loc.name + ", " + loc.address);
        mapIframe.src = `https://maps.google.com/maps?q=${query}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
    }
    
    // Generar botones directos si hay datos
    const cleanPhoneLoc = loc.phone ? loc.phone.replace(/[^\d+]/g, '') : '';
    let actionButtons = `<div class="action-buttons-row">`;
    if (loc.address) {
        const dest = encodeURIComponent(loc.name + ', ' + loc.address);
        actionButtons += `<a href="https://www.google.com/maps/dir/?api=1&destination=${dest}" target="_blank" class="btn-action-sm btn-gps"><span class="material-symbols-outlined" style="font-size:16px;">directions_car</span> Cómo llegar</a>`;
    }
    if (cleanPhoneLoc) {
        actionButtons += `<a href="tel:${cleanPhoneLoc}" class="btn-action-sm btn-call"><span class="material-symbols-outlined" style="font-size:16px;">call</span> Llamar</a>`;
        actionButtons += `<a href="https://wa.me/${cleanPhoneLoc.replace('+', '')}" target="_blank" class="btn-action-sm btn-wa"><span class="material-symbols-outlined" style="font-size:16px;">chat</span> WhatsApp</a>`;
    }
    actionButtons += `</div>`;

    let html = `
        <div class="location-type ${typeClass}" style="margin-top: 10px;">${loc.type}</div>
        <div class="detail-header">
            <h2>${loc.name}</h2>
            <div class="location-address" style="margin-top:0">
                <span class="material-symbols-outlined" style="font-size: 16px;">map</span>
                ${loc.address}
            </div>
            ${actionButtons}
        </div>

        <div class="detail-section">
            <h3><span class="material-symbols-outlined">contact_phone</span> Contacto</h3>
            <div class="detail-item">
                <div class="item-label">Teléfono</div>
                <div class="item-value">${loc.phone || '<em>No asignado</em>'}</div>
            </div>
            <div class="detail-item">
                <div class="item-label">Email</div>
                <div class="item-value">${loc.email || '<em>No asignado</em>'}</div>
            </div>
            <div class="detail-item">
                <div class="item-label">Encargado/a</div>
                <div class="item-value">${loc.manager || '<em>No asignado</em>'}</div>
            </div>
        </div>

        <div class="detail-section">
            <h3><span class="material-symbols-outlined">badge</span> Operarios y Trabajo</h3>
            <div class="detail-text">${loc.operators ? loc.operators.replace(/,/g, '<br>• ') : '<em>No hay operarios asignados</em>'}</div>
        </div>
    `;

    if (loc.type === 'Salón') {
        html += `
            <div class="detail-section">
                <h3><span class="material-symbols-outlined">dns</span> Caja Técnica</h3>
                <div class="badge-caja">
                    <span class="material-symbols-outlined">router</span>
                    ${loc.techBox || 'No asignada'}
                </div>
            </div>
        `;
    }

    html += `
        <div class="detail-section">
            <h3><span class="material-symbols-outlined">info</span> Observaciones</h3>
            <div class="detail-text">${loc.observations || '<em>Sin observaciones</em>'}</div>
        </div>
        
        <button id="btn-open-edit" class="btn-edit">
            <span class="material-symbols-outlined">edit</span> Modificar Datos de Ubicación
        </button>
    `;

    detailContent.innerHTML = html;
    
    document.getElementById('btn-open-edit').addEventListener('click', () => {
        openEditForm(loc);
    });

    editPanel.classList.add('hidden'); // Cierra edición si estaba abierta
    detailPanel.classList.remove('hidden');
}

// Abrir formulario de edición
function openEditForm(loc) {
    document.getElementById('edit-location-name').innerText = loc.name;
    document.getElementById('edit-id').value = loc.id;
    document.getElementById('edit-phone').value = loc.phone || '';
    document.getElementById('edit-email').value = loc.email || '';
    document.getElementById('edit-manager').value = loc.manager || '';
    document.getElementById('edit-operators').value = loc.operators || '';
    document.getElementById('edit-techbox').value = loc.techBox || '';
    document.getElementById('edit-observations').value = loc.observations || '';
    
    // Ocultar caja técnica si es empresa
    const techGroup = document.getElementById('group-techbox');
    if(loc.type === 'Empresa') {
        techGroup.style.display = 'none';
    } else {
        techGroup.style.display = 'flex';
    }

    editPanel.classList.remove('hidden');
}

// Guardar los datos en el Backend
dataForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (SCRIPT_URL === "TU_URL_DE_APPS_SCRIPT_AQUI") {
        alert("Debes configurar el SCRIPT_URL en app.js para guardar los datos en Google Sheets.");
        return;
    }

    const formData = {
        action: 'update',
        pwd: sessionPassword,
        id: document.getElementById('edit-id').value,
        phone: document.getElementById('edit-phone').value,
        email: document.getElementById('edit-email').value,
        manager: document.getElementById('edit-manager').value,
        operators: document.getElementById('edit-operators').value,
        techBox: document.getElementById('edit-techbox').value,
        observations: document.getElementById('edit-observations').value
    };

    try {
        showLoading(true, 'Guardando en Google Sheets...');
        
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(formData),
            headers: {
                'Content-Type': 'text/plain;charset=utf-8' // Obligatorio para evitar preflight en Apps Script
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Datos guardados correctamente.');
            editPanel.classList.add('hidden');
            // Recargar datos para tener la versión fresca
            loadData();
        } else {
            alert('Error al guardar: ' + result.error);
        }
    } catch (error) {
        console.error("Save error:", error);
        alert('Hubo un error de conexión al guardar.');
    } finally {
        showLoading(false);
    }
});

// Búsqueda y filtrado local
function filterData() {
    const term = searchInput.value.toLowerCase();
    const activeType = document.querySelector('.filter-btn.active').dataset.type;
    
    const filtered = locationsData.filter(loc => {
        const safeName = (loc.name || '').toString().toLowerCase();
        const safeAddress = (loc.address || '').toString().toLowerCase();
        const matchesTerm = safeName.includes(term) || safeAddress.includes(term);
        
        let matchesType = activeType === 'all';
        if (!matchesType) {
            const locType = (loc.type || '').toString().trim().toLowerCase();
            const normalizedLocType = locType.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const normalizedActiveType = activeType.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            
            matchesType = normalizedLocType.startsWith(normalizedActiveType) || 
                          normalizedActiveType.startsWith(normalizedLocType);
        }
        return matchesTerm && matchesType;
    });
    
    renderList(filtered);
}

// Event Listeners adicionales
searchInput.addEventListener('input', filterData);

// Abrir y cerrar agenda
btnOpenAgenda.addEventListener('click', () => {
    agendaPanel.classList.remove('hidden');
    detailPanel.classList.add('hidden');
    editPanel.classList.add('hidden');
    restoreOriginalMap();
});

closeAgendaBtn.addEventListener('click', () => {
    agendaPanel.classList.add('hidden');
});

// Renderizar lista de contactos de la Agenda
function renderContactsList(dataToRender) {
    contactsListContainer.innerHTML = '';
    
    if(dataToRender.length === 0) {
        contactsListContainer.innerHTML = '<div style="color: #9ca3af; text-align: center; margin-top: 40px;">No hay contactos guardados</div>';
        return;
    }

    dataToRender.forEach(contact => {
        const item = document.createElement('div');
        item.className = 'contact-card';
        
        const obsValue = contact.observaciones || contact.obs || '';
        const emailValue = contact.email || contact.extraInfo || '';
        
        let obsHtml = obsValue ? `<div class="contact-obs">${obsValue}</div>` : '';
        let extraInfoHtml = emailValue ? `
            <div class="contact-info-row">
                <span class="material-symbols-outlined" style="font-size: 16px;">info</span>
                ${emailValue}
            </div>` : '';

        item.innerHTML = `
            <div class="contact-card-header" style="align-items: center;">
                <div>
                    <div class="contact-name">${contact.name}</div>
                    <div class="contact-category">${contact.category}</div>
                </div>
                <div class="contact-actions">
                    <button class="btn-icon edit-contact-btn" title="Editar">
                        <span class="material-symbols-outlined" style="font-size: 18px;">edit</span>
                    </button>
                    <button class="btn-icon btn-icon-danger delete-contact-btn" title="Eliminar">
                        <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
                    </button>
                </div>
            </div>
            <div class="contact-info-row" style="color: var(--accent); font-weight: 500;">
                <span class="material-symbols-outlined" style="font-size: 16px;">call</span>
                ${contact.phone || 'Sin número'}
            </div>
        `;
        
        if (contact.phone && contact.phone.trim() !== "") {
            const cleanPhone = contact.phone.replace(/[^\d+]/g, '');
            item.innerHTML += `
            <div class="action-buttons-row" style="margin-top: 4px; margin-bottom: 12px;">
                <a href="tel:${cleanPhone}" class="btn-action-sm btn-call"><span class="material-symbols-outlined" style="font-size:14px;">call</span> Llamar</a>
                <a href="https://wa.me/${cleanPhone.replace('+', '')}" target="_blank" class="btn-action-sm btn-wa"><span class="material-symbols-outlined" style="font-size:14px;">chat</span> WhatsApp</a>
            </div>`;
        }

        item.innerHTML += `
            ${extraInfoHtml}
            ${obsHtml}
        `;
        
        // Asignar eventos a los botones
        const editBtn = item.querySelector('.edit-contact-btn');
        editBtn.addEventListener('click', () => openContactForm(contact));

        const deleteBtn = item.querySelector('.delete-contact-btn');
        deleteBtn.addEventListener('click', () => deleteContact(contact.id));
        
        contactsListContainer.appendChild(item);
    });
}

// Búsqueda en agenda (Filtros)
filterBtnsAgenda.forEach(btn => {
    btn.addEventListener('click', (e) => {
        filterBtnsAgenda.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        const activeType = e.target.dataset.type;
        if (activeType === 'all') {
            renderContactsList(contactsData);
        } else {
            const filtered = contactsData.filter(c => {
                const cat = (c.category || '').toString().trim().toLowerCase();
                const normalizedCat = cat.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const normalizedActiveType = activeType.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                
                if (normalizedActiveType === "servicio tecnico" && (normalizedCat.includes("sat") || normalizedCat.includes("servicio"))) return true;
                if (normalizedActiveType === "tecnico ac" && normalizedCat.includes("tecnico")) return true;
                
                return normalizedCat.includes(normalizedActiveType) || normalizedActiveType.includes(normalizedCat);
            });
            renderContactsList(filtered);
        }
    });
});

filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        filterBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        filterData();
    });
});

closeDetailBtn.addEventListener('click', () => {
    detailPanel.classList.add('hidden');
    editPanel.classList.add('hidden');
    restoreOriginalMap();
});

closeEditBtn.addEventListener('click', () => {
    editPanel.classList.add('hidden');
});

closeContactEditBtn.addEventListener('click', () => {
    editContactPanel.classList.add('hidden');
});

btnNewContact.addEventListener('click', () => {
    openContactForm(null);
});

function openContactForm(contact) {
    if (contact) {
        document.getElementById('contact-form-title').innerText = 'Editar Contacto';
        document.getElementById('edit-contact-id').value = contact.id;
        document.getElementById('edit-contact-name').value = contact.name || '';
        document.getElementById('edit-contact-category').value = contact.category || 'Central';
        document.getElementById('edit-contact-phone').value = contact.phone || '';
        document.getElementById('edit-contact-extra').value = contact.extraInfo || '';
        document.getElementById('edit-contact-obs').value = contact.obs || '';
    } else {
        document.getElementById('contact-form-title').innerText = 'Añadir Contacto';
        document.getElementById('edit-contact-id').value = '';
        document.getElementById('edit-contact-name').value = '';
        document.getElementById('edit-contact-category').value = 'Central';
        document.getElementById('edit-contact-phone').value = '';
        document.getElementById('edit-contact-extra').value = '';
        document.getElementById('edit-contact-obs').value = '';
    }
    
    editContactPanel.classList.remove('hidden');
}

contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (SCRIPT_URL === "TU_URL_DE_APPS_SCRIPT_AQUI") {
        alert("Debes configurar el SCRIPT_URL en app.js para guardar los datos en Google Sheets.");
        return;
    }

    const id = document.getElementById('edit-contact-id').value;
    const isNew = !id;
    
    const formData = {
        action: isNew ? 'addContact' : 'updateContact',
        pwd: sessionPassword,
        id: id,
        name: document.getElementById('edit-contact-name').value,
        category: document.getElementById('edit-contact-category').value,
        phone: document.getElementById('edit-contact-phone').value,
        extraInfo: document.getElementById('edit-contact-extra').value,
        email: document.getElementById('edit-contact-extra').value,
        obs: document.getElementById('edit-contact-obs').value,
        observaciones: document.getElementById('edit-contact-obs').value
    };

    try {
        showLoading(true, isNew ? 'Añadiendo contacto...' : 'Actualizando contacto...');
        
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(formData),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        
        const result = await response.json();
        
        if (result.success) {
            editContactPanel.classList.add('hidden');
            loadData(); // Recarga toda la info, incluyendo contactos
        } else {
            alert('Error al guardar contacto: ' + result.error);
        }
    } catch (error) {
        console.error("Save contact error:", error);
        alert('Hubo un error de conexión al guardar.');
    } finally {
        showLoading(false);
    }
});

async function deleteContact(id) {
    if (SCRIPT_URL === "TU_URL_DE_APPS_SCRIPT_AQUI") {
        alert("Debes configurar el SCRIPT_URL en app.js para borrar de Google Sheets.");
        return;
    }

    if (!confirm("¿Estás seguro de que deseas eliminar este contacto?")) {
        return;
    }

    try {
        showLoading(true, 'Eliminando contacto...');
        
        const formData = {
            action: 'deleteContact',
            pwd: sessionPassword,
            id: id
        };
        
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(formData),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        
        const result = await response.json();
        
        if (result.success) {
            loadData();
        } else {
            alert('Error al eliminar: ' + result.error);
        }
    } catch (error) {
        console.error("Delete contact error:", error);
        alert('Hubo un error de conexión al eliminar.');
    } finally {
        showLoading(false);
    }
}

// Inicialización
// Ya no llamamos a loadData() directamente; esperamos a que el usuario se loguee en la pantalla inicial.
// window.onload = loadData;
