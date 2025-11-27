
// Global variables for managing state and data
let currentUser = null;
let users = JSON.parse(localStorage.getItem('users')) || [];

// Cargar todos los datos desde localStorage
let clients = JSON.parse(localStorage.getItem('clients')) || [];
let services = JSON.parse(localStorage.getItem('services')) || [];
let reports = JSON.parse(localStorage.getItem('reports')) || [];
let notifications = JSON.parse(localStorage.getItem('notifications')) || [];
let costoServicios = JSON.parse(localStorage.getItem('costoServicios')) || [];
let remisiones = JSON.parse(localStorage.getItem('remisiones')) || [];

let currentTheme = localStorage.getItem('theme') || 'light'; // Tema actual
let currentEmployeeServicesFilter = 'todos'; // Filtro actual para servicios del técnico

// Contadores para IDs únicos (cargados desde localStorage)
let serviceCounter = parseInt(localStorage.getItem('serviceCounter')) || 0;
let reportCounter = parseInt(localStorage.getItem('reportCounter')) || 0;
let remisionCounter = parseInt(localStorage.getItem('remisionCounter')) || 0;
let userCounter = parseInt(localStorage.getItem('userCounter')) || 0;


// Inicializar contador de usuarios basado en usuarios existentes
if (users.length > 0) {
    const maxUserNumber = users.reduce((max, user) => {
        if (user.id && user.id.startsWith('user')) {
            const num = parseInt(user.id.replace('user', ''));
            return num > max ? num : max;
        }
        return max;
    }, 0);
    if (maxUserNumber > userCounter) {
        userCounter = maxUserNumber;
        localStorage.setItem('userCounter', userCounter.toString());
    }
}

// Crear usuario administrador por defecto si no hay usuarios
if (users.length === 0) {
    users = [
        {
            id: generateUserId(),
            username: 'Jhon',
            password: 'Admin123', // Contraseña que cumple con los requisitos
            role: 'admin',
            createdAt: new Date().toISOString()
        }
    ];
    localStorage.setItem('users', JSON.stringify(users));
} else {
    // Verificar si el usuario Jhon existe, si no, crearlo. Si existe, actualizar su contraseña
    const jhonUser = users.find(u => u.username === 'Jhon');
    if (!jhonUser) {
        users.push({
            id: generateUserId(),
            username: 'Jhon',
            password: 'Admin123', // Contraseña que cumple con los requisitos
            role: 'admin',
            createdAt: new Date().toISOString()
        });
        saveUsers();
    } else {
        // Actualizar la contraseña del usuario Jhon para que cumpla con los requisitos
        // Solo si la contraseña actual no cumple los requisitos
        const passwordValidation = validatePassword(jhonUser.password);
        if (!passwordValidation.isValid || jhonUser.password !== 'Admin123') {
            jhonUser.password = 'Admin123';
            jhonUser.role = 'admin'; // Asegurar que sea administrador
            saveUsers();
        }
    }
    // Migrar usuarios existentes para agregar createdAt si no lo tienen
    let needsUpdate = false;
    users.forEach(user => {
        if (!user.createdAt) {
            user.createdAt = new Date().toISOString();
            needsUpdate = true;
        }
        // Migrar IDs antiguos al nuevo formato
        if (!user.id.startsWith('user')) {
            const oldId = user.id;
            user.id = generateUserId();
            // Actualizar referencias en servicios
            services.forEach(service => {
                if (service.technicianId === oldId) {
                    service.technicianId = user.id;
                }
            });
            needsUpdate = true;
        }
    });
    if (needsUpdate) {
        saveUsers();
        saveServices();
    }
}


// Migrar servicios existentes al nuevo formato de IDs
function migrateExistingIds() {
    let needsMigration = false;
    
    // Migrar servicios
    services.forEach(service => {
        if (!service.id.startsWith('S')) {
            const oldId = service.id;
            // Obtener el consecutivo del cliente para mantener la consistencia
            const clientConsecutive = service.clientName ? getClientConsecutiveByName(service.clientName) : 'SERV';
            service.id = generateServiceId(clientConsecutive);
            needsMigration = true;
        }
    });
    
    // Migrar reportes
    reports.forEach(report => {
        if (!report.id.startsWith('R')) {
            const oldId = report.id;
            report.id = generateReportId();
            needsMigration = true;
        }
    });
    
    if (needsMigration) {
        saveServices();
        saveReports();
    }
}

// Inicializar contadores basándose en datos existentes
function initializeCounters() {
    // Migrar IDs existentes primero
    migrateExistingIds();
    
    // Inicializar contador de servicios
    if (services.length > 0) {
        const serviceIds = services.map(s => s.id).filter(id => id.startsWith('S'));
        if (serviceIds.length > 0) {
            const maxServiceNumber = Math.max(...serviceIds.map(id => {
                const match = id.match(/^S(\d+)$/);
                return match ? parseInt(match[1]) : 0;
            }));
            serviceCounter = Math.max(serviceCounter, maxServiceNumber);
        }
    }
    
    // Inicializar contador de reportes
    if (reports.length > 0) {
        const reportIds = reports.map(r => r.id).filter(id => id.startsWith('R'));
        if (reportIds.length > 0) {
            const maxReportNumber = Math.max(...reportIds.map(id => {
                const match = id.match(/^R(\d+)$/);
                return match ? parseInt(match[1]) : 0;
            }));
            reportCounter = Math.max(reportCounter, maxReportNumber);
        }
    }
    
    // Guardar contadores actualizados
    localStorage.setItem('serviceCounter', serviceCounter.toString());
    localStorage.setItem('reportCounter', reportCounter.toString());
}

// Ejecutar inicialización de contadores
initializeCounters();

// Forzar migración y reinicio de contadores si es necesario
function forceMigrationAndReset() {
    // Migrar todos los servicios que no tengan formato S001
    let servicesMigrated = false;
    services.forEach(service => {
        if (!service.id.startsWith('S')) {
            const oldId = service.id;
            // Obtener el consecutivo del cliente para mantener la consistencia
            const clientConsecutive = service.clientName ? getClientConsecutiveByName(service.clientName) : 'SERV';
            service.id = generateServiceId(clientConsecutive);
            servicesMigrated = true;
        }
    });
    
    // Migrar todos los reportes que no tengan formato R001
    let reportsMigrated = false;
    reports.forEach(report => {
        if (!report.id.startsWith('R')) {
            const oldId = report.id;
            report.id = generateReportId();
            reportsMigrated = true;
        }
    });
    
    if (servicesMigrated || reportsMigrated) {
        saveServices();
        saveReports();
    }
    
    // Reiniciar contadores basándose en los datos migrados
    if (services.length > 0) {
        const serviceIds = services.map(s => s.id).filter(id => id.startsWith('S'));
        if (serviceIds.length > 0) {
            const maxServiceNumber = Math.max(...serviceIds.map(id => {
                const match = id.match(/^S(\d+)$/);
                return match ? parseInt(match[1]) : 0;
            }));
            serviceCounter = maxServiceNumber;
        }
    }
    
    if (reports.length > 0) {
        const reportIds = reports.map(r => r.id).filter(id => id.startsWith('R'));
        if (reportIds.length > 0) {
            const maxReportNumber = Math.max(...reportIds.map(id => {
                const match = id.match(/^R(\d+)$/);
                return match ? parseInt(match[1]) : 0;
            }));
            reportCounter = maxReportNumber;
        }
    }
    
    localStorage.setItem('serviceCounter', serviceCounter.toString());
    localStorage.setItem('reportCounter', reportCounter.toString());
}

// Ejecutar migración forzada
forceMigrationAndReset();

// Verificar y corregir IDs existentes
function ensureCorrectIds() {
    // Recargar datos del localStorage
    services = JSON.parse(localStorage.getItem('services')) || [];
    reports = JSON.parse(localStorage.getItem('reports')) || [];
    
    let needsUpdate = false;
    
    // Verificar servicios
    services.forEach(service => {
        // Verificar si el ID tiene un formato válido (letras + números)
        const isValidFormat = service.id && /^[A-Z]+\d{3,}$/.test(service.id);
        if (!service.id || (!isValidFormat && (!service.id.startsWith('S') || !/^S\d{3}$/.test(service.id)))) {
            const oldId = service.id;
            // Obtener el consecutivo del cliente para mantener la consistencia
            const clientConsecutive = service.clientName ? getClientConsecutiveByName(service.clientName) : 'SERV';
            service.id = generateServiceId(clientConsecutive);
            needsUpdate = true;
        }
    });
    
    // Verificar reportes
    reports.forEach(report => {
        if (!report.id || !report.id.startsWith('R') || !/^R\d{3}$/.test(report.id)) {
            const oldId = report.id;
            report.id = generateReportId();
            needsUpdate = true;
        }
    });
    
    if (needsUpdate) {
        saveServices();
        saveReports();
    }
    
    // Actualizar contadores basándose en los datos corregidos
    if (services.length > 0) {
        const serviceIds = services.map(s => s.id).filter(id => id.startsWith('S'));
        if (serviceIds.length > 0) {
            const maxServiceNumber = Math.max(...serviceIds.map(id => {
                const match = id.match(/^S(\d+)$/);
                return match ? parseInt(match[1]) : 0;
            }));
            serviceCounter = Math.max(serviceCounter, maxServiceNumber);
        }
    }
    
    if (reports.length > 0) {
        const reportIds = reports.map(r => r.id).filter(id => id.startsWith('R'));
        if (reportIds.length > 0) {
            const maxReportNumber = Math.max(...reportIds.map(id => {
                const match = id.match(/^R(\d+)$/);
                return match ? parseInt(match[1]) : 0;
            }));
            reportCounter = Math.max(reportCounter, maxReportNumber);
        }
    }
    
    localStorage.setItem('serviceCounter', serviceCounter.toString());
    localStorage.setItem('reportCounter', reportCounter.toString());
}

// Validar y corregir IDs antes de crear nuevos elementos
function validateAndCorrectIds() {
    // Sincronizar contadores con localStorage
    const currentServiceCounter = parseInt(localStorage.getItem('serviceCounter')) || 0;
    const currentReportCounter = parseInt(localStorage.getItem('reportCounter')) || 0;
    
    if (currentServiceCounter !== serviceCounter) {
        serviceCounter = currentServiceCounter;
    }
    
    if (currentReportCounter !== reportCounter) {
        reportCounter = currentReportCounter;
    }
    
    // Verificar que no haya IDs duplicados o incorrectos
    const serviceIds = services.map(s => s.id);
    const reportIds = reports.map(r => r.id);
    
    const duplicateServiceIds = serviceIds.filter((id, index) => serviceIds.indexOf(id) !== index);
    const duplicateReportIds = reportIds.filter((id, index) => reportIds.indexOf(id) !== index);
    
    if (duplicateServiceIds.length > 0) {
    }
    
    if (duplicateReportIds.length > 0) {
    }
    
    // Verificar formato de IDs
    const invalidServiceIds = serviceIds.filter(id => !/^S\d{3}$/.test(id));
    const invalidReportIds = reportIds.filter(id => !/^R\d{3}$/.test(id));
    
    if (invalidServiceIds.length > 0) {
    }
    
    if (invalidReportIds.length > 0) {
    }
}

// Ejecutar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    ensureCorrectIds();
});

// También ejecutar inmediatamente
ensureCorrectIds();

// SignaturePad instances
let signaturePadClient = null;
let signaturePadTechnician = null;

// --- Sistema de Paginación ---
const ITEMS_PER_PAGE = 10;

// Función para dividir un array en páginas
function paginateArray(array, page, itemsPerPage = ITEMS_PER_PAGE) {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return array.slice(startIndex, endIndex);
}

// Función para calcular el número total de páginas
function getTotalPages(totalItems, itemsPerPage = ITEMS_PER_PAGE) {
    return Math.ceil(totalItems / itemsPerPage);
}

// Función para generar controles de paginación
function generatePaginationControls(currentPage, totalPages, containerId, onPageChange) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // Detectar si estamos en móvil
    const isMobile = window.innerWidth <= 768;
    
    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'd-flex justify-content-center align-items-center mt-3';
    
    // Controles de navegación (centrados)
    const navContainer = document.createElement('div');
    navContainer.className = 'd-flex gap-2 align-items-center';
    
    // Botón anterior
    const prevButton = document.createElement('button');
    prevButton.className = `btn btn-outline-primary btn-sm ${currentPage === 1 ? 'disabled' : ''}`;
    if (isMobile) {
        prevButton.innerHTML = '<i class="bi bi-chevron-left"></i>';
        prevButton.setAttribute('aria-label', 'Página anterior');
    } else {
        prevButton.innerHTML = '‹ ANTERIOR';
    }
    prevButton.onclick = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };
    
    // Botones de página
    const pageButtonsContainer = document.createElement('div');
    pageButtonsContainer.className = 'd-flex gap-1';
    
    const maxVisiblePages = isMobile ? 3 : 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.className = `btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-outline-primary'}`;
        pageButton.textContent = i;
        pageButton.onclick = () => onPageChange(i);
        pageButtonsContainer.appendChild(pageButton);
    }
    
    // Botón siguiente
    const nextButton = document.createElement('button');
    nextButton.className = `btn btn-outline-primary btn-sm ${currentPage === totalPages ? 'disabled' : ''}`;
    if (isMobile) {
        nextButton.innerHTML = '<i class="bi bi-chevron-right"></i>';
        nextButton.setAttribute('aria-label', 'Página siguiente');
    } else {
        nextButton.innerHTML = 'SIGUIENTE ›';
    }
    nextButton.onclick = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };
    
    navContainer.appendChild(prevButton);
    navContainer.appendChild(pageButtonsContainer);
    navContainer.appendChild(nextButton);
    
    paginationContainer.appendChild(navContainer);
    container.appendChild(paginationContainer);
}

// Función para agregar numeración a las filas de una tabla
function addRowNumbers(tableBody, startNumber = 1) {
    const rows = tableBody.querySelectorAll('tr');
    rows.forEach((row, index) => {
        // Insertar celda de numeración al inicio
        const numberCell = document.createElement('td');
        numberCell.className = 'text-center fw-bold';
        numberCell.style.width = '50px';
        numberCell.textContent = startNumber + index;
        row.insertBefore(numberCell, row.firstChild);
    });
}

// Función para agregar encabezado de numeración a una tabla
function addNumberHeader(tableHeader) {
    const headerRow = tableHeader.querySelector('tr');
    if (headerRow) {
        const numberHeader = document.createElement('th');
        numberHeader.className = 'text-center';
        numberHeader.style.width = '50px';
        numberHeader.innerHTML = '<i class="bi bi-hash"></i>';
        headerRow.insertBefore(numberHeader, headerRow.firstChild);
    }
}

// Initialize an admin user if none exists
if (users.length === 0) {
    users.push({ id: generateId(), username: 'admin', password: 'adminpassword', role: 'admin' });
    saveUsers();
}

// Event listener para cerrar el menú hamburguesa cuando se hace clic en enlaces de navegación
document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            const navbarCollapse = document.getElementById('navbarNav');
            if (navbarCollapse.classList.contains('show')) {
                const bsCollapse = new bootstrap.Collapse(navbarCollapse, {toggle: false});
                bsCollapse.hide();
            }
        });
    });
});

// Function to generate unique IDs
function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

// Función para generar ID único de usuario (user001, user002, etc.)
function generateUserId() {
    userCounter++;
    localStorage.setItem('userCounter', userCounter.toString());
    return 'user' + userCounter.toString().padStart(3, '0');
}

// Función para obtener el consecutivo del cliente por nombre
function getClientConsecutiveByName(clientName) {
    if (!clientName) return 'SERV'; // Consecutivo por defecto si no hay cliente
    const client = clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
    if (client && client.consecutive) {
        return client.consecutive.toUpperCase();
    }
    // Si no se encuentra el cliente o no tiene consecutivo, generar uno desde el nombre
    return generateClientConsecutive(clientName);
}

// Función para generar ID único de servicio basado en el consecutivo del cliente
// El número es global para todos los servicios, independientemente del prefijo
function generateServiceId(clientConsecutive) {
    // Si no se proporciona consecutivo, usar 'SERV' como predeterminado
    const prefix = clientConsecutive || 'SERV';
    
    // Recargar servicios para asegurar que tenemos los datos más actualizados
    services = JSON.parse(localStorage.getItem('services')) || [];
    
    // Extraer todos los números de los IDs de servicios existentes
    // Los IDs pueden tener formato: BANC001, FLAM002, SERV003, etc.
    const serviceNumbers = services
        .map(service => {
            if (!service.id) return null;
            // Buscar el patrón: letras seguidas de números
            const match = service.id.match(/^([A-Z]+)(\d+)$/);
            if (match) {
                return parseInt(match[2]);
            }
            // Si el ID tiene formato antiguo (S001, S002, etc.), también extraerlo
            const oldMatch = service.id.match(/^S(\d+)$/);
            if (oldMatch) {
                return parseInt(oldMatch[1]);
            }
            return null;
        })
        .filter(num => num !== null);
    
    // Encontrar el número más alto
    const maxNumber = serviceNumbers.length > 0 ? Math.max(...serviceNumbers) : 0;
    
    // Generar el siguiente número
    const nextNumber = maxNumber + 1;
    
    // Formatear con el prefijo del consecutivo del cliente
    return prefix.toUpperCase() + nextNumber.toString().padStart(3, '0');
}

// Función para generar ID único de reporte (R001, R002, etc.)
function generateReportId() {
    reportCounter++;
    localStorage.setItem('reportCounter', reportCounter.toString());
    return 'R' + reportCounter.toString().padStart(3, '0');
}

// Función para generar ID único de remisión (RM001, RM002, etc.)
function generateRemisionId() {
    remisionCounter++;
    localStorage.setItem('remisionCounter', remisionCounter.toString());
    return 'RM' + remisionCounter.toString().padStart(3, '0');
}

// Función para generar códigos de servicio incrementales (CS001, CS002, etc.)
function generateCostoServicioCode() {
    // Obtener el último código existente
    const existingCodes = costoServicios.map(s => s.codigo);
    const numericCodes = existingCodes
        .filter(code => code && code.startsWith('CS'))
        .map(code => {
            const numPart = code.substring(2);
            return parseInt(numPart) || 0;
        });
    
    // Encontrar el siguiente número
    const nextNumber = numericCodes.length > 0 ? Math.max(...numericCodes) + 1 : 1;
    
    // Formatear como CS001, CS002, etc.
    return 'CS' + String(nextNumber).padStart(3, '0');
}

// Función para mostrar/ocultar el campo de tipo personalizado
function toggleOtroTipo() {
    const tipoSelect = document.getElementById('costo-servicio-tipo');
    const otroContainer = document.getElementById('otro-tipo-container');
    const otroInput = document.getElementById('costo-servicio-otro-tipo');
    
    if (tipoSelect.value === 'Otro') {
        otroContainer.classList.remove('d-none');
        otroInput.required = true;
        otroInput.focus();
    } else {
        otroContainer.classList.add('d-none');
        otroInput.required = false;
        otroInput.value = '';
    }
}

// Función para forzar la carga de datos en el modal de costo servicios
function forceLoadDataInModal(servicio) {
    document.getElementById('edit-costo-servicio-id').value = servicio.id;
    document.getElementById('costo-servicio-codigo').value = servicio.codigo || '';
    document.getElementById('costo-servicio-tipo').value = servicio.tipo || '';
    document.getElementById('costo-servicio-descripcion').value = servicio.descripcion || '';
    document.getElementById('costo-servicio-precio').value = servicio.precio || '';
}

// Función para forzar la carga de datos en el modal de servicios
function forceLoadServiceDataInModal(service) {
    try {
        document.getElementById('edit-service-id').value = service.id;
        
        // Convertir fecha de formato ISO (YYYY-MM-DD) a formato dd/mm/yyyy para el input
        let fechaFormateada = service.date || '';
        if (fechaFormateada && fechaFormateada.trim() !== '') {
            try {
                // Si la fecha está en formato ISO (YYYY-MM-DD), convertirla a dd/mm/yyyy
                if (/^\d{4}-\d{2}-\d{2}$/.test(fechaFormateada.trim())) {
                    const [year, month, day] = fechaFormateada.trim().split('-');
                    fechaFormateada = `${day}/${month}/${year}`;
                } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(fechaFormateada.trim())) {
                    // Ya está en formato dd/mm/yyyy, mantenerla
                    fechaFormateada = fechaFormateada.trim();
                } else {
                    // Intentar parsear como fecha y convertir
                    const date = new Date(fechaFormateada);
                    if (!isNaN(date.getTime())) {
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = date.getFullYear();
                        fechaFormateada = `${day}/${month}/${year}`;
                    } else {
                        // Si no se puede parsear, intentar mantener el valor original
                        fechaFormateada = fechaFormateada.trim();
                    }
                }
            } catch (e) {
                // Si hay error, intentar usar la fecha original si es válida
                if (fechaFormateada && fechaFormateada.trim() !== '') {
                    fechaFormateada = fechaFormateada.trim();
                } else {
                    fechaFormateada = '';
                }
            }
        } else {
            fechaFormateada = '';
        }
        
        // Asegurar que el campo de fecha se establezca correctamente
        const dateInput = document.getElementById('service-date');
        if (dateInput) {
            dateInput.value = fechaFormateada;
            // Forzar actualización del valor para asegurar que se muestre
            if (fechaFormateada) {
                dateInput.setAttribute('value', fechaFormateada);
            }
        }
        
        // Cargar hora de servicio - buscar en time, hora, o formatear desde startTime
        let horaServicio = service.time || service.hora || '';
        
        // Si la hora es un número (decimal de Excel), convertirla
        if (typeof horaServicio === 'number') {
            horaServicio = convertExcelTimeToHourFormat(horaServicio);
        } else if (horaServicio) {
            // Si es un string, asegurarse de que esté en formato de 12 horas
            horaServicio = convertTo12HourFormat(horaServicio);
        }
        
        // Si no hay hora y hay startTime, intentar formatear desde startTime
        if (!horaServicio && service.startTime) {
            try {
                const startDate = new Date(service.startTime);
                if (!isNaN(startDate.getTime())) {
                    const hours = startDate.getHours();
                    const minutes = String(startDate.getMinutes()).padStart(2, '0');
                    const seconds = String(startDate.getSeconds()).padStart(2, '0');
                    const ampm = hours >= 12 ? 'p. m.' : 'a. m.';
                    const hours12 = hours % 12 || 12;
                    horaServicio = `${String(hours12).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
                }
            } catch (e) {
                // Si hay error, dejar vacío
            }
        }
        
        document.getElementById('service-time').value = horaServicio || '';
        
        document.getElementById('service-code').value = service.serviceCode || '';
        document.getElementById('service-type').value = service.safeType || '';
        document.getElementById('service-description').value = service.description || '';
        document.getElementById('service-location').value = service.location || '';
        document.getElementById('service-client-name').value = service.clientName || '';
        document.getElementById('service-client-phone').value = service.clientPhone || '';
        
        // Cargar número de aviso
        const avisoNumberInput = document.getElementById('service-aviso-number');
        if (avisoNumberInput) {
            avisoNumberInput.value = service.avisoNumber || '';
        }
        
        // Cargar NIT/CC - buscar en clientNit, nit, o en el cliente asociado
        let clientNit = service.clientNit || service.nit || '';
        if (!clientNit && service.clientName) {
            // Si no hay NIT en el servicio, buscar en el cliente
            const client = clients.find(c => c.name === service.clientName);
            if (client && client.nit) {
                clientNit = client.nit;
            }
        }
        document.getElementById('service-client-nit').value = clientNit;
        
        // Cargar EMAIL - buscar en clientEmail, email, o en el cliente asociado
        let clientEmail = service.clientEmail || service.email || '';
        if (!clientEmail && service.clientName) {
            // Si no hay EMAIL en el servicio, buscar en el cliente
            const client = clients.find(c => c.name === service.clientName);
            if (client && client.email) {
                clientEmail = client.email;
            }
        }
        document.getElementById('service-client-email').value = clientEmail;
        
        document.getElementById('service-status').value = service.status;
        
        // Cargar cantidad del servicio
        const quantityInput = document.getElementById('service-quantity');
        if (quantityInput) {
            quantityInput.value = service.quantity || 1;
        }
        
        // Cargar servicios adicionales
        const additionalServicesContainer = document.getElementById('additional-services-container');
        if (additionalServicesContainer && service.additionalServices && Array.isArray(service.additionalServices) && service.additionalServices.length > 0) {
            additionalServicesContainer.innerHTML = '';
            service.additionalServices.forEach((additionalService, index) => {
                const serviceIndex = index;
                const additionalServiceDiv = document.createElement('div');
                additionalServiceDiv.className = 'mb-3 p-3 border rounded bg-light';
                additionalServiceDiv.setAttribute('data-service-index', serviceIndex);
                const suggestionsId = `additional-service-suggestions-${serviceIndex}`;
                additionalServiceDiv.innerHTML = `
                    <div class="row mb-3">
                        <div class="col-md-6 mb-3">
                            <div class="service-code-selector">
                                <label class="form-label fw-bold service-code-label">CÓDIGO DE SERVICIO ADICIONAL</label>
                                <input type="text" class="form-control service-code-input additional-service-code" placeholder="Escribir para buscar código..." name="additional-service-code-${serviceIndex}" data-service-index="${serviceIndex}" value="${additionalService.code || ''}" oninput="searchAdditionalServiceCode(this)" onchange="loadAdditionalServiceDetails(this)" onblur="setTimeout(() => { const div = document.getElementById('${suggestionsId}'); if(div) div.style.display = 'none'; }, 200);">
                                <div class="service-code-suggestions" id="${suggestionsId}" style="display: none;"></div>
                            </div>
                        </div>
                        <div class="col-md-3 mb-3">
                            <label class="form-label fw-bold">TIPO DE SERVICIO</label>
                            <input type="text" class="form-control additional-service-type" placeholder="" name="additional-service-type-${serviceIndex}" value="${additionalService.type || ''}" readonly>
                        </div>
                        <div class="col-md-3 mb-3">
                            <label class="form-label fw-bold">CANTIDAD</label>
                            <input type="number" class="form-control additional-service-quantity" placeholder="1" name="additional-service-quantity-${serviceIndex}" min="1" value="${additionalService.quantity || 1}">
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-10 mb-3">
                            <label class="form-label fw-bold">DESCRIPCIÓN</label>
                            <input type="text" class="form-control additional-service-description" placeholder="" name="additional-service-description-${serviceIndex}" value="${additionalService.description || ''}" readonly>
                        </div>
                        <div class="col-md-2 mb-3 d-flex align-items-end">
                            <button type="button" class="btn btn-link text-danger p-0" onclick="this.closest('.bg-light').remove()" style="text-decoration: none;">
                                <i class="bi bi-trash me-1"></i> ELIMINAR
                            </button>
                        </div>
                    </div>
                `;
                additionalServicesContainer.appendChild(additionalServiceDiv);
            });
        } else if (additionalServicesContainer) {
            additionalServicesContainer.innerHTML = '';
        }
        
        togglePhotoAndSignatureSections(service.status, currentUser.role === 'employee');
        togglePhotoAndSignatureSections(service.status, currentUser.role === 'employee');
        
        // Cargar foto si existe
        if (service.photo) {
            document.getElementById('service-photo-preview').src = service.photo;
            document.getElementById('service-photo-preview').classList.remove('d-none');
        } else {
            document.getElementById('service-photo-preview').classList.add('d-none');
        }
        
        // Cargar firma del cliente si existe
        const signatureCanvasClient = document.getElementById('signature-pad-client');
        if (service.clientSignature && signaturePadClient) {
            const img = new Image();
            img.onload = function() {
                if (signaturePadClient) {
                    signaturePadClient.fromDataURL(service.clientSignature, {
                        width: signatureCanvasClient.width,
                        height: signatureCanvasClient.height
                    });
                }
            };
            img.src = service.clientSignature;
        } else {
            clearSignaturePad('client');
        }
        
        // Cargar firma del técnico si existe
        const signatureCanvasTechnician = document.getElementById('signature-pad-technician');
        if (service.technicianSignature && signaturePadTechnician) {
            const img = new Image();
            img.onload = function() {
                if (signaturePadTechnician) {
                    signaturePadTechnician.fromDataURL(service.technicianSignature, {
                        width: signatureCanvasTechnician.width,
                        height: signatureCanvasTechnician.height
                    });
                }
            };
            img.src = service.technicianSignature;
        } else {
            clearSignaturePad('technician');
        }
        
        loadServiceDetails();
    } catch (error) {
    }
}

// Save data to localStorage
function saveUsers() {
    localStorage.setItem('users', JSON.stringify(users));
}

function saveClients() {
    localStorage.setItem('clients', JSON.stringify(clients));
}

function saveServices() {
    localStorage.setItem('services', JSON.stringify(services));
}

function saveReports() {
    localStorage.setItem('reports', JSON.stringify(reports));
}

function saveNotifications() {
    localStorage.setItem('notifications', JSON.stringify(notifications));
}

// Función para eliminar 2 servicios finalizados y 2 notificaciones
function deleteFinishedServicesAndNotifications() {
    // Cargar servicios desde localStorage
    let services = JSON.parse(localStorage.getItem('services')) || [];
    
    // Filtrar servicios finalizados
    const finishedServices = services.filter(s => s.status === 'Finalizado');
    
    // Eliminar los primeros 2 servicios finalizados
    if (finishedServices.length >= 2) {
        const idsToRemove = finishedServices.slice(0, 2).map(s => s.id);
        services = services.filter(s => !idsToRemove.includes(s.id));
        localStorage.setItem('services', JSON.stringify(services));
        
        // Actualizar la variable global
        window.services = services;
    }
    
    // Cargar notificaciones desde localStorage
    let notifications = JSON.parse(localStorage.getItem('notifications')) || [];
    
    // Eliminar las primeras 2 notificaciones
    if (notifications.length >= 2) {
        notifications = notifications.slice(2);
        localStorage.setItem('notifications', JSON.stringify(notifications));
        
        // Actualizar la variable global
        window.notifications = notifications;
    }
    
    // Recargar la vista si está en el dashboard
    if (typeof renderServices === 'function') {
        renderServices();
    }
    if (typeof loadAdminNotifications === 'function') {
        loadAdminNotifications();
    }
    if (typeof loadEmployeeNotifications === 'function') {
        loadEmployeeNotifications();
    }
    
    return {
        servicesDeleted: Math.min(finishedServices.length, 2),
        notificationsDeleted: Math.min(notifications.length, 2)
    };
}

// Ejecutar automáticamente al cargar (solo una vez)
(function() {
    // Cargar servicios desde localStorage
    let services = JSON.parse(localStorage.getItem('services')) || [];
    
    // Filtrar servicios finalizados
    const finishedServices = services.filter(s => s.status === 'Finalizado');
    
    // Eliminar los primeros 2 servicios finalizados si existen
    if (finishedServices.length >= 2) {
        const idsToRemove = finishedServices.slice(0, 2).map(s => s.id);
        services = services.filter(s => !idsToRemove.includes(s.id));
        localStorage.setItem('services', JSON.stringify(services));
        // Actualizar variable global si existe
        if (typeof window !== 'undefined' && window.services) {
            window.services = services;
        }
    }
    
    // Cargar notificaciones desde localStorage
    let notifications = JSON.parse(localStorage.getItem('notifications')) || [];
    
    // Eliminar las primeras 2 notificaciones si existen
    if (notifications.length >= 2) {
        notifications = notifications.slice(2);
        localStorage.setItem('notifications', JSON.stringify(notifications));
        // Actualizar variable global si existe
        if (typeof window !== 'undefined' && window.notifications) {
            window.notifications = notifications;
        }
    }
})();

function saveCostoServicios() {
    localStorage.setItem('costoServicios', JSON.stringify(costoServicios));
}

function saveRemisiones() {
    localStorage.setItem('remisiones', JSON.stringify(remisiones));
}

// --- Reemplazo de Alerts y Confirms nativos ---
function showAlert(message) {
    // Limpiar contenido anterior
    document.getElementById('customAlertModalBody').textContent = message;
    
    // Obtener o crear instancia del modal
    let alertModal = bootstrap.Modal.getInstance(document.getElementById('customAlertModal'));
    if (!alertModal) {
        alertModal = new bootstrap.Modal(document.getElementById('customAlertModal'));
    }
    // Mostrar el modal
    alertModal.show();
}

function showConfirm(message, callback) {
    document.getElementById('customConfirmModalBody').textContent = message;
    const confirmModalElement = document.getElementById('customConfirmModal');
    const confirmModal = new bootstrap.Modal(confirmModalElement);

    const confirmBtn = document.getElementById('customConfirmBtn');

    // Remove any existing event listeners to prevent duplicates
    confirmBtn.onclick = null; // Clear previous click handlers

    // Add new click listener for the Confirm button
    confirmBtn.onclick = () => {
        callback(true);
        confirmModal.hide();
        // Remove the 'hidden.bs.modal' listener if confirmed
        confirmModalElement.removeEventListener('hidden.bs.modal', hiddenHandler);
    };

    // Add a listener for when the modal is hidden (e.g., by Cancel button or close icon)
    const hiddenHandler = function() {
        // If the confirmBtn.onclick is still set, it means 'Confirm' was not clicked
        // and the modal was dismissed by other means (e.g., Cancel, backdrop click)
        if (confirmBtn.onclick) {
            callback(false);
        }
        confirmModalElement.removeEventListener('hidden.bs.modal', hiddenHandler); // Clean up
    };
    confirmModalElement.addEventListener('hidden.bs.modal', hiddenHandler);

    confirmModal.show();
}

// --- Funciones para el modal de progreso ---
let progressModalInstance = null;

function initProgressModal(type, total) {
    // Obtener o crear instancia del modal
    progressModalInstance = bootstrap.Modal.getInstance(document.getElementById('progressModal'));
    if (!progressModalInstance) {
        progressModalInstance = new bootstrap.Modal(document.getElementById('progressModal'));
    }
    
    // Configurar título y icono según el tipo
    const titleEl = document.getElementById('progress-title');
    const iconEl = document.getElementById('progress-icon');
    const closeBtn = document.getElementById('progress-close-btn');
    const doneBtn = document.getElementById('progress-done-btn');
    const progressBar = document.getElementById('progress-bar');
    
    if (type === 'import') {
        titleEl.textContent = 'Importando registros...';
        iconEl.className = 'bi bi-upload me-2';
        iconEl.style.fontSize = '1.2rem';
    } else if (type === 'delete') {
        titleEl.textContent = 'Eliminando registros...';
        iconEl.className = 'bi bi-trash-fill me-2';
        iconEl.style.fontSize = '1.2rem';
    }
    
    // Resetear valores
    updateProgress(0, total, 'Iniciando proceso...', 0, 0, 0);
    
    // Restaurar animación de la barra de progreso
    progressBar.classList.add('progress-bar-animated');
    
    // Ocultar botones
    closeBtn.classList.add('d-none');
    doneBtn.classList.add('d-none');
    doneBtn.style.display = 'none';
    
    // Mostrar el modal
    progressModalInstance.show();
}

function updateProgress(current, total, message, successes, warnings, errors) {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    
    // Actualizar mensaje
    document.getElementById('progress-message').textContent = message;
    
    // Actualizar barra de progreso
    const progressBar = document.getElementById('progress-bar');
    const progressPercentage = document.getElementById('progress-percentage');
    progressBar.style.width = percentage + '%';
    progressBar.setAttribute('aria-valuenow', percentage);
    progressPercentage.textContent = percentage + '%';
    
    // Actualizar contadores
    document.getElementById('progress-successes').textContent = successes;
    document.getElementById('progress-warnings').textContent = warnings;
    document.getElementById('progress-errors').textContent = errors;
}

function completeProgress(type, totalProcessed, message, successes, warnings, errors) {
    const titleEl = document.getElementById('progress-title');
    const iconEl = document.getElementById('progress-icon');
    const closeBtn = document.getElementById('progress-close-btn');
    const doneBtn = document.getElementById('progress-done-btn');
    const progressBar = document.getElementById('progress-bar');
    
    // Cambiar título y icono
    if (type === 'import') {
        titleEl.textContent = 'Importación completada';
    } else if (type === 'delete') {
        titleEl.textContent = 'Eliminación completada';
    }
    
    iconEl.className = 'bi bi-check-circle-fill me-2';
    
    // Completar barra de progreso
    progressBar.style.width = '100%';
    progressBar.classList.remove('progress-bar-animated');
    document.getElementById('progress-percentage').textContent = '100%';
    
    // Mostrar mensaje final
    const finalMessage = message || (type === 'import' 
        ? `Importación completada. ${successes} registros importados.` 
        : `Eliminación completada. ${successes} registros eliminados.`);
    document.getElementById('progress-message').textContent = finalMessage;
    
    // Mostrar botones
    closeBtn.classList.remove('d-none');
    doneBtn.classList.remove('d-none');
    doneBtn.style.display = 'block';
    doneBtn.style.visibility = 'visible';
    doneBtn.style.opacity = '1';
    doneBtn.removeAttribute('hidden');
    
    // Asegurar que el modal-footer sea visible
    const modalFooter = doneBtn.closest('.modal-footer');
    if (modalFooter) {
        modalFooter.style.display = 'flex';
        modalFooter.style.visibility = 'visible';
        modalFooter.style.opacity = '1';
        modalFooter.classList.remove('d-none');
    }
    
    // Actualizar contadores finales
    document.getElementById('progress-successes').textContent = successes;
    document.getElementById('progress-warnings').textContent = warnings;
    document.getElementById('progress-errors').textContent = errors;
}

function closeProgressModal() {
    if (progressModalInstance) {
        progressModalInstance.hide();
    }
}


// --- UI Display Functions ---

function showLogin() {
    // Mostrar login con múltiples métodos para asegurar que se muestre
    const loginSection = document.getElementById('login-section');
    loginSection.classList.remove('d-none');
    loginSection.style.display = 'block';
    loginSection.style.visibility = 'visible';
    loginSection.style.opacity = '1';
    loginSection.style.position = 'relative';
    loginSection.style.top = 'auto';
    loginSection.style.left = 'auto';
    
    // Ocultar dashboards
    const adminSection = document.getElementById('admin-dashboard-section');
    adminSection.classList.add('d-none');
    adminSection.style.display = 'none';
    adminSection.style.visibility = 'hidden';
    adminSection.style.opacity = '0';
    adminSection.style.position = 'absolute';
    adminSection.style.top = '-9999px';
    adminSection.style.left = '-9999px';
    
    const employeeSection = document.getElementById('employee-dashboard-section');
    employeeSection.classList.add('d-none');
    employeeSection.style.display = 'none';
    employeeSection.style.visibility = 'hidden';
    employeeSection.style.opacity = '0';
    employeeSection.style.position = 'absolute';
    employeeSection.style.top = '-9999px';
    employeeSection.style.left = '-9999px';
    
    // Actualizar navegación
    document.getElementById('nav-login').classList.remove('d-none');
    document.getElementById('nav-logout').classList.add('d-none');
    document.getElementById('nav-admin-dashboard').classList.add('d-none');
    document.getElementById('nav-employee-dashboard').classList.add('d-none');
    
    currentUser = null;
    // Clear login fields on showing login
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    updateNotificationBadges(); // Clear badges on logout
}

function showAdminDashboard() {
    if (currentUser && currentUser.role === 'admin') {
        // Cerrar el menú hamburguesa si está abierto
        const navbarCollapse = document.getElementById('navbarNav');
        if (navbarCollapse.classList.contains('show')) {
            const bsCollapse = new bootstrap.Collapse(navbarCollapse, {toggle: false});
            bsCollapse.hide();
        }
        
        // Ocultar login con múltiples métodos para asegurar que se oculte
        const loginSection = document.getElementById('login-section');
        loginSection.classList.add('d-none');
        loginSection.style.display = 'none';
        loginSection.style.visibility = 'hidden';
        loginSection.style.opacity = '0';
        loginSection.style.position = 'absolute';
        loginSection.style.top = '-9999px';
        loginSection.style.left = '-9999px';
        
        // Mostrar admin dashboard
        const adminSection = document.getElementById('admin-dashboard-section');
        adminSection.classList.remove('d-none');
        adminSection.style.display = 'block';
        adminSection.style.visibility = 'visible';
        adminSection.style.opacity = '1';
        adminSection.style.position = 'relative';
        adminSection.style.top = 'auto';
        adminSection.style.left = 'auto';
        
        // Ocultar employee dashboard
        document.getElementById('employee-dashboard-section').classList.add('d-none');
        
        // Actualizar navegación
        document.getElementById('nav-login').classList.add('d-none');
        document.getElementById('nav-logout').classList.remove('d-none');
        const adminNavLink = document.getElementById('nav-admin-dashboard');
        adminNavLink.classList.remove('d-none');
        adminNavLink.textContent = currentUser.username; // Mostrar nombre del usuario
        document.getElementById('nav-employee-dashboard').classList.add('d-none');
        
        // Renderizar contenido
        renderUserList(1);
        initializeClientsModule();
        fixExistingServices(); // Corregir servicios existentes
        renderAdminServicesList(services, 1);
        populateAssignServiceDropdown();
        populateAssignTechnicianDropdown();
        populateTechnicianDropdowns();
        renderAssignedServicesList(1);
        renderReportsList(1);
        renderAdminNotifications(1);
        updateNotificationBadges(); // Update badges for admin
        
        // Inicializar nuevos módulos
        initializeAdminModules();
        
        // Limpiar todos los filtros al entrar al módulo de servicios
        clearFilters();
    } else {
        showAlert('Acceso denegado. Solo administradores.');
        showLogin();
    }
}

function setDefaultDateFilters() {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    
    document.getElementById('filter-date-from').value = lastMonth.toISOString().split('T')[0];
    document.getElementById('filter-date-to').value = today.toISOString().split('T')[0];
    
    // Aplicar filtros por defecto
    filterServices();
}

function showEmployeeDashboard() {
    if (currentUser && currentUser.role === 'employee') {
        // Cerrar el menú hamburguesa si está abierto
        const navbarCollapse = document.getElementById('navbarNav');
        if (navbarCollapse.classList.contains('show')) {
            const bsCollapse = new bootstrap.Collapse(navbarCollapse, {toggle: false});
            bsCollapse.hide();
        }
        
        // Ocultar login con múltiples métodos para asegurar que se oculte
        const loginSection = document.getElementById('login-section');
        loginSection.classList.add('d-none');
        loginSection.style.display = 'none';
        loginSection.style.visibility = 'hidden';
        loginSection.style.opacity = '0';
        loginSection.style.position = 'absolute';
        loginSection.style.top = '-9999px';
        loginSection.style.left = '-9999px';
        
        // Ocultar admin dashboard
        document.getElementById('admin-dashboard-section').classList.add('d-none');
        
        // Mostrar employee dashboard
        const employeeSection = document.getElementById('employee-dashboard-section');
        employeeSection.classList.remove('d-none');
        employeeSection.style.display = 'block';
        employeeSection.style.visibility = 'visible';
        employeeSection.style.opacity = '1';
        employeeSection.style.position = 'relative';
        employeeSection.style.top = 'auto';
        employeeSection.style.left = 'auto';
        
        // Actualizar navegación
        document.getElementById('nav-login').classList.add('d-none');
        document.getElementById('nav-logout').classList.remove('d-none');
        document.getElementById('nav-admin-dashboard').classList.add('d-none');
        const employeeNavLink = document.getElementById('nav-employee-dashboard');
        employeeNavLink.classList.remove('d-none');
        employeeNavLink.textContent = currentUser.username; // Mostrar nombre del usuario
        
        // Renderizar contenido
        renderEmployeeAssignedServices(1);
        renderEmployeeNotifications(1);
        renderEmployeeReportReplies(1);
        updateEmployeeFilterCounts(); // Actualizar contadores de filtros
        updateNotificationBadges(); // Update badges for employee
    } else {
        showAlert('Acceso denegado. Solo empleados.');
        showLogin();
    }
}

function logout() {
    currentUser = null;
    
    // Cerrar el menú hamburguesa si está abierto
    const navbarCollapse = document.getElementById('navbarNav');
    if (navbarCollapse.classList.contains('show')) {
        const bsCollapse = new bootstrap.Collapse(navbarCollapse, {toggle: false});
        bsCollapse.hide();
    }
    
    showLogin();
}

// --- Login Logic ---
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginError = document.getElementById('login-error');

    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        currentUser = user;
        loginError.textContent = '';
        // Cerrar el menú hamburguesa si está abierto
        const navbarCollapse = document.getElementById('navbarNav');
        if (navbarCollapse.classList.contains('show')) {
            const bsCollapse = new bootstrap.Collapse(navbarCollapse, {toggle: false});
            bsCollapse.hide();
        }
        
        if (currentUser.role === 'admin') {
            showAdminDashboard();
        } else if (currentUser.role === 'employee') {
            showEmployeeDashboard();
        }
    } else {
        loginError.textContent = 'Usuario o contraseña incorrectos.';
    }
});

// --- User Management (Admin) ---

// Variables de paginación para usuarios
let currentUserPage = 1;

// Variables de paginación para servicios del admin
let currentAdminServicesPage = 1;
let currentAdminServicesData = [];
let currentAdminServicesStatusFilter = 'todos'; // Filtro de estado para servicios admin

// Variables de paginación para servicios asignados
let currentAssignedServicesPage = 1;

// Variables de paginación para servicios del empleado
let currentEmployeeServicesPage = 1;

// Variables de paginación para notificaciones
let currentAdminNotificationsPage = 1;
let currentEmployeeNotificationsPage = 1;

// Variables de paginación para respuestas de reportes del empleado
let currentEmployeeReportRepliesPage = 1;

// Variables de paginación para reportes
let currentReportsPage = 1;

// Variables de paginación para costo servicios
let currentCostoServiciosPage = 1;
const ITEMS_PER_PAGE_COSTO_SERVICIOS = 15;

// Variable para almacenar usuarios filtrados
let filteredUsers = [];

function renderUserList(page = 1, usersToRender = null) {
    currentUserPage = page;
    const userListElement = document.getElementById('user-list');
    const userCardsElement = document.getElementById('user-list-cards');
    const userTable = userListElement.closest('table');
    
    // Usar usuarios filtrados o todos los usuarios
    const usersToDisplay = usersToRender || filteredUsers.length > 0 ? filteredUsers : users;
    
    userListElement.innerHTML = '';
    userCardsElement.innerHTML = '';
    
    const totalPages = getTotalPages(usersToDisplay.length);
    const paginatedUsers = paginateArray(usersToDisplay, page);
    
    if (paginatedUsers.length === 0) {
        // Mensaje para tabla
        const noResultsRow = document.createElement('tr');
        noResultsRow.innerHTML = `
            <td colspan="6" class="text-center text-muted py-4" style="text-align: center !important; vertical-align: middle;">
                <i class="bi bi-people" style="font-size: 2rem;"></i>
                <br><br>
                <strong>No hay usuarios registrados</strong>
            </td>
        `;
        userListElement.appendChild(noResultsRow);
        
        // Mensaje para tarjetas móviles
        const noResultsCard = document.createElement('div');
        noResultsCard.className = 'text-center text-muted py-4';
        noResultsCard.innerHTML = `
            <i class="bi bi-people" style="font-size: 2rem;"></i>
            <br><br>
            <strong>No hay usuarios registrados</strong>
        `;
        userCardsElement.appendChild(noResultsCard);
    } else {
        paginatedUsers.forEach((user, index) => {
            // Formatear fecha de creación en formato colombiano (dd/mm/yyyy, hh:mm:ss a.m./p.m.)
            let createdAt = 'N/A';
            if (user.createdAt) {
                const date = new Date(user.createdAt);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                const hours = date.getHours();
                const minutes = String(date.getMinutes()).padStart(2, '0');
                const seconds = String(date.getSeconds()).padStart(2, '0');
                const ampm = hours >= 12 ? 'p. m.' : 'a. m.';
                const hours12 = hours % 12 || 12;
                createdAt = `${day}/${month}/${year}, ${String(hours12).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
            }
            
            const rowNumber = (page - 1) * ITEMS_PER_PAGE + index + 1;
            const roleText = user.role === 'admin' ? 'Administrador' : 'Técnico';
            
            // Generar fila de tabla (vista desktop)
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${rowNumber}</td>
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${roleText}</td>
                <td>${createdAt}</td>
                <td>
                    <button class="btn btn-warning btn-sm me-1" onclick="editUser('${user.id}')" title="Editar">
                        <i class="bi bi-pencil-fill"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteUser('${user.id}')" title="Eliminar">
                        <i class="bi bi-trash-fill"></i>
                    </button>
                </td>
            `;
            userListElement.appendChild(row);
            
            // Generar tarjeta móvil (vista móvil)
            const userCard = document.createElement('div');
            userCard.className = 'user-card';
            
            const roleClass = user.role === 'admin' ? 'admin' : 'technician';
            
            userCard.innerHTML = `
                <div class="user-card-header">
                    <span class="user-card-username">${user.username}</span>
                    <span class="user-card-role ${roleClass}">${roleText}</span>
                </div>
                <div class="user-card-info">
                    <div><strong>ID:</strong> ${user.id}</div>
                    <div><strong>Fecha de creación:</strong> ${createdAt}</div>
                </div>
                <div class="user-card-actions">
                    <button class="btn btn-warning btn-sm me-1" onclick="editUser('${user.id}')" title="Editar">
                        <i class="bi bi-pencil-fill"></i> Editar
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteUser('${user.id}')" title="Eliminar">
                        <i class="bi bi-trash-fill"></i> Eliminar
                    </button>
                </div>
            `;
            userCardsElement.appendChild(userCard);
        });
    }
    
    // Generar controles de paginación
    const paginationContainer = userTable.closest('.card-body');
    const existingPagination = paginationContainer.querySelector('.pagination-container');
    if (existingPagination) {
        existingPagination.remove();
    }
    
    const paginationDiv = document.createElement('div');
    paginationDiv.id = 'user-pagination';
    paginationDiv.className = 'pagination-container';
    paginationContainer.appendChild(paginationDiv);
    
    generatePaginationControls(page, totalPages, 'user-pagination', (p) => renderUserList(p, usersToRender));
}

// Función para filtrar usuarios
function filterUsers() {
    const searchTerm = document.getElementById('search-users').value.toLowerCase().trim();
    
    if (!searchTerm) {
        filteredUsers = [];
        renderUserList(1);
        return;
    }
    
    filteredUsers = users.filter(user => {
        const id = (user.id || '').toLowerCase();
        const username = (user.username || '').toLowerCase();
        const role = user.role === 'admin' ? 'administrador' : 'técnico';
        const createdAt = user.createdAt ? new Date(user.createdAt).toLocaleString('es-CO').toLowerCase() : '';
        
        return id.includes(searchTerm) || 
               username.includes(searchTerm) || 
               role.includes(searchTerm) ||
               createdAt.includes(searchTerm);
    });
    
    renderUserList(1, filteredUsers);
}

// Función para limpiar búsqueda
function clearUserSearch() {
    document.getElementById('search-users').value = '';
    filteredUsers = [];
    renderUserList(1);
}

// Función para validar contraseña
function validatePassword(password) {
    const errors = [];
    
    if (password.length < 8) {
        errors.push('La contraseña debe tener mínimo 8 caracteres');
    }
    
    if (!/[A-Z]/.test(password)) {
        errors.push('La contraseña debe contener al menos 1 mayúscula');
    }
    
    if (!/[a-z]/.test(password)) {
        errors.push('La contraseña debe contener al menos 1 minúscula');
    }
    
    if (!/[0-9]/.test(password)) {
        errors.push('La contraseña debe contener al menos 1 número');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// Validación en tiempo real del campo de contraseña
function setupPasswordValidation() {
    const passwordInput = document.getElementById('user-password');
    const passwordError = document.getElementById('password-error');
    
    if (passwordInput && passwordError) {
        // Remover listeners anteriores si existen
        const newPasswordInput = passwordInput.cloneNode(true);
        passwordInput.parentNode.replaceChild(newPasswordInput, passwordInput);
        
        newPasswordInput.addEventListener('input', function() {
            const password = this.value;
            const userId = document.getElementById('edit-user-id').value;
            
            // Si estamos editando y la contraseña está vacía, no validar (permite no cambiar la contraseña)
            if (userId && password === '') {
                passwordError.style.display = 'none';
                passwordError.textContent = '';
                this.setCustomValidity('');
                return;
            }
            
            // Si estamos creando un nuevo usuario o editando con contraseña, validar
            if (password !== '') {
                const validation = validatePassword(password);
                if (!validation.isValid) {
                    passwordError.style.display = 'block';
                    passwordError.textContent = validation.errors.join('. ');
                    this.setCustomValidity(validation.errors.join('. '));
                } else {
                    passwordError.style.display = 'none';
                    passwordError.textContent = '';
                    this.setCustomValidity('');
                }
            }
        });
    }
}

// Configurar validación cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    setupPasswordValidation();
    
    // También configurar cuando se abre el modal
    const createUserModal = document.getElementById('createUserModal');
    if (createUserModal) {
        createUserModal.addEventListener('shown.bs.modal', function() {
            setupPasswordValidation();
        });
    }
});

document.getElementById('user-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const userId = document.getElementById('edit-user-id').value;
    const username = document.getElementById('user-username').value;
    const password = document.getElementById('user-password').value;
    const role = document.getElementById('user-role').value;
    const passwordError = document.getElementById('password-error');

    // Validar contraseña
    // Si es un nuevo usuario, la contraseña es obligatoria
    if (!userId) {
        if (password === '') {
            showAlert('La contraseña es obligatoria para crear un nuevo usuario.');
            return;
        }
        const validation = validatePassword(password);
        if (!validation.isValid) {
            if (passwordError) {
                passwordError.style.display = 'block';
                passwordError.textContent = validation.errors.join('. ');
            }
            showAlert(validation.errors.join('. '));
            return;
        }
    } else {
        // Si se está editando y se ingresó una contraseña, validarla
        if (password !== '') {
            const validation = validatePassword(password);
            if (!validation.isValid) {
                if (passwordError) {
                    passwordError.style.display = 'block';
                    passwordError.textContent = validation.errors.join('. ');
                }
                showAlert(validation.errors.join('. '));
                return;
            }
        }
    }

    if (userId) {
        // Edit existing user
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            const existingUser = users[userIndex];
            // Si no se ingresó contraseña nueva, mantener la anterior
            const newPassword = password !== '' ? password : existingUser.password;
            users[userIndex] = { 
                id: userId, 
                username, 
                password: newPassword, 
                role,
                createdAt: existingUser.createdAt || new Date().toISOString()
            };
        }
    } else {
        // Create new user
        if (users.some(u => u.username === username)) {
            showAlert('El nombre de usuario ya existe.');
            return;
        }
        users.push({ 
            id: generateUserId(), 
            username, 
            password, 
            role,
            createdAt: new Date().toISOString()
        });
    }
    
    if (passwordError) {
        passwordError.style.display = 'none';
        passwordError.textContent = '';
    }
    
    saveUsers();
    renderUserList(1);
    populateTechnicianDropdowns();
    populateAssignTechnicianDropdown();
    const modal = bootstrap.Modal.getInstance(document.getElementById('createUserModal'));
    modal.hide();
    
    // Limpiar completamente el formulario
    document.getElementById('user-form').reset();
    document.getElementById('edit-user-id').value = '';
    document.getElementById('user-username').value = '';
    document.getElementById('user-password').value = '';
    document.getElementById('user-role').value = 'employee';
    // Restablecer placeholder y required para crear nuevo usuario
    const passwordInput = document.getElementById('user-password');
    passwordInput.placeholder = 'Ingrese la contraseña';
    passwordInput.setAttribute('required', 'required');
    // Usar la variable passwordError ya declarada arriba
    if (passwordError) {
        passwordError.style.display = 'none';
        passwordError.textContent = '';
    }
});

function editUser(id) {
    const user = users.find(u => u.id === id);
    if (user) {
        document.getElementById('edit-user-id').value = user.id;
        document.getElementById('user-username').value = user.username;
        const passwordInput = document.getElementById('user-password');
        passwordInput.value = ''; // Limpiar contraseña al editar
        passwordInput.placeholder = 'Dejar vacío para mantener la contraseña actual';
        passwordInput.removeAttribute('required');
        document.getElementById('user-role').value = user.role;
        const passwordError = document.getElementById('password-error');
        if (passwordError) {
            passwordError.style.display = 'none';
            passwordError.textContent = '';
        }
        const modal = new bootstrap.Modal(document.getElementById('createUserModal'));
        modal.show();
        document.getElementById('createUserModalLabel').textContent = 'Editar Usuario';
        // Configurar validación después de abrir el modal
        setTimeout(setupPasswordValidation, 100);
    }
}

function deleteUser(id) {
    showConfirm('¿Estás seguro de que quieres eliminar este usuario?', (result) => {
        if (result) {
            users = users.filter(u => u.id !== id);
            saveUsers();
            renderUserList(1);
            populateTechnicianDropdowns();
            populateAssignTechnicianDropdown();
            // Desasignar servicios si el técnico eliminado tenía alguno asignado
            services.forEach(service => {
                if (service.technicianId === id) {
                    service.technicianId = null;
                    service.status = 'Pendiente'; // Reset status
                }
            });
            saveServices();
            renderAdminServicesList(services, 1);
            renderAssignedServicesList(1);
            renderEmployeeAssignedServices(1); // Refresh for other employees
        }
    });
}

// Funciones para eliminar usuarios masivamente
function openDeleteUsersModal() {
    const modal = new bootstrap.Modal(document.getElementById('deleteUsersModal'));
    const deleteUsersList = document.getElementById('delete-users-list');
    const searchInput = document.getElementById('search-delete-users');
    if (searchInput) searchInput.value = '';
    deleteUsersList.innerHTML = '';
    
    // Mostrar todos los usuarios con checkboxes
    users.forEach(user => {
        const roleText = user.role === 'admin' ? 'Administrador' : 'Técnico';
        const userCard = document.createElement('div');
        userCard.className = 'card mb-2';
        userCard.style.border = '1px solid #dee2e6';
        userCard.innerHTML = `
            <div class="card-body d-flex align-items-center">
                <input type="checkbox" class="form-check-input me-3" value="${user.id}" id="user-checkbox-${user.id}" style="width: 20px; height: 20px;">
                <div class="flex-grow-1">
                    <strong>${user.username}</strong>
                    <div class="text-muted">Rol: ${roleText}</div>
                </div>
            </div>
        `;
        deleteUsersList.appendChild(userCard);
    });
    
    modal.show();
}

function selectAllUsers() {
    const checkboxes = document.querySelectorAll('#delete-users-list input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
    });
}

function deselectAllUsers() {
    const checkboxes = document.querySelectorAll('#delete-users-list input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
}

function confirmDeleteUsers() {
    const checkboxes = document.querySelectorAll('#delete-users-list input[type="checkbox"]:checked');
    const selectedIds = Array.from(checkboxes).map(cb => cb.value);
    
    if (selectedIds.length === 0) {
        showAlert('Por favor, selecciona al menos un usuario para eliminar.');
        return;
    }
    
    showConfirm(`¿Estás seguro de que quieres eliminar ${selectedIds.length} usuario(s)? Esta acción no se puede deshacer.`, (result) => {
        if (result) {
            // Cerrar modal de selección
            const modal = bootstrap.Modal.getInstance(document.getElementById('deleteUsersModal'));
            modal.hide();
            
            // Inicializar modal de progreso
            initProgressModal('delete', selectedIds.length);
            
            let processed = 0;
            let successes = 0;
            let errors = 0;
            
            // Función para eliminar cada usuario de forma asíncrona
            function deleteUser(index) {
                if (index >= selectedIds.length) {
                    // Eliminación completada
                    saveUsers();
                    saveServices();
                    
                    // Actualizar listas
                    renderUserList(1);
                    populateTechnicianDropdowns();
                    populateAssignTechnicianDropdown();
                    renderAdminServicesList(services, 1);
                    renderAssignedServicesList(1);
                    renderEmployeeAssignedServices(1);
                    
                    // Limpiar búsqueda si estaba activa
                    filteredUsers = [];
                    document.getElementById('search-users').value = '';
                    
                    completeProgress('delete', successes, 
                        `Eliminación completada. ${successes} registro(s) eliminado(s).`, 
                        successes, 0, errors);
                    return;
                }
                
                const userId = selectedIds[index];
                
                // Desasignar servicios si el técnico eliminado tenía alguno asignado
                services.forEach(service => {
                    if (service.technicianId === userId) {
                        service.technicianId = null;
                        service.status = 'Pendiente';
                    }
                });
                
                const initialLength = users.length;
                users = users.filter(u => u.id !== userId);
                
                if (users.length < initialLength) {
                    successes++;
                } else {
                    errors++;
                }
                
                processed++;
                updateProgress(processed, selectedIds.length, 
                    `Eliminando registro ${processed} de ${selectedIds.length}...`, 
                    successes, 0, errors);
                
                // Procesar siguiente usuario con pequeño delay
                setTimeout(() => deleteUser(index + 1), 10);
            }
            
            // Iniciar eliminación
            deleteUser(0);
        }
    });
}

// --- Client Management (Admin) ---

// Variables de paginación para clientes
let currentClientPage = 1;
let filteredClients = [];
const ITEMS_PER_PAGE_CLIENTS = 15;

// Función para generar consecutivo automático (4 primeras letras del nombre)
function generateClientConsecutive(name) {
    if (!name || name.trim() === '') return '';
    const cleanName = name.trim().toUpperCase().replace(/[^A-Z]/g, '');
    return cleanName.substring(0, 4);
}

// Función para actualizar consecutivo cuando cambia el nombre
function updateClientConsecutive() {
    const nameInput = document.getElementById('client-name');
    const consecutiveInput = document.getElementById('client-consecutive');
    if (nameInput && consecutiveInput) {
        const consecutive = generateClientConsecutive(nameInput.value);
        consecutiveInput.value = consecutive;
    }
}

// Función para renderizar lista de clientes
function renderClientList(page = 1, clientsToRender = null) {
    currentClientPage = page;
    const clientListElement = document.getElementById('client-list');
    if (!clientListElement) return;
    
    const clientTable = clientListElement.closest('table');
    const clientCardsElement = document.getElementById('client-list-cards');
    
    const clientsToDisplay = clientsToRender || (filteredClients.length > 0 ? filteredClients : clients);
    
    clientListElement.innerHTML = '';
    if (clientCardsElement) clientCardsElement.innerHTML = '';
    
    const totalPages = getTotalPages(clientsToDisplay.length, ITEMS_PER_PAGE_CLIENTS);
    const paginatedClients = paginateArray(clientsToDisplay, page, ITEMS_PER_PAGE_CLIENTS);
    
    if (paginatedClients.length === 0) {
        const noResultsRow = document.createElement('tr');
        noResultsRow.innerHTML = `
            <td colspan="9" class="text-center text-muted py-4" style="text-align: center !important; vertical-align: middle;">
                <i class="bi bi-people" style="font-size: 2rem;"></i>
                <br><br>
                <strong>No hay clientes registrados</strong>
            </td>
        `;
        clientListElement.appendChild(noResultsRow);
        
        if (clientCardsElement) {
            const noResultsCard = document.createElement('div');
            noResultsCard.className = 'text-center text-muted py-4';
            noResultsCard.innerHTML = `
                <i class="bi bi-people" style="font-size: 2rem;"></i>
                <br><br>
                <strong>No hay clientes registrados</strong>
            `;
            clientCardsElement.appendChild(noResultsCard);
        }
    } else {
        paginatedClients.forEach((client, index) => {
            let createdAt = 'N/A';
            if (client.createdAt) {
                const date = new Date(client.createdAt);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                const hours = date.getHours();
                const minutes = String(date.getMinutes()).padStart(2, '0');
                const seconds = String(date.getSeconds()).padStart(2, '0');
                const ampm = hours >= 12 ? 'p. m.' : 'a. m.';
                const hours12 = hours % 12 || 12;
                createdAt = `${day}/${month}/${year}, ${String(hours12).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
            }
            
            const rowNumber = (page - 1) * ITEMS_PER_PAGE_CLIENTS + index + 1;
            
            // Generar fila de tabla (vista desktop)
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${rowNumber}</td>
                <td>${client.name || ''}</td>
                <td>${client.nit || ''}</td>
                <td>${client.address || ''}</td>
                <td>${client.phone || ''}</td>
                <td>${client.email || ''}</td>
                <td>${client.consecutive || ''}</td>
                <td>${createdAt}</td>
                <td>
                    <button class="btn btn-warning btn-sm me-1" onclick="editClient('${client.id}')" title="Editar">
                        <i class="bi bi-pencil-fill"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteClient('${client.id}')" title="Eliminar">
                        <i class="bi bi-trash-fill"></i>
                    </button>
                </td>
            `;
            clientListElement.appendChild(row);
            
            // Generar tarjeta móvil (vista móvil)
            if (clientCardsElement) {
                const clientCard = document.createElement('div');
                clientCard.className = 'user-card client-card';
                clientCard.innerHTML = `
                    <div class="user-card-header">
                        <span class="user-card-username">${client.name || ''}</span>
                    </div>
                    <div class="user-card-info">
                        <div class="client-id-field"><strong>ID:</strong> ${client.id || ''}</div>
                        <div><strong>NIT/CC:</strong> ${client.nit || ''}</div>
                        <div><strong>Dirección:</strong> ${client.address || ''}</div>
                        <div><strong>Teléfono:</strong> ${client.phone || ''}</div>
                        <div><strong>Email:</strong> ${client.email || ''}</div>
                        <div><strong>Consecutivo:</strong> ${client.consecutive || ''}</div>
                        <div><strong>Fecha de creación:</strong> ${createdAt}</div>
                    </div>
                    <div class="user-card-actions">
                        <button class="btn btn-warning btn-sm me-1" onclick="editClient('${client.id}')" title="Editar">
                            <i class="bi bi-pencil-fill"></i> Editar
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteClient('${client.id}')" title="Eliminar">
                            <i class="bi bi-trash-fill"></i> Eliminar
                        </button>
                    </div>
                `;
                clientCardsElement.appendChild(clientCard);
            }
        });
    }
    
    // Generar controles de paginación
    const paginationContainer = clientTable.closest('.card-body');
    const existingPagination = paginationContainer.querySelector('.pagination-container');
    if (existingPagination) {
        existingPagination.remove();
    }
    
    const paginationDiv = document.createElement('div');
    paginationDiv.id = 'client-pagination';
    paginationDiv.className = 'pagination-container';
    paginationContainer.appendChild(paginationDiv);
    
    generatePaginationControls(page, totalPages, 'client-pagination', (p) => renderClientList(p, clientsToRender));
}

// Función para filtrar clientes
function filterClients() {
    const searchTerm = document.getElementById('search-clients').value.toLowerCase().trim();
    
    if (!searchTerm) {
        filteredClients = [];
        renderClientList(1);
        return;
    }
    
    filteredClients = clients.filter(client => {
        const name = (client.name || '').toLowerCase();
        const nit = (client.nit || '').toLowerCase();
        const address = (client.address || '').toLowerCase();
        const phone = (client.phone || '').toLowerCase();
        const email = (client.email || '').toLowerCase();
        const consecutive = (client.consecutive || '').toLowerCase();
        let createdAt = '';
        if (client.createdAt) {
            const date = new Date(client.createdAt);
            createdAt = date.toLocaleString('es-CO').toLowerCase();
        }
        
        return name.includes(searchTerm) || 
               nit.includes(searchTerm) || 
               address.includes(searchTerm) ||
               phone.includes(searchTerm) ||
               email.includes(searchTerm) ||
               consecutive.includes(searchTerm) ||
               createdAt.includes(searchTerm);
    });
    
    renderClientList(1, filteredClients);
}

// Función para limpiar búsqueda
function clearClientSearch() {
    document.getElementById('search-clients').value = '';
    filteredClients = [];
    renderClientList(1);
}

// Event listener para el formulario de clientes
if (document.getElementById('client-form')) {
    document.getElementById('client-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const clientId = document.getElementById('edit-client-id').value;
        const name = document.getElementById('client-name').value.trim();
        const nit = document.getElementById('client-nit').value.trim();
        const address = document.getElementById('client-address').value.trim();
        const phone = document.getElementById('client-phone').value.trim();
        const email = document.getElementById('client-email').value.trim();
        const consecutive = document.getElementById('client-consecutive').value.trim();
        
        if (clientId) {
            // Edit existing client
            const clientIndex = clients.findIndex(c => c.id === clientId);
            if (clientIndex !== -1) {
                const existingClient = clients[clientIndex];
                clients[clientIndex] = {
                    id: clientId,
                    name,
                    nit,
                    address,
                    phone,
                    email,
                    consecutive: consecutive || generateClientConsecutive(name),
                    createdAt: existingClient.createdAt || new Date().toISOString()
                };
            }
        } else {
            // Create new client
            clients.push({
                id: generateId(),
                name,
                nit,
                address,
                phone,
                email,
                consecutive: consecutive || generateClientConsecutive(name),
                createdAt: new Date().toISOString()
            });
        }
        
        saveClients();
        renderClientList(1);
        const modal = bootstrap.Modal.getInstance(document.getElementById('createClientModal'));
        modal.hide();
        
        // Limpiar completamente el formulario
        document.getElementById('client-form').reset();
        document.getElementById('edit-client-id').value = '';
        document.getElementById('client-name').value = '';
        document.getElementById('client-nit').value = '';
        document.getElementById('client-address').value = '';
        document.getElementById('client-phone').value = '';
        document.getElementById('client-email').value = '';
        document.getElementById('client-consecutive').value = '';
    });
}

function editClient(id) {
    const client = clients.find(c => c.id === id);
    if (client) {
        document.getElementById('edit-client-id').value = client.id;
        document.getElementById('client-name').value = client.name || '';
        document.getElementById('client-nit').value = client.nit || '';
        document.getElementById('client-address').value = client.address || '';
        document.getElementById('client-phone').value = client.phone || '';
        document.getElementById('client-email').value = client.email || '';
        document.getElementById('client-consecutive').value = client.consecutive || '';
        const modal = new bootstrap.Modal(document.getElementById('createClientModal'));
        modal.show();
        document.getElementById('createClientModalLabel').textContent = 'Editar Cliente';
    }
}

function deleteClient(id) {
    showConfirm('¿Estás seguro de que quieres eliminar este cliente?', (result) => {
        if (result) {
            clients = clients.filter(c => c.id !== id);
            saveClients();
            renderClientList(1);
        }
    });
}

// Funciones para eliminar clientes masivamente
function openDeleteClientsModal() {
    const modal = new bootstrap.Modal(document.getElementById('deleteClientsModal'));
    const deleteClientsList = document.getElementById('delete-clients-list');
    const searchInput = document.getElementById('search-delete-clients');
    if (searchInput) searchInput.value = '';
    deleteClientsList.innerHTML = '';
    
    clients.forEach(client => {
        const clientCard = document.createElement('div');
        clientCard.className = 'card mb-2';
        clientCard.style.border = '1px solid #dee2e6';
        clientCard.innerHTML = `
            <div class="card-body d-flex align-items-center">
                <input type="checkbox" class="form-check-input me-3" value="${client.id}" id="client-checkbox-${client.id}" style="width: 20px; height: 20px;">
                <div class="flex-grow-1">
                    <strong>${client.name || ''}</strong>
                    <div class="text-muted">NIT/CC: ${client.nit || ''}</div>
                </div>
            </div>
        `;
        deleteClientsList.appendChild(clientCard);
    });
    
    modal.show();
}

function selectAllClients() {
    const checkboxes = document.querySelectorAll('#delete-clients-list input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
    });
}

function deselectAllClients() {
    const checkboxes = document.querySelectorAll('#delete-clients-list input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
}

function confirmDeleteClients() {
    const checkboxes = document.querySelectorAll('#delete-clients-list input[type="checkbox"]:checked');
    const selectedIds = Array.from(checkboxes).map(cb => cb.value);
    
    if (selectedIds.length === 0) {
        showAlert('Por favor, selecciona al menos un cliente para eliminar.');
        return;
    }
    
    showConfirm(`¿Estás seguro de que quieres eliminar ${selectedIds.length} cliente(s)? Esta acción no se puede deshacer.`, (result) => {
        if (result) {
            // Cerrar modal de selección
            const modal = bootstrap.Modal.getInstance(document.getElementById('deleteClientsModal'));
            modal.hide();
            
            // Inicializar modal de progreso
            initProgressModal('delete', selectedIds.length);
            
            let processed = 0;
            let successes = 0;
            let errors = 0;
            
            // Función para eliminar cada cliente de forma asíncrona
            function deleteClient(index) {
                if (index >= selectedIds.length) {
                    // Eliminación completada
                    saveClients();
                    
                    renderClientList(1);
                    filteredClients = [];
                    document.getElementById('search-clients').value = '';
                    
                    completeProgress('delete', successes, 
                        `Eliminación completada. ${successes} registro(s) eliminado(s).`, 
                        successes, 0, errors);
                    return;
                }
                
                const clientId = selectedIds[index];
                const initialLength = clients.length;
                clients = clients.filter(c => c.id !== clientId);
                
                if (clients.length < initialLength) {
                    successes++;
                } else {
                    errors++;
                }
                
                processed++;
                updateProgress(processed, selectedIds.length, 
                    `Eliminando registro ${processed} de ${selectedIds.length}...`, 
                    successes, 0, errors);
                
                // Procesar siguiente cliente con pequeño delay
                setTimeout(() => deleteClient(index + 1), 10);
            }
            
            // Iniciar eliminación
            deleteClient(0);
        }
    });
}

// Función para exportar clientes a Excel
function exportClientsToExcel() {
    const clientsToExport = filteredClients.length > 0 ? filteredClients : clients;
    
    if (clientsToExport.length === 0) {
        showAlert('No hay clientes para exportar.');
        return;
    }
    
    const data = clientsToExport.map(client => ({
        'Nombre': client.name || '',
        'NIT/CC': client.nit || '',
        'Dirección': client.address || '',
        'Teléfono': client.phone || '',
        'Email': client.email || '',
        'Consecutivo': client.consecutive || '',
        'Fecha de Creación': client.createdAt ? new Date(client.createdAt).toLocaleString('es-CO') : ''
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    
    const filename = `clientes_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
    
    showAlert(`Se exportaron ${clientsToExport.length} cliente(s) exitosamente.`);
}

// Función para importar clientes desde Excel
function importClientsFromExcel() {
    document.getElementById('import-clients-file').click();
}

if (document.getElementById('import-clients-file')) {
    document.getElementById('import-clients-file').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                
                if (jsonData.length === 0) {
                    showAlert('El archivo Excel está vacío.');
                    e.target.value = '';
                    return;
                }
                
                // Inicializar modal de progreso
                initProgressModal('import', jsonData.length);
                
                const errors = [];
                const importedClients = [];
                let processed = 0;
                
                // Función para procesar cada fila de forma asíncrona
                function processRow(index) {
                    if (index >= jsonData.length) {
                        // Procesamiento completado
                        const totalSuccesses = importedClients.length;
                        
                        if (importedClients.length > 0) {
                            clients.push(...importedClients);
                            saveClients();
                            // Limpiar filtros para mostrar todos los clientes incluyendo los nuevos
                            filteredClients = [];
                            renderClientList(1);
                        }
                        
                        let finalMessage = '';
                        if (totalSuccesses > 0 && errors.length > 0) {
                            finalMessage = `Importación completada. ${totalSuccesses} registro(s) importado(s). ${errors.length} error(es) encontrado(s).`;
                        } else if (totalSuccesses > 0) {
                            finalMessage = `Importación completada. ${totalSuccesses} registro(s) importado(s) exitosamente.`;
                        } else {
                            finalMessage = `Importación completada con errores. ${errors.length} error(es) encontrado(s).`;
                        }
                        
                        completeProgress('import', totalSuccesses, finalMessage, totalSuccesses, 0, errors.length);
                        e.target.value = '';
                        return;
                    }
                    
                    const row = jsonData[index];
                    const name = (row['Nombre'] || row['NOMBRE'] || '').toString().trim();
                    const nit = (row['NIT/CC'] || row['NIT'] || row['CC'] || '').toString().trim();
                    
                    // Buscar dirección de manera flexible - buscar cualquier clave que contenga "direccion" o "dirección"
                    let address = '';
                    const addressKey = Object.keys(row).find(key => {
                        const keyLower = key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                        return keyLower.includes('direccion');
                    });
                    if (addressKey) {
                        address = (row[addressKey] || '').toString().trim();
                    } else {
                        // Si no se encuentra, intentar con las variantes comunes
                        address = (row['Dirección'] || row['DIRECCIÓN'] || row['DIRECCION'] || row['Direccion'] || row['dirección'] || row['direccion'] || '').toString().trim();
                    }
                    
                    const phone = (row['Teléfono'] || row['TELEFONO'] || row['Telefono'] || row['telefono'] || '').toString().trim();
                    const email = (row['Email'] || row['EMAIL'] || row['email'] || '').toString().trim();
                    const consecutive = (row['Consecutivo'] || row['CONSECUTIVO'] || row['consecutivo'] || '').toString().trim();
                    
                    if (!name) {
                        errors.push(`Fila ${index + 2}: Falta el campo obligatorio 'Nombre'`);
                    } else {
                        const clientConsecutive = consecutive || generateClientConsecutive(name);
                        
                        importedClients.push({
                            id: generateId(),
                            name,
                            nit,
                            address,
                            phone,
                            email,
                            consecutive: clientConsecutive,
                            createdAt: new Date().toISOString()
                        });
                    }
                    
                    processed++;
                    updateProgress(processed, jsonData.length, 
                        `Procesando registro ${processed} de ${jsonData.length}...`, 
                        importedClients.length, 0, errors.length);
                    
                    // Procesar siguiente fila con pequeño delay para permitir actualización de UI
                    setTimeout(() => processRow(index + 1), 10);
                }
                
                // Iniciar procesamiento
                processRow(0);
                
            } catch (error) {
                closeProgressModal();
                showAlert(`Error al importar el archivo: ${error.message}`);
                e.target.value = '';
            }
        };
        
        reader.readAsArrayBuffer(file);
    });
}

// Renderizar lista de clientes al cargar el dashboard de admin
function initializeClientsModule() {
    if (document.getElementById('client-list')) {
        renderClientList(1);
    }
}

// --- Service Registration and Management (Admin) ---

function populateTechnicianDropdowns() {
    const technicianSelects = document.querySelectorAll('#assign-technician'); // #service-technician eliminado
    technicianSelects.forEach(select => {
        select.innerHTML = '<option value="">Seleccionar técnico...</option>';
        users.filter(user => user.role === 'employee').forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.username;
            select.appendChild(option);
        });
    });
}

// Función para cargar los códigos de servicio en el dropdown
function populateServiceCodes() {
    // El campo ahora es un input de texto, no un select, así que solo limpiamos el campo si está vacío
    const serviceCodeInput = document.getElementById('service-code');
    if (serviceCodeInput && !serviceCodeInput.value) {
        serviceCodeInput.placeholder = 'Escribir para buscar código..';
    }
}

// Función para cargar los detalles del servicio seleccionado
function loadServiceDetails() {
    const serviceCode = document.getElementById('service-code').value;
    const serviceType = document.getElementById('service-type');
    const serviceDescription = document.getElementById('service-description');
    if (serviceCode) {
        const servicio = costoServicios.find(s => s.codigo === serviceCode);
        if (servicio) {
            serviceType.value = servicio.tipo;
            serviceDescription.value = servicio.descripcion;
        } else {
            serviceType.value = '';
            serviceDescription.value = '';
        }
    } else {
        serviceType.value = '';
        serviceDescription.value = '';
    }
}

// Función para corregir servicios existentes que no tienen safeType
function fixExistingServices() {
    let fixedCount = 0;
    
    services.forEach(service => {
        if (service.serviceCode && (!service.safeType || service.safeType === 'No definido')) {
            const servicio = costoServicios.find(s => s.codigo === service.serviceCode);
            if (servicio) {
                service.safeType = servicio.tipo;
                service.description = servicio.descripcion;
                fixedCount++;
            }
        }
    });
    
    if (fixedCount > 0) {
        saveServices();
    } else {
    }
}


function renderAdminServicesList(filteredServices = services, page = 1) {
    currentAdminServicesPage = page;
    currentAdminServicesData = filteredServices;
    
    const servicesListElement = document.getElementById('services-list-admin');
    const servicesCardsElement = document.getElementById('services-list-admin-cards');
    const servicesTable = servicesListElement.closest('table');
    const servicesTableHeader = servicesTable.querySelector('thead');
    
    // Agregar encabezado de numeración si no existe
    if (!servicesTableHeader.querySelector('th:first-child').innerHTML.includes('bi-hash')) {
        addNumberHeader(servicesTableHeader);
    }
    
    servicesListElement.innerHTML = '';
    servicesCardsElement.innerHTML = '';
    
    const totalPages = getTotalPages(filteredServices.length);
    const paginatedServices = paginateArray(filteredServices, page);
    
    if (paginatedServices.length === 0) {
        // Mensaje para tabla (11 columnas: # + 10 columnas originales)
        const noResultsRow = document.createElement('tr');
        noResultsRow.innerHTML = `
            <td colspan="11" class="text-center text-muted py-4" style="text-align: center !important; vertical-align: middle;">
                <i class="bi bi-search" style="font-size: 2rem;"></i>
                <br><br>
                <strong>No se encontraron servicios</strong>
                <br>
                <small>Intenta ajustar los filtros de búsqueda</small>
            </td>
        `;
        servicesListElement.appendChild(noResultsRow);
        
        // Mensaje para tarjetas móviles
        const noResultsCard = document.createElement('div');
        noResultsCard.className = 'text-center text-muted py-4';
        noResultsCard.innerHTML = `
            <i class="bi bi-search" style="font-size: 2rem;"></i>
            <br><br>
            <strong>No se encontraron servicios</strong>
            <br>
            <small>Intenta ajustar los filtros de búsqueda</small>
        `;
        servicesCardsElement.appendChild(noResultsCard);
    } else {
        paginatedServices.forEach(service => {
            const canEdit = !['Finalizado', 'Cancelado'].includes(service.status);
            
            // Botón de estado con color según el estado del servicio
            let statusButtonClass = 'btn-status-service';
            let statusButtonColor = '';
            switch(service.status) {
                case 'Finalizado':
                    statusButtonColor = 'btn-status-finalizado';
                    break;
                case 'En proceso':
                    statusButtonColor = 'btn-status-en-proceso';
                    break;
                case 'Pendiente':
                    statusButtonColor = 'btn-status-pendiente';
                    break;
                case 'Cancelado':
                    statusButtonColor = 'btn-status-cancelado';
                    break;
                default:
                    statusButtonColor = 'btn-status-default';
            }
            const statusButton = `<button class="btn ${statusButtonClass} ${statusButtonColor}" disabled>${service.status || '-'}</button>`;
            
            // Botones de acción con el mismo estilo que la tabla de usuarios - apilados verticalmente
            const viewButton = `<button class="btn btn-info btn-sm service-action-btn" onclick="viewServiceDetails('${service.id}')" title="Ver detalles">
                <i class="bi bi-eye-fill"></i>
            </button>`;
            
            const editButton = canEdit ?
                `<button class="btn btn-warning btn-sm service-action-btn" onclick="editService('${service.id}')" title="Editar">
                    <i class="bi bi-pencil-fill"></i>
                </button>` :
                `<button class="btn btn-warning btn-sm service-action-btn" disabled title="No se puede editar servicio finalizado/cancelado">
                    <i class="bi bi-pencil-fill"></i>
                </button>`;
            
            const deleteButton = canEdit ?
                `<button class="btn btn-danger btn-sm service-action-btn" onclick="deleteService('${service.id}')" title="Eliminar">
                    <i class="bi bi-trash-fill"></i>
                </button>` :
                `<button class="btn btn-danger btn-sm service-action-btn" disabled title="No se puede eliminar servicio finalizado/cancelado">
                    <i class="bi bi-trash-fill"></i>
                </button>`;

            // Generar fila de tabla (vista desktop)
            const row = document.createElement('tr');
            // Obtener fecha y hora
            const serviceDate = formatServiceDate(service.date);
            const serviceTime = formatServiceTime(service.time);
            const clientNit = getClientNitByName(service.clientName);
            
            row.innerHTML = `
                <td>${service.id}</td>
                <td>${serviceDate}</td>
                <td>${serviceTime}</td>
                <td>${service.clientName || '-'}</td>
                <td>${clientNit}</td>
                <td>${service.location || '-'}</td>
                <td>${service.serviceCode || '-'}</td>
                <td>${getTechnicianNameById(service.technicianId) || 'No asignado'}</td>
                <td>${statusButton}</td>
                <td>
                    <div class="service-actions-container">
                        ${viewButton}
                        ${editButton}
                        ${deleteButton}
                    </div>
                </td>
            `;
            servicesListElement.appendChild(row);
            
            // Generar tarjeta móvil (vista móvil)
            const serviceCard = document.createElement('div');
            serviceCard.className = 'service-card';
            
            // Determinar clase de estado para la tarjeta
            let statusClass = '';
            switch(service.status) {
                case 'Pendiente':
                    statusClass = 'status-pendiente';
                    break;
                case 'En proceso':
                    statusClass = 'status-en-proceso';
                    break;
                case 'Finalizado':
                    statusClass = 'status-finalizado';
                    break;
                case 'Cancelado':
                    statusClass = 'status-cancelado';
                    break;
            }
            
            serviceCard.innerHTML = `
                <div class="service-card-header">
                    <span class="service-card-id">#${service.id}</span>
                    <span class="service-card-status ${statusClass}">${service.status}</span>
                </div>
                <div class="service-card-info">
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Fecha:</span>
                        <span class="service-card-info-value">${serviceDate}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Hora:</span>
                        <span class="service-card-info-value">${serviceTime}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Cliente:</span>
                        <span class="service-card-info-value">${service.clientName}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Código Servicio:</span>
                        <span class="service-card-info-value">${service.serviceCode || '-'}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Tipo Servicio:</span>
                        <span class="service-card-info-value">${service.safeType}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Ubicación:</span>
                        <span class="service-card-info-value">${service.location}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Técnico:</span>
                        <span class="service-card-info-value">${getTechnicianNameById(service.technicianId)}</span>
                    </div>
                </div>
                <div class="service-card-actions">
                    <button class="btn btn-info btn-sm me-1" onclick="viewServiceDetails('${service.id}')" title="Ver detalles">
                        <i class="bi bi-eye-fill"></i> Ver
                    </button>
                    ${editButton}
                    ${deleteButton}
                </div>
            `;
            servicesCardsElement.appendChild(serviceCard);
        });
        
        // Agregar numeración a las filas
        addRowNumbers(servicesListElement, (page - 1) * ITEMS_PER_PAGE + 1);
    }
    
    // Generar controles de paginación
    const paginationContainer = servicesTable.closest('.card-body');
    const existingPagination = paginationContainer.querySelector('.pagination-container');
    if (existingPagination) {
        existingPagination.remove();
    }
    
    const paginationDiv = document.createElement('div');
    paginationDiv.id = 'admin-services-pagination';
    paginationDiv.className = 'pagination-container';
    paginationContainer.appendChild(paginationDiv);
    
    generatePaginationControls(page, totalPages, 'admin-services-pagination', (newPage) => {
        renderAdminServicesList(currentAdminServicesData, newPage);
    });
    
    // Actualizar estadísticas cuando se renderiza la lista
    updateServicesStatistics();
}

function filterServices() {
    const searchTerm = document.getElementById('search-services').value.toLowerCase();
    const dateFrom = document.getElementById('filter-date-from').value;
    const dateTo = document.getElementById('filter-date-to').value;

    // Filtrar solo por búsqueda y fechas (sin el filtro de estado) para las estadísticas
    let filteredForStats = services;

    // Filtrar por término de búsqueda
    if (searchTerm) {
        filteredForStats = filteredForStats.filter(service => {
            const serviceId = service.id.toLowerCase();
            const serviceCode = (service.serviceCode || '').toLowerCase();
            const clientName = service.clientName.toLowerCase();
            const safeType = service.safeType.toLowerCase();
            const description = (service.description || '').toLowerCase();
            const technicianName = getTechnicianNameById(service.technicianId).toLowerCase();
            const status = service.status.toLowerCase();
            
            return serviceId.includes(searchTerm) ||
                   serviceCode.includes(searchTerm) ||
                   clientName.includes(searchTerm) ||
                   safeType.includes(searchTerm) ||
                   description.includes(searchTerm) ||
                   technicianName.includes(searchTerm) ||
                   status.includes(searchTerm);
        });
    }

    // Filtrar por fecha desde
    if (dateFrom) {
        filteredForStats = filteredForStats.filter(service => service.date >= dateFrom);
    }

    // Filtrar por fecha hasta
    if (dateTo) {
        filteredForStats = filteredForStats.filter(service => service.date <= dateTo);
    }

    // Ahora aplicar también el filtro de estado para la lista mostrada
    let filtered = filteredForStats;
    if (currentAdminServicesStatusFilter !== 'todos') {
        filtered = filtered.filter(service => service.status === currentAdminServicesStatusFilter);
    }

    renderAdminServicesList(filtered);
    // Pasar los servicios filtrados (solo por fecha/búsqueda, no por estado) para las estadísticas
    updateServicesStatistics(filteredForStats);
}

function filterServicesByStatus(status) {
    currentAdminServicesStatusFilter = status;
    filterServices();
}

function refreshServices() {
    currentAdminServicesStatusFilter = 'todos';
    clearFilters();
    renderAdminServicesList(services, 1);
    updateServicesStatistics();
}

function clearFilters() {
    document.getElementById('search-services').value = '';
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    currentAdminServicesStatusFilter = 'todos';
    filterServices();
}

function updateServicesStatistics(filteredServices = null) {
    // Si se proporcionan servicios filtrados, usar esos; si no, usar el array completo
    const servicesToCount = filteredServices !== null ? filteredServices : services;
    
    const total = servicesToCount.length;
    const completed = servicesToCount.filter(s => s.status === 'Finalizado').length;
    const inProgress = servicesToCount.filter(s => s.status === 'En proceso').length;
    const pending = servicesToCount.filter(s => s.status === 'Pendiente').length;
    const cancelled = servicesToCount.filter(s => s.status === 'Cancelado').length;

    document.getElementById('total-services-count').textContent = total;
    document.getElementById('completed-services-count').textContent = completed;
    document.getElementById('in-progress-services-count').textContent = inProgress;
    document.getElementById('pending-services-count').textContent = pending;
    document.getElementById('cancelled-services-count').textContent = cancelled;
}

// Función para obtener los tipos de servicio seleccionados
function getSelectedServiceTypes() {
    const selectedTypes = [];
    const checkboxes = [
        document.getElementById('service-type-bovedas'),
        document.getElementById('service-type-puertas'),
        document.getElementById('service-type-pasatulas')
    ];
    
    checkboxes.forEach(checkbox => {
        if (checkbox && checkbox.checked) {
            selectedTypes.push(checkbox.value);
        }
    });
    
    return selectedTypes.join(', ');
}

// Función para establecer los tipos de servicio en los checkboxes
function setServiceTypes(typesString) {
    const types = typesString ? typesString.split(', ') : [];
    const checkboxes = {
        'Bovedas y cajas fuertes de seguridad': document.getElementById('service-type-bovedas'),
        'Puertas de seguridad': document.getElementById('service-type-puertas'),
        'Pasatulas o tombolas': document.getElementById('service-type-pasatulas')
    };
    
    // Limpiar todos los checkboxes
    Object.values(checkboxes).forEach(checkbox => {
        if (checkbox) checkbox.checked = false;
    });
    
    // Marcar los checkboxes correspondientes
    types.forEach(type => {
        if (checkboxes[type]) {
            checkboxes[type].checked = true;
        }
    });
}


function saveServiceData(serviceId, date, time, safeType, description, location, clientName, clientPhone, clientNit, clientEmail, status, photoData, quantity = 1, additionalServices = []) {
    let clientSignatureData = '';
    let technicianSignatureData = '';

    const clientSignatureSectionVisible = !document.getElementById('client-signature-section').classList.contains('d-none');
    const technicianSignatureSectionVisible = !document.getElementById('technician-signature-section').classList.contains('d-none');

    if (clientSignatureSectionVisible) {
        if (signaturePadClient && !signaturePadClient.isEmpty()) {
            clientSignatureData = signaturePadClient.toDataURL();
        } else if (status === 'Finalizado' && currentUser.role === 'employee') { // Require signature only if finalising as employee
            showAlert('Por favor, el cliente debe firmar.');
            return;
        }
    }
    if (technicianSignatureSectionVisible) {
        if (signaturePadTechnician && !signaturePadTechnician.isEmpty()) {
            technicianSignatureData = signaturePadTechnician.toDataURL();
        } else if (status === 'Finalizado' && currentUser.role === 'employee') { // Require signature only if finalising as employee
            showAlert('Por favor, el técnico debe firmar.');
            return;
        }
    }


    let currentTechnicianId = null;
    let cancellationReason = null;
    let finalizationOrCancellationTime = null;
    let finalizationOrCancellationLocation = null;
    let startTime = null;
    let startLocation = null;
    let avisoNumber = null;

    if (serviceId) {
        const existingService = services.find(s => s.id === serviceId);
        if (existingService) {
            currentTechnicianId = existingService.technicianId;
            cancellationReason = existingService.cancellationReason || null;
            finalizationOrCancellationTime = existingService.finalizationOrCancellationTime || null;
            finalizationOrCancellationLocation = existingService.finalizationOrCancellationLocation || null;
            startTime = existingService.startTime || null;
            startLocation = existingService.startLocation || null;
            avisoNumber = existingService.avisoNumber || null;


            // Campo de técnico eliminado - ya no se usa
            // if (!document.getElementById('service-technician-field').classList.contains('d-none')) {
            //     currentTechnicianId = document.getElementById('service-technician').value;
            // }
        }
    }

    // Capture cancellation reason if status is 'Cancelado'
    if (status === 'Cancelado' && currentUser.role === 'admin') { // Admin can change to cancelled and must provide reason
        if (cancellationReason === null) {
            showConfirm('Para cancelar el servicio, por favor ingrese el motivo de la cancelación:', (inputReason) => {
                if (inputReason === null || inputReason.trim() === '') {
                    showAlert('El motivo de cancelación es obligatorio.');
                    return;
                }
                cancellationReason = inputReason;
                // Since confirm is async, re-call the main save function with the reason
                saveServiceData(serviceId, date, time, safeType, description, location, clientName, clientPhone, clientNit, clientEmail, status, photoData, quantity, additionalServices);
            });
            return; // Exit to wait for confirm modal input
        }
    } else if (status !== 'Cancelado') {
        cancellationReason = null; // Clear reason if not cancelled
    }


            // Record finalization/cancellation time and location
        if ((status === 'Finalizado' || status === 'Cancelado') && currentUser.role === 'employee') {
            // IMPORTANTE: Capturar TODOS los datos del formulario ANTES de cerrar el modal
            // Esto es crítico para móviles donde el modal puede interferir con la geolocalización
            const serviceCodeValue = document.getElementById('service-code') ? document.getElementById('service-code').value : '';
            
            // Capturar firmas ANTES de cerrar el modal (pueden perderse después)
            let capturedClientSignature = clientSignatureData;
            let capturedTechnicianSignature = technicianSignatureData;
            
            // Si las firmas no se capturaron antes, intentar capturarlas ahora
            if (!capturedClientSignature && signaturePadClient && !signaturePadClient.isEmpty()) {
                capturedClientSignature = signaturePadClient.toDataURL();
            }
            if (!capturedTechnicianSignature && signaturePadTechnician && !signaturePadTechnician.isEmpty()) {
                capturedTechnicianSignature = signaturePadTechnician.toDataURL();
            }
            
            // Guardar los datos capturados en variables que persistan después del cierre del modal
            const capturedData = {
                serviceId: serviceId,
                date: date,
                time: time,
                safeType: safeType,
                description: description,
                location: location,
                clientName: clientName,
                clientPhone: clientPhone,
                clientNit: clientNit,
                clientEmail: clientEmail,
                status: status,
                photoData: photoData,
                quantity: quantity,
                additionalServices: additionalServices,
                clientSignature: capturedClientSignature,
                technicianSignature: capturedTechnicianSignature,
                serviceCode: serviceCodeValue,
                currentTechnicianId: currentTechnicianId,
                cancellationReason: cancellationReason,
                startTime: startTime,
                startLocation: startLocation,
                avisoNumber: avisoNumber
            };
            
            // Usar la instancia global de geolocalización
            if (!window.globalGeolocation) {
                window.globalGeolocation = new EnhancedGeolocation();
            }
            
            // Función auxiliar para obtener ubicación y guardar
            const getLocationAndSave = () => {
                // Verificar que no haya solicitudes de geolocalización pendientes
                if (window.globalGeolocation && window.globalGeolocation.isRequesting) {
                    // Si hay una solicitud pendiente, esperar un momento y reintentar
                    setTimeout(() => {
                        getLocationAndSave();
                    }, 1000);
                    return;
                }
                
                // NO mostrar el alert inmediatamente - esperar a que la geolocalización realmente comience
                // Esto evita conflictos con modales en móviles
                let alertShown = false;
                const showLocationAlert = () => {
                    if (!alertShown) {
                        alertShown = true;
                        showAlert('🌍 Obteniendo ubicación para finalizar servicio...\n\nPor favor espera mientras obtenemos tu ubicación GPS.');
                    }
                };
                
                // Iniciar la geolocalización inmediatamente sin mostrar alert primero
                // El alert se mostrará después de un pequeño delay solo si la solicitud tarda
                const alertTimeout = setTimeout(() => {
                    showLocationAlert();
                }, 500);
                
                // Timeout de seguridad: si después de 35 segundos no hay respuesta, mostrar error
                const safetyTimeout = setTimeout(() => {
                    clearTimeout(alertTimeout);
                    if (alertShown) {
                        const alertModal = bootstrap.Modal.getInstance(document.getElementById('customAlertModal'));
                        if (alertModal) {
                            alertModal.hide();
                        }
                    }
                    setTimeout(() => {
                        showAlert('❌ Tiempo de espera agotado al obtener la ubicación.\n\n🔧 Soluciones:\n• Verifica que el GPS esté activado\n• Permite el acceso a la ubicación en tu navegador\n• Asegúrate de tener conexión a internet\n• Intenta en un área con mejor señal GPS\n• Intenta recargar la página y finalizar nuevamente');
                    }, 300);
                }, 35000); // 35 segundos de timeout de seguridad
                
                window.globalGeolocation.getQuickLocation(
                    (locationData) => {
                        // Limpiar todos los timeouts
                        clearTimeout(alertTimeout);
                        clearTimeout(safetyTimeout);
                        
                        // Cerrar el alert si se mostró
                        if (alertShown) {
                            const alertModal = bootstrap.Modal.getInstance(document.getElementById('customAlertModal'));
                            if (alertModal) {
                                alertModal.hide();
                            }
                        }
                        
                        // Pequeño delay para asegurar que el alert se cerró antes de continuar
                        setTimeout(() => {
                            // Éxito: ubicación obtenida
                            // Usar los datos capturados antes de cerrar el modal
                            finalizationOrCancellationTime = locationData.timestamp;
                            finalizationOrCancellationLocation = {
                                latitude: locationData.latitude,
                                longitude: locationData.longitude,
                                accuracy: locationData.accuracy,
                                timestamp: locationData.timestamp,
                                altitude: locationData.altitude,
                                heading: locationData.heading,
                                speed: locationData.speed,
                                altitudeAccuracy: locationData.altitudeAccuracy,
                                browser: locationData.browser,
                                deviceInfo: locationData.deviceInfo,
                                context: locationData.context
                            };
                            
                            // Guardar las firmas capturadas en las variables globales para que finalizeServiceSave las use
                            clientSignatureData = capturedData.clientSignature;
                            technicianSignatureData = capturedData.technicianSignature;
                            
                            // Proceder a guardar una vez obtenida la ubicación con todos los datos capturados
                            finalizeServiceSave(capturedData.serviceCode);
                        }, alertShown ? 300 : 0);
                    },
                    (error) => {
                        // Limpiar todos los timeouts
                        clearTimeout(alertTimeout);
                        clearTimeout(safetyTimeout);
                        
                        // Cerrar el alert de "obteniendo ubicación" si se mostró
                        if (alertShown) {
                            const alertModal = bootstrap.Modal.getInstance(document.getElementById('customAlertModal'));
                            if (alertModal) {
                                alertModal.hide();
                            }
                        }
                        
                        // Pequeño delay antes de mostrar el error para asegurar que el alert anterior se cerró
                        setTimeout(() => {
                            // Error: mostrar mensaje específico
                            showAlert(`❌ ${error.message}\n\n${error.details || ''}\n\n🔧 Soluciones:\n• Verifica que el GPS esté activado\n• Permite el acceso a la ubicación en tu navegador\n• Asegúrate de tener conexión a internet\n• Intenta en un área con mejor señal GPS`);
                        }, alertShown ? 300 : 0);
                    },
                    'finalizacion_servicio'
                );
            };
            
            // Cerrar el modal de finalización antes de obtener la ubicación (importante para móvil)
            const finalizationModal = bootstrap.Modal.getInstance(document.getElementById('registerServiceModal'));
            if (finalizationModal) {
                finalizationModal.hide();
                // Esperar a que el modal se cierre completamente antes de continuar (especialmente importante en móvil)
                const modalElement = document.getElementById('registerServiceModal');
                if (modalElement) {
                    modalElement.addEventListener('hidden.bs.modal', function onModalHidden() {
                        modalElement.removeEventListener('hidden.bs.modal', onModalHidden);
                        // Esperar un delay más largo en móviles para asegurar que el modal se cerró completamente
                        // y que no hay animaciones o transiciones pendientes
                        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                        const delay = isMobile ? 1000 : 500; // 1 segundo en móviles, 500ms en escritorio
                        setTimeout(() => {
                            getLocationAndSave();
                        }, delay);
                    }, { once: true });
                } else {
                    // Si no hay elemento modal, proceder directamente después de un delay
                    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                    const delay = isMobile ? 1000 : 500;
                    setTimeout(() => {
                        getLocationAndSave();
                    }, delay);
                }
            } else {
                // Si no hay modal que cerrar, proceder directamente después de un pequeño delay
                setTimeout(() => {
                    getLocationAndSave();
                }, 300);
            }
        } else {
            // Capturar serviceCode antes de guardar (por si acaso)
            const serviceCodeValue = document.getElementById('service-code') ? document.getElementById('service-code').value : '';
            finalizeServiceSave(serviceCodeValue); // Save directly if not finalization/cancellation by employee
        }

    function finalizeServiceSave(serviceCodeValue = null) {
        // Validar y corregir IDs antes de crear nuevo servicio
        validateAndCorrectIds();
        
        // Obtener el serviceId del campo oculto (puede estar en el DOM aunque el modal esté cerrado)
        const serviceIdElement = document.getElementById('edit-service-id');
        const serviceId = serviceIdElement ? serviceIdElement.value : '';
        
        // Obtener el consecutivo del cliente para generar el ID
        const clientConsecutive = getClientConsecutiveByName(clientName);
        const generatedId = generateServiceId(clientConsecutive);
        const finalId = serviceId && serviceId.trim() !== '' ? serviceId : generatedId;
        
        // Usar el serviceCode capturado antes de cerrar el modal, o intentar obtenerlo del DOM
        const serviceCode = serviceCodeValue || (document.getElementById('service-code') ? document.getElementById('service-code').value : '');
        
        // Obtener el número de aviso del campo de entrada o preservar el existente
        const avisoNumberInput = document.getElementById('service-aviso-number');
        const avisoNumberValue = avisoNumberInput ? (avisoNumberInput.value.trim() || null) : avisoNumber;
        
        const newService = {
            id: finalId,
            date,
            time: String(time || '').trim(),
            serviceCode: serviceCode,
            safeType,
            description,
            location,
            technicianId: currentTechnicianId, // Preservar el técnico asignado
            photo: photoData,
            clientName,
            clientPhone,
            clientNit: clientNit || '',
            clientEmail: clientEmail || '',
            clientSignature: clientSignatureData,
            technicianSignature: technicianSignatureData,
            status,
            cancellationReason: cancellationReason,
            startTime: startTime,
            startLocation: startLocation,
            finalizationOrCancellationTime: finalizationOrCancellationTime,
            finalizationOrCancellationLocation: finalizationOrCancellationLocation,
            quantity: quantity || 1,
            additionalServices: additionalServices || [],
            avisoNumber: avisoNumberValue
        };
        // Guardar el estado anterior antes de actualizar (para notificaciones)
        let oldStatus = null;
        if (serviceId) {
            const serviceIndex = services.findIndex(s => s.id === serviceId);
            if (serviceIndex !== -1) {
                oldStatus = services[serviceIndex].status; // Guardar estado anterior
                if (['Finalizado', 'Cancelado'].includes(services[serviceIndex].status) && currentUser.role === 'admin' && serviceId) {
                    if (['Finalizado', 'Cancelado'].includes(services[serviceIndex].status) && currentUser.role === 'admin' && services[serviceIndex].status === newService.status && services[serviceIndex].technicianId === newService.technicianId) {
                        showAlert('No se puede editar un servicio finalizado o cancelado.');
                        return;
                    }
                }
                services[serviceIndex] = newService;
            }
        } else {
            services.push(newService);
        }
        saveServices();
        renderAdminServicesList(services, 1);
        populateAssignServiceDropdown();
        
        // Cerrar el modal después de guardar exitosamente
        const modal = bootstrap.Modal.getInstance(document.getElementById('registerServiceModal'));
        if (modal) {
            modal.hide();
        }
        
        // Limpiar completamente el formulario (verificar que los elementos existan para evitar errores en móvil)
        const serviceForm = document.getElementById('service-form');
        if (serviceForm) {
            serviceForm.reset();
        }
        
        const editServiceId = document.getElementById('edit-service-id');
        if (editServiceId) editServiceId.value = '';
        
        const serviceDate = document.getElementById('service-date');
        if (serviceDate) serviceDate.value = '';
        
        const serviceTime = document.getElementById('service-time');
        if (serviceTime) serviceTime.value = '';
        
        const serviceCodeElement = document.getElementById('service-code');
        if (serviceCodeElement) serviceCodeElement.value = '';
        
        const serviceType = document.getElementById('service-type');
        if (serviceType) serviceType.value = '';
        
        const serviceDescription = document.getElementById('service-description');
        if (serviceDescription) serviceDescription.value = '';
        
        const serviceQuantity = document.getElementById('service-quantity');
        if (serviceQuantity) serviceQuantity.value = '1';
        
        const serviceClientName = document.getElementById('service-client-name');
        if (serviceClientName) serviceClientName.value = '';
        
        const serviceClientNit = document.getElementById('service-client-nit');
        if (serviceClientNit) serviceClientNit.value = '';
        
        const serviceLocation = document.getElementById('service-location');
        if (serviceLocation) serviceLocation.value = '';
        
        const serviceClientPhone = document.getElementById('service-client-phone');
        if (serviceClientPhone) serviceClientPhone.value = '';
        
        const serviceClientEmail = document.getElementById('service-client-email');
        if (serviceClientEmail) serviceClientEmail.value = '';
        
        const serviceAvisoNumber = document.getElementById('service-aviso-number');
        if (serviceAvisoNumber) serviceAvisoNumber.value = '';
        
        const serviceStatus = document.getElementById('service-status');
        if (serviceStatus) serviceStatus.value = 'Pendiente';
        
        const servicePhoto = document.getElementById('service-photo');
        if (servicePhoto) servicePhoto.value = '';
        
        const servicePhotoPreview = document.getElementById('service-photo-preview');
        if (servicePhotoPreview) {
            servicePhotoPreview.src = '';
            servicePhotoPreview.classList.add('d-none');
        }
        
        // Limpiar servicios adicionales
        const additionalServicesContainer = document.getElementById('additional-services-container');
        if (additionalServicesContainer) {
            additionalServicesContainer.innerHTML = '';
        }
        
        // Limpiar firmas
        try {
            clearSignaturePad('client');
            clearSignaturePad('technician');
        } catch (e) {
            // Ignorar errores si los elementos no están disponibles
        }
        
        // Limpiar sugerencias
        const clientNameSuggestions = document.getElementById('client-name-suggestions');
        if (clientNameSuggestions) {
            clientNameSuggestions.innerHTML = '';
            clientNameSuggestions.style.display = 'none';
        }
        
        const serviceCodeSuggestions = document.getElementById('service-code-suggestions');
        if (serviceCodeSuggestions) {
            serviceCodeSuggestions.innerHTML = '';
            serviceCodeSuggestions.style.display = 'none';
        }
        
        // Ocultar secciones dinámicas
        const photoEvidenceSection = document.getElementById('photo-evidence-section');
        if (photoEvidenceSection) photoEvidenceSection.classList.add('d-none');
        
        const clientSignatureSection = document.getElementById('client-signature-section');
        if (clientSignatureSection) clientSignatureSection.classList.add('d-none');
        
        const technicianSignatureSection = document.getElementById('technician-signature-section');
        if (technicianSignatureSection) technicianSignatureSection.classList.add('d-none');

        if (currentUser.role === 'employee') {
            renderEmployeeAssignedServices(1);
        }
        
        // Enviar notificación al admin cuando el técnico cambia el estado del servicio
        if (currentUser.role === 'employee' && serviceId && oldStatus !== null) {
            if (status !== oldStatus) {
                // Obtener coordenadas y timestamp para la notificación
                let notificationCoordinates = null;
                let notificationTimestamp = null;
                
                if (status === 'Finalizado' || status === 'Cancelado') {
                    if (finalizationOrCancellationLocation) {
                        notificationCoordinates = {
                            latitude: finalizationOrCancellationLocation.latitude,
                            longitude: finalizationOrCancellationLocation.longitude
                        };
                        notificationTimestamp = finalizationOrCancellationTime || new Date().toISOString();
                    }
                } else if (status === 'En proceso' && startLocation) {
                    notificationCoordinates = {
                        latitude: startLocation.latitude,
                        longitude: startLocation.longitude
                    };
                    notificationTimestamp = startTime || new Date().toISOString();
                }
                
                // Formatear timestamp
                if (!window.globalGeolocation) {
                    window.globalGeolocation = new EnhancedGeolocation();
                }
                const timestamp = notificationTimestamp ? new Date(notificationTimestamp).toLocaleString() : new Date().toLocaleString();
                const coordinates = notificationCoordinates ? `${notificationCoordinates.latitude.toFixed(8)}, ${notificationCoordinates.longitude.toFixed(8)}` : '';
                
                // Crear mensaje según el estado
                let message = '';
                if (status === 'Finalizado') {
                    message = `El técnico ${currentUser.username} ha finalizado el servicio ID: ${serviceId} a las ${timestamp} en la ubicación: ${coordinates}.`;
                } else if (status === 'Cancelado') {
                    message = `El técnico ${currentUser.username} ha cancelado el servicio ID: ${serviceId} a las ${timestamp} en la ubicación: ${coordinates}. ${cancellationReason ? `Motivo: ${cancellationReason}` : ''}`;
                } else {
                    message = `El servicio ID: ${serviceId} ha sido cambiado de estado de "${oldStatus}" a "${status}" por el técnico ${currentUser.username}.`;
                }
                
                sendNotification('admin', message, notificationCoordinates);
            }
        }
        
        // Enviar notificación al técnico cuando el admin cancela un servicio
        if (currentUser.role === 'admin' && status === 'Cancelado' && serviceId && newService.technicianId) {
            const technicianId = newService.technicianId;
            const timestamp = new Date().toLocaleString();
            const message = `El servicio ID: ${serviceId} (Cliente: ${clientName}, Tipo: ${safeType || '-'}) ha sido CANCELADO por el administrador. ${cancellationReason ? `Motivo: ${cancellationReason}` : ''}`;
            sendNotification(technicianId, message);
        }
        
        // Mostrar mensaje de éxito apropiado según el estado (solo para técnicos)
        if (currentUser.role === 'employee') {
            if (status === 'Finalizado') {
                if (finalizationOrCancellationLocation) {
                    if (!window.globalGeolocation) {
                        window.globalGeolocation = new EnhancedGeolocation();
                    }
                    const displayInfo = window.globalGeolocation.formatLocationForDisplay(finalizationOrCancellationLocation);
                    showAlert(`✅ Servicio finalizado exitosamente.\n\n📍 Ubicación registrada:\nCoordenadas: ${displayInfo.coordinates}\nPrecisión: ${displayInfo.accuracy}\nDirección: ${displayInfo.direction}\nVelocidad: ${displayInfo.speed}\nAltitud: ${displayInfo.altitude}\nNavegador: ${displayInfo.browser}\n\nEl servicio ha sido marcado como "Finalizado" y se ha registrado la ubicación de finalización.`);
                } else {
                    showAlert(`✅ Servicio finalizado exitosamente.\n\nEl servicio ha sido marcado como "Finalizado".`);
                }
            } else if (status === 'En proceso') {
                if (startLocation) {
                    if (!window.globalGeolocation) {
                        window.globalGeolocation = new EnhancedGeolocation();
                    }
                    const displayInfo = window.globalGeolocation.formatLocationForDisplay(startLocation);
                    showAlert(`✅ Servicio iniciado exitosamente.\n\n📍 Ubicación registrada:\nCoordenadas: ${displayInfo.coordinates}\nPrecisión: ${displayInfo.accuracy}\nDirección: ${displayInfo.direction}\nVelocidad: ${displayInfo.speed}\nAltitud: ${displayInfo.altitude}\nNavegador: ${displayInfo.browser}\n\nEl estado del servicio ha cambiado a "En proceso".`);
                } else {
                    showAlert(`✅ Servicio iniciado exitosamente.\n\nEl estado del servicio ha cambiado a "En proceso".`);
                }
            }
        }
    }
}

function editService(id) {
    // Recargar datos desde localStorage para asegurar que estén actualizados
    services = JSON.parse(localStorage.getItem('services')) || [];
    // Asegurar que services esté cargado
    if (!services || services.length === 0) {
        showAlert('Error: No hay datos de servicios disponibles');
        return;
    }
    
    const service = services.find(s => s.id === id);
    if (service) {
        if (['Finalizado', 'Cancelado'].includes(service.status) && currentUser.role === 'admin') {
            // Allow admin to open, but most fields will be uneditable or should be visually distinct
            // For now, blocking full edit if status is fixed
            // showAlert('No se puede editar un servicio finalizado o cancelado directamente. Puedes ver los detalles.');
            // viewServiceDetails(id); // Show details instead
            // return;
        }
        
        // Abrir el modal primero
        const modal = new bootstrap.Modal(document.getElementById('registerServiceModal'));
        document.getElementById('registerServiceModalLabel').textContent = 'Editar Servicio';
        
        // Cargar datos después de que el modal esté completamente visible
        const modalElement = document.getElementById('registerServiceModal');
        const loadData = () => {
            forceLoadServiceDataInModal(service);
            modalElement.removeEventListener('shown.bs.modal', loadData);
        };
        
        // Si el modal ya está visible, cargar datos inmediatamente
        if (modalElement.classList.contains('show')) {
            forceLoadServiceDataInModal(service);
        } else {
            // Si no está visible, esperar a que se muestre completamente
            modalElement.addEventListener('shown.bs.modal', loadData, { once: true });
        }
        
        modal.show();
    } else {
        showAlert('Error: No se encontró el servicio a editar');
    }
}

function togglePhotoAndSignatureSections(status, forTechnicianView = false) {
    const photoSection = document.getElementById('photo-evidence-section');
    const clientSignatureSection = document.getElementById('client-signature-section');
    const technicianSignatureSection = document.getElementById('technician-signature-section');

    // Always hide by default
    photoSection.classList.add('d-none');
    clientSignatureSection.classList.add('d-none');
    technicianSignatureSection.classList.add('d-none');

    // Clear signatures/photo input when toggling sections for new state/edit
    if (signaturePadClient) signaturePadClient.clear();
    if (signaturePadTechnician) signaturePadTechnician.clear();
    document.getElementById('service-photo').value = '';
    document.getElementById('service-photo-preview').classList.add('d-none');


    if (forTechnicianView) { // Logic for Employee Dashboard
        if (status === 'Finalizado') {
            photoSection.classList.remove('d-none');
            clientSignatureSection.classList.remove('d-none');
            technicianSignatureSection.classList.remove('d-none');
        }
    } else { // Logic for Admin Dashboard
        // Admin can register new service (no fields initially shown), or edit existing.
        // For admin, if they are editing a service that is 'Finalizado' or 'Cancelado',
        // show relevant sections.
        if (status === 'Finalizado' || status === 'Cancelado') {
            photoSection.classList.remove('d-none');
            clientSignatureSection.classList.remove('d-none');
            technicianSignatureSection.classList.remove('d-none');
        }
    }
}


document.getElementById('service-status').addEventListener('change', (event) => {
    togglePhotoAndSignatureSections(event.target.value, currentUser.role === 'employee');
});


function deleteService(id) {
    showConfirm('¿Estás seguro de que quieres eliminar este servicio?', (result) => {
        if (result) {
            const serviceToDelete = services.find(s => s.id === id);

            if (serviceToDelete && ['Finalizado', 'Cancelado'].includes(serviceToDelete.status)) {
                showAlert('No se puede eliminar un servicio finalizado o cancelado.');
                return;
            }

            // Send notification to technician if service was assigned
            if (serviceToDelete && serviceToDelete.technicianId) {
                const technicianName = getTechnicianNameById(serviceToDelete.technicianId);
                const message = `El servicio ID: ${serviceToDelete.id} (Cliente: ${serviceToDelete.clientName}, Tipo: ${serviceToDelete.safeType}) ha sido ELIMINADO por el administrador. Ya no está asignado a ti.`;
                sendNotification(serviceToDelete.technicianId, message);
            }

            services = services.filter(s => s.id !== id);
            saveServices();
            renderAdminServicesList(services, 1);
            populateAssignServiceDropdown();
            renderAssignedServicesList(1);
            renderEmployeeAssignedServices(1);
        }
    });
}

// Funciones para eliminar servicios masivamente
function openDeleteServicesModal() {
    const modal = new bootstrap.Modal(document.getElementById('deleteServicesModal'));
    const deleteServicesList = document.getElementById('delete-services-list');
    const searchInput = document.getElementById('search-delete-services');
    if (searchInput) searchInput.value = '';
    deleteServicesList.innerHTML = '';
    
    // Mostrar todos los servicios con checkboxes
    services.forEach(service => {
        const technicianName = service.technicianId ? getTechnicianNameById(service.technicianId) : 'Sin asignar';
        const serviceCard = document.createElement('div');
        serviceCard.className = 'card mb-2';
        serviceCard.style.border = '1px solid #dee2e6';
        serviceCard.innerHTML = `
            <div class="card-body d-flex align-items-center">
                <input type="checkbox" class="form-check-input me-3" value="${service.id}" id="service-checkbox-${service.id}" style="width: 20px; height: 20px;">
                <div class="flex-grow-1">
                    <strong>ID: ${service.id}</strong>
                    <div class="text-muted">Cliente: ${service.clientName || 'N/A'}</div>
                    <div class="text-muted">Tipo: ${service.safeType || 'N/A'}</div>
                    <div class="text-muted">Estado: ${service.status || 'N/A'}</div>
                    <div class="text-muted">Técnico: ${technicianName}</div>
                </div>
            </div>
        `;
        deleteServicesList.appendChild(serviceCard);
    });
    
    modal.show();
}

function selectAllServices() {
    const checkboxes = document.querySelectorAll('#delete-services-list input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
    });
}

function deselectAllServices() {
    const checkboxes = document.querySelectorAll('#delete-services-list input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
}

function confirmDeleteServices() {
    const checkboxes = document.querySelectorAll('#delete-services-list input[type="checkbox"]:checked');
    const selectedIds = Array.from(checkboxes).map(cb => cb.value);
    
    if (selectedIds.length === 0) {
        showAlert('Por favor, selecciona al menos un servicio para eliminar.');
        return;
    }
    
    // Verificar si hay servicios finalizados o cancelados
    const servicesToDelete = services.filter(s => selectedIds.includes(s.id));
    const finishedServices = servicesToDelete.filter(s => ['Finalizado', 'Cancelado'].includes(s.status));
    
    if (finishedServices.length > 0) {
        showAlert(`No se pueden eliminar ${finishedServices.length} servicio(s) porque están finalizados o cancelados.`);
        return;
    }
    
    showConfirm(`¿Estás seguro de que quieres eliminar ${selectedIds.length} servicio(s)? Esta acción no se puede deshacer.`, (result) => {
        if (result) {
            // Cerrar modal de selección
            const modal = bootstrap.Modal.getInstance(document.getElementById('deleteServicesModal'));
            modal.hide();
            
            // Inicializar modal de progreso
            initProgressModal('delete', selectedIds.length);
            
            let processed = 0;
            let successes = 0;
            let errors = 0;
            
            // Función para eliminar cada servicio de forma asíncrona
            function deleteService(index) {
                if (index >= selectedIds.length) {
                    // Eliminación completada
                    saveServices();
                    
                    renderAdminServicesList(services, 1);
                    populateAssignServiceDropdown();
                    renderAssignedServicesList(1);
                    renderEmployeeAssignedServices(1);
                    
                    completeProgress('delete', successes, 
                        `Eliminación completada. ${successes} registro(s) eliminado(s).`, 
                        successes, 0, errors);
                    return;
                }
                
                const serviceId = selectedIds[index];
                const serviceToDelete = services.find(s => s.id === serviceId);
                
                // Send notification to technician if service was assigned
                if (serviceToDelete && serviceToDelete.technicianId) {
                    const technicianName = getTechnicianNameById(serviceToDelete.technicianId);
                    const message = `El servicio ID: ${serviceToDelete.id} (Cliente: ${serviceToDelete.clientName}, Tipo: ${serviceToDelete.safeType}) ha sido ELIMINADO por el administrador. Ya no está asignado a ti.`;
                    sendNotification(serviceToDelete.technicianId, message);
                }
                
                const initialLength = services.length;
                services = services.filter(s => s.id !== serviceId);
                
                if (services.length < initialLength) {
                    successes++;
                } else {
                    errors++;
                }
                
                processed++;
                updateProgress(processed, selectedIds.length, 
                    `Eliminando registro ${processed} de ${selectedIds.length}...`, 
                    successes, 0, errors);
                
                // Procesar siguiente servicio con pequeño delay
                setTimeout(() => deleteService(index + 1), 10);
            }
            
            // Iniciar eliminación
            deleteService(0);
        }
    });
}

function viewServiceDetails(id) {
    const service = services.find(s => s.id === id);
    if (service) {
        // Formatear fechas
        const serviceDate = formatServiceDate(service.date);
        const serviceTime = formatServiceTime(service.time);
        const clientNit = getClientNitByName(service.clientName);
        const clientEmail = getClientEmailByName(service.clientName);
        const technicianName = getTechnicianNameById(service.technicianId);
        
        // Formatear fecha/hora de inicio
        let startDateTime = '-';
        if (service.startTime) {
            const startDate = new Date(service.startTime);
            const day = String(startDate.getDate()).padStart(2, '0');
            const month = String(startDate.getMonth() + 1).padStart(2, '0');
            const year = startDate.getFullYear();
            const hours = startDate.getHours();
            const minutes = String(startDate.getMinutes()).padStart(2, '0');
            const seconds = String(startDate.getSeconds()).padStart(2, '0');
            const ampm = hours >= 12 ? 'p. m.' : 'a. m.';
            const hours12 = hours % 12 || 12;
            startDateTime = `${day}/${month}/${year}, ${String(hours12).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
        }
        
        // Formatear fecha/hora de finalización
        let finalizationDateTime = '-';
        if (service.finalizationOrCancellationTime) {
            const finalDate = new Date(service.finalizationOrCancellationTime);
            const day = String(finalDate.getDate()).padStart(2, '0');
            const month = String(finalDate.getMonth() + 1).padStart(2, '0');
            const year = finalDate.getFullYear();
            const hours = finalDate.getHours();
            const minutes = String(finalDate.getMinutes()).padStart(2, '0');
            const seconds = String(finalDate.getSeconds()).padStart(2, '0');
            const ampm = hours >= 12 ? 'p. m.' : 'a. m.';
            const hours12 = hours % 12 || 12;
            finalizationDateTime = `${day}/${month}/${year}, ${String(hours12).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
        }
        
        // Determinar clase de estado para el botón
        let statusButtonClass = 'btn-status-service';
        let statusButtonColor = '';
        switch(service.status) {
            case 'Finalizado':
                statusButtonColor = 'btn-status-finalizado';
                break;
            case 'En proceso':
                statusButtonColor = 'btn-status-en-proceso';
                break;
            case 'Pendiente':
                statusButtonColor = 'btn-status-pendiente';
                break;
            case 'Cancelado':
                statusButtonColor = 'btn-status-cancelado';
                break;
        }
        
        const detailsHtml = `
            <div class="row g-3">
                <!-- Columna izquierda: Información del Servicio -->
                <div class="col-md-6">
                    <div class="card mb-3" style="height: 100%;">
                        <div class="card-header d-flex align-items-center justify-content-start" style="background-color: #1e40af; color: white;">
                            <i class="bi bi-info-circle me-2" style="font-size: 1.2rem;"></i>
                            <span class="ms-0">Información del Servicio</span>
                        </div>
                        <div class="card-body" style="padding: 1.25rem;">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <div class="mb-3"><strong>ID Servicio:</strong><br>${service.id}</div>
                                    ${service.serviceCode ? `<div class="mb-3"><strong>Código de Servicio:</strong><br>${service.serviceCode}</div>` : ''}
                                    ${service.avisoNumber ? `<div class="mb-3"><strong># de Aviso:</strong><br>${service.avisoNumber}</div>` : ''}
                                    <div class="mb-3"><strong>Tipo de Servicio:</strong><br>${service.safeType || '-'}</div>
                                    <div class="mb-3"><strong>Cantidad:</strong><br>${service.quantity || 1}</div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3"><strong>Fecha de Servicio:</strong><br>${serviceDate}</div>
                                    <div class="mb-3"><strong>Hora de Servicio:</strong><br>${serviceTime}</div>
                                </div>
                            </div>
                            ${service.description ? `<div class="mb-3"><strong>Descripción:</strong><br>${service.description}</div>` : ''}
                            <div class="mb-0">
                                <strong>Ubicación:</strong><br>${service.location || '-'}
                                ${service.location ? `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(service.location)}" target="_blank" class="btn-google-maps ms-2 mt-2 d-inline-block" title="Abrir en Google Maps"><i class="bi bi-geo-alt"></i> Ver en Maps</a>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Columna derecha: Estado, Cliente y Técnico -->
                <div class="col-md-6 d-flex flex-column">
                    <!-- Tarjeta Estado -->
                    <div class="card mb-3 flex-fill">
                        <div class="card-header d-flex align-items-center justify-content-start" style="background-color: #1e40af; color: white;">
                            <i class="bi bi-flag me-2" style="font-size: 1.2rem;"></i>
                            <span class="ms-0">Estado</span>
                        </div>
                        <div class="card-body text-center d-flex align-items-center justify-content-center" style="flex: 1;">
                            <button class="btn ${statusButtonClass} ${statusButtonColor} btn-sm" disabled style="width: auto; padding: 0.25rem 1rem; font-size: 0.875rem;">${service.status || '-'}</button>
                        </div>
                    </div>
                    
                    <!-- Tarjeta Información del Cliente -->
                    <div class="card mb-3 flex-fill">
                        <div class="card-header d-flex align-items-center justify-content-start" style="background-color: #1e40af; color: white;">
                            <i class="bi bi-person me-2" style="font-size: 1.2rem;"></i>
                            <span class="ms-0">Información del Cliente</span>
                        </div>
                        <div class="card-body d-flex flex-column justify-content-center">
                            <div class="mb-2"><strong>Nombre:</strong> ${service.clientName || '-'}</div>
                            <div class="mb-2"><strong>NIT o CC:</strong> ${clientNit}</div>
                            <div class="mb-2"><strong>Teléfono:</strong> ${service.clientPhone || '-'}</div>
                            <div class="mb-2"><strong>Email:</strong> ${clientEmail}</div>
                        </div>
                    </div>
                    
                    <!-- Tarjeta Información del Técnico -->
                    <div class="card mb-3 flex-fill">
                        <div class="card-header d-flex align-items-center justify-content-start" style="background-color: #1e40af; color: white;">
                            <i class="bi bi-person-gear me-2" style="font-size: 1.2rem;"></i>
                            <span class="ms-0">Información del Técnico</span>
                        </div>
                        <div class="card-body d-flex align-items-center justify-content-center" style="flex: 1;">
                            <div><strong>Técnico Encargado:</strong> ${technicianName}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Servicios Adicionales -->
            <div class="card mb-3 mt-4">
                <div class="card-header d-flex align-items-center justify-content-start" style="background-color: #1e40af; color: white;">
                    <i class="bi bi-plus-circle me-2" style="font-size: 1.2rem;"></i>
                    <span class="ms-0">Servicios Adicionales</span>
                </div>
                <div class="card-body">
                    ${service.additionalServices && Array.isArray(service.additionalServices) && service.additionalServices.length > 0 ? `
                        <div class="table-responsive">
                            <table class="table table-striped table-hover">
                                <thead>
                                    <tr>
                                        <th>Código</th>
                                        <th>Tipo</th>
                                        <th>Descripción</th>
                                        <th>Cantidad</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${service.additionalServices.map(additionalService => `
                                        <tr>
                                            <td>${additionalService.code || '-'}</td>
                                            <td>${additionalService.type || '-'}</td>
                                            <td>${additionalService.description || '-'}</td>
                                            <td>${additionalService.quantity || 1}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : `
                        <p class="text-muted mb-0">No hay servicios adicionales registrados</p>
                    `}
                </div>
            </div>
            
            <!-- Información de Tiempo y Geolocalización -->
            ${service.startTime || service.finalizationOrCancellationTime ? `
            <div class="card mb-3">
                <div class="card-header d-flex align-items-center justify-content-start" style="background-color: #1e40af; color: white;">
                    <i class="bi bi-clock me-2" style="font-size: 1.2rem;"></i>
                    <span class="ms-0">Información de Tiempo y Geolocalización</span>
                </div>
                <div class="card-body">
                    ${service.startTime ? `
                    <div class="mb-3">
                        <strong>Fecha/Hora de Inicio:</strong> ${startDateTime}
                    </div>
                    ${service.startLocation ? `
                    <div class="mb-3">
                        <strong>Ubicación de Inicio:</strong> Lat: ${service.startLocation.latitude.toFixed(8)}, Lon: ${service.startLocation.longitude.toFixed(8)}${service.startLocation.accuracy ? ` (Precisión: ±${Math.round(service.startLocation.accuracy)}m)` : ''}
                        <a href="https://www.google.com/maps?q=${service.startLocation.latitude},${service.startLocation.longitude}" target="_blank" class="btn-google-maps ms-2" title="Abrir coordenadas de inicio en Google Maps">
                            <i class="bi bi-geo-alt"></i> Ver en Maps
                        </a>
                    </div>
                    ` : ''}
                    ` : ''}
                    ${service.finalizationOrCancellationTime ? `
                    <div class="mb-3">
                        <strong>Fecha/Hora de Finalización/Cancelación:</strong> ${finalizationDateTime}
                    </div>
                    ${service.finalizationOrCancellationLocation ? `
                    <div class="mb-3">
                        <strong>Ubicación de Finalización/Cancelación:</strong> Lat: ${service.finalizationOrCancellationLocation.latitude.toFixed(8)}, Lon: ${service.finalizationOrCancellationLocation.longitude.toFixed(8)}${service.finalizationOrCancellationLocation.accuracy ? ` (Precisión: ±${Math.round(service.finalizationOrCancellationLocation.accuracy)}m)` : ''}
                        <a href="https://www.google.com/maps?q=${service.finalizationOrCancellationLocation.latitude},${service.finalizationOrCancellationLocation.longitude}" target="_blank" class="btn-google-maps ms-2" title="Abrir coordenadas de finalización en Google Maps">
                            <i class="bi bi-geo-alt"></i> Ver en Maps
                        </a>
                    </div>
                    ` : ''}
                    ` : ''}
                </div>
            </div>
            ` : ''}
            
            <!-- Evidencias -->
            ${service.photo || service.clientSignature || service.technicianSignature ? `
            <div class="card mb-3">
                <div class="card-header d-flex align-items-center justify-content-start" style="background-color: #1e40af; color: white;">
                    <i class="bi bi-file-earmark-image me-2" style="font-size: 1.2rem;"></i>
                    <span class="ms-0">Evidencias</span>
                </div>
                <div class="card-body">
                    ${service.photo ? `
                    <div class="mb-3">
                        <strong>Evidencia Fotográfica:</strong>
                        <div class="mt-2 text-center">
                            <img src="${service.photo}" class="rounded border" alt="Evidencia Fotográfica" style="max-width: 300px; width: 100%; height: auto;">
                        </div>
                    </div>
                    ` : ''}
                    ${service.clientSignature || service.technicianSignature ? `
                    <div class="row">
                        ${service.clientSignature ? `
                        <div class="col-md-6 mb-3">
                            <strong>Cliente:</strong>
                            <div class="mt-2 border rounded p-2" style="background-color: white;">
                                <img src="${service.clientSignature}" class="img-fluid" alt="Firma del Cliente" style="max-width: 100%; height: auto;">
                            </div>
                        </div>
                        ` : ''}
                        ${service.technicianSignature ? `
                        <div class="col-md-6 mb-3">
                            <strong>Técnico:</strong>
                            <div class="mt-2 border rounded p-2" style="background-color: white;">
                                <img src="${service.technicianSignature}" class="img-fluid" alt="Firma del Técnico" style="max-width: 100%; height: auto;">
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}
            
            ${service.cancellationReason ? `
            <div class="alert alert-warning">
                <strong>Motivo de Cancelación:</strong> ${service.cancellationReason}
            </div>
            ` : ''}
        `;
        document.getElementById('view-service-details').innerHTML = detailsHtml;
        const modal = new bootstrap.Modal(document.getElementById('viewServiceModal'));
        modal.show();
    }
}

// Helper to get technician name
function getTechnicianNameById(id) {
    const tech = users.find(u => u.id === id);
    return tech ? tech.username : 'No Asignado';
}

function getClientNitByName(clientName) {
    if (!clientName) return '-';
    const client = clients.find(c => c.name === clientName);
    return client ? (client.nit || '-') : '-';
}

function getClientEmailByName(clientName) {
    if (!clientName) return '-';
    const client = clients.find(c => c.name === clientName);
    return client ? (client.email || '-') : '-';
}

// Función para cargar los datos del cliente cuando se ingresa el nombre
function loadClientData() {
    const clientNameInput = document.getElementById('service-client-name');
    const clientName = clientNameInput ? clientNameInput.value.trim() : '';
    
    if (!clientName) return;
    
    // Buscar el cliente por nombre
    const client = clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
    
    if (client) {
        // Llenar automáticamente los campos del cliente
        const nitInput = document.getElementById('service-client-nit');
        const locationInput = document.getElementById('service-location');
        const phoneInput = document.getElementById('service-client-phone');
        const emailInput = document.getElementById('service-client-email');
        
        if (nitInput) nitInput.value = client.nit || '';
        if (locationInput) locationInput.value = client.address || '';
        if (phoneInput) phoneInput.value = client.phone || '';
        if (emailInput) emailInput.value = client.email || '';
    }
}

// Función para buscar y sugerir códigos de servicio
// Función para mostrar lista desplegable de códigos de servicio
function showServiceCodeDropdown(inputElement, suggestionsDiv, isAdditional = false) {
    if (!inputElement || !suggestionsDiv || !costoServicios || costoServicios.length === 0) return;
    
    // Si ya está visible, no hacer nada
    if (suggestionsDiv.style.display === 'block') return;
    
    // Mostrar todos los servicios
    suggestionsDiv.innerHTML = '';
    let selectedIndex = -1;
    
    costoServicios.forEach((servicio, index) => {
        const item = document.createElement('a');
        item.href = '#';
        item.className = 'list-group-item list-group-item-action service-code-item';
        item.setAttribute('data-index', index);
        const descripcion = servicio.descripcion || servicio.tipo || 'Sin descripción';
        item.innerHTML = `
            <div class="service-code-option">${servicio.codigo} - ${descripcion}</div>
        `;
        item.onclick = (e) => {
            e.preventDefault();
            selectServiceCode(servicio, inputElement, suggestionsDiv, isAdditional);
        };
        item.onmouseenter = function() {
            // Remover selección anterior
            suggestionsDiv.querySelectorAll('.service-code-item').forEach(el => el.classList.remove('active'));
            this.classList.add('active');
            selectedIndex = index;
        };
        suggestionsDiv.appendChild(item);
    });
    
    // Mostrar solo los primeros 3 visualmente, pero permitir scroll
    suggestionsDiv.style.display = 'block';
    suggestionsDiv.style.maxHeight = '200px'; // Aproximadamente 3 elementos
    suggestionsDiv.style.overflowY = 'auto';
    
    // Guardar referencia para navegación con teclado
    inputElement._serviceCodeDropdown = {
        suggestionsDiv: suggestionsDiv,
        items: suggestionsDiv.querySelectorAll('.service-code-item'),
        selectedIndex: selectedIndex,
        isAdditional: isAdditional
    };
}

// Función para seleccionar un código de servicio
function selectServiceCode(servicio, inputElement, suggestionsDiv, isAdditional) {
    inputElement.value = servicio.codigo;
    suggestionsDiv.style.display = 'none';
    
    if (isAdditional) {
        loadAdditionalServiceDetails(inputElement);
    } else {
        loadServiceDetails();
    }
}

// Función para manejar navegación con teclado
function handleServiceCodeKeyboard(event, inputElement) {
    const dropdown = inputElement._serviceCodeDropdown;
    if (!dropdown || dropdown.suggestionsDiv.style.display !== 'block') return;
    
    const items = Array.from(dropdown.items);
    if (items.length === 0) return;
    
    event.preventDefault();
    
    switch(event.key) {
        case 'ArrowDown':
            dropdown.selectedIndex = (dropdown.selectedIndex + 1) % items.length;
            items[dropdown.selectedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            items.forEach((el, idx) => {
                el.classList.toggle('active', idx === dropdown.selectedIndex);
            });
            break;
        case 'ArrowUp':
            dropdown.selectedIndex = dropdown.selectedIndex <= 0 ? items.length - 1 : dropdown.selectedIndex - 1;
            items[dropdown.selectedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            items.forEach((el, idx) => {
                el.classList.toggle('active', idx === dropdown.selectedIndex);
            });
            break;
        case 'Enter':
            if (dropdown.selectedIndex >= 0 && dropdown.selectedIndex < items.length) {
                const servicio = costoServicios[dropdown.selectedIndex];
                selectServiceCode(servicio, inputElement, dropdown.suggestionsDiv, dropdown.isAdditional);
            }
            break;
        case 'Escape':
            dropdown.suggestionsDiv.style.display = 'none';
            break;
    }
}

function searchServiceCode() {
    const searchInput = document.getElementById('service-code');
    const suggestionsDiv = document.getElementById('service-code-suggestions');
    
    if (!searchInput || !suggestionsDiv) return;
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    // Si hay texto, filtrar; si no, mostrar todos
    let matches = costoServicios;
    if (searchTerm.length > 0) {
        matches = costoServicios.filter(s => 
            s.codigo.toLowerCase().includes(searchTerm) ||
            (s.tipo && s.tipo.toLowerCase().includes(searchTerm)) ||
            (s.descripcion && s.descripcion.toLowerCase().includes(searchTerm))
        );
    }
    
    if (matches.length === 0) {
        suggestionsDiv.style.display = 'none';
        return;
    }
    
    // Mostrar sugerencias filtradas
    suggestionsDiv.innerHTML = '';
    let selectedIndex = -1;
    
    matches.forEach((servicio, index) => {
        const item = document.createElement('a');
        item.href = '#';
        item.className = 'list-group-item list-group-item-action service-code-item';
        item.setAttribute('data-index', index);
        const descripcion = servicio.descripcion || servicio.tipo || 'Sin descripción';
        item.innerHTML = `
            <div class="service-code-option">${servicio.codigo} - ${descripcion}</div>
        `;
        item.onclick = (e) => {
            e.preventDefault();
            selectServiceCode(servicio, searchInput, suggestionsDiv, false);
        };
        item.onmouseenter = function() {
            suggestionsDiv.querySelectorAll('.service-code-item').forEach(el => el.classList.remove('active'));
            this.classList.add('active');
            selectedIndex = index;
        };
        suggestionsDiv.appendChild(item);
    });
    
    suggestionsDiv.style.display = 'block';
    suggestionsDiv.style.maxHeight = '200px';
    suggestionsDiv.style.overflowY = 'auto';
    
    // Actualizar referencia para navegación con teclado
    searchInput._serviceCodeDropdown = {
        suggestionsDiv: suggestionsDiv,
        items: suggestionsDiv.querySelectorAll('.service-code-item'),
        selectedIndex: selectedIndex,
        isAdditional: false,
        matches: matches
    };
}

// Función para buscar y sugerir nombres de clientes
function searchClientName() {
    const searchInput = document.getElementById('service-client-name');
    const suggestionsDiv = document.getElementById('client-name-suggestions');
    
    if (!searchInput || !suggestionsDiv) return;
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (searchTerm.length < 1) {
        suggestionsDiv.style.display = 'none';
        return;
    }
    
    // Filtrar clientes que coincidan
    const matches = clients.filter(c => 
        c.name.toLowerCase().includes(searchTerm)
    );
    
    if (matches.length === 0) {
        suggestionsDiv.style.display = 'none';
        return;
    }
    
    // Mostrar sugerencias
    suggestionsDiv.innerHTML = '';
    matches.slice(0, 10).forEach(client => {
        const item = document.createElement('a');
        item.href = '#';
        item.className = 'list-group-item list-group-item-action';
        item.innerHTML = `<div class="fw-bold">${client.name}</div>`;
        item.onclick = (e) => {
            e.preventDefault();
            searchInput.value = client.name;
            suggestionsDiv.style.display = 'none';
            loadClientData();
        };
        suggestionsDiv.appendChild(item);
    });
    
    suggestionsDiv.style.display = 'block';
}

// Función para agregar servicio adicional
function addAdditionalService() {
    const container = document.getElementById('additional-services-container');
    if (!container) return;
    
    const serviceIndex = container.children.length;
    const additionalServiceDiv = document.createElement('div');
    additionalServiceDiv.className = 'mb-3 p-3 border rounded bg-light';
    additionalServiceDiv.setAttribute('data-service-index', serviceIndex);
    const suggestionsId = `additional-service-suggestions-${serviceIndex}`;
    additionalServiceDiv.innerHTML = `
        <!-- Primera fila: Código, Tipo, Cantidad -->
        <div class="row mb-3">
            <div class="col-md-6 mb-3">
                <div class="service-code-selector">
                    <label class="form-label fw-bold service-code-label">CÓDIGO DE SERVICIO ADICIONAL</label>
                    <input type="text" class="form-control service-code-input additional-service-code" placeholder="Escribir para buscar código..." name="additional-service-code-${serviceIndex}" data-service-index="${serviceIndex}" oninput="searchAdditionalServiceCode(this)" onchange="loadAdditionalServiceDetails(this)" onblur="setTimeout(() => { const div = document.getElementById('${suggestionsId}'); if(div) div.style.display = 'none'; }, 200);">
                    <div class="service-code-suggestions" id="${suggestionsId}" style="display: none;"></div>
                </div>
            </div>
            <div class="col-md-3 mb-3">
                <label class="form-label fw-bold">TIPO DE SERVICIO</label>
                <input type="text" class="form-control additional-service-type" placeholder="" name="additional-service-type-${serviceIndex}" readonly>
            </div>
            <div class="col-md-3 mb-3">
                <label class="form-label fw-bold">CANTIDAD</label>
                <input type="number" class="form-control additional-service-quantity" placeholder="1" name="additional-service-quantity-${serviceIndex}" min="1" value="1">
            </div>
        </div>
        <!-- Segunda fila: Descripción y Botón Eliminar -->
        <div class="row">
            <div class="col-md-10 mb-3">
                <label class="form-label fw-bold">DESCRIPCIÓN</label>
                <input type="text" class="form-control additional-service-description" placeholder="" name="additional-service-description-${serviceIndex}" readonly>
            </div>
            <div class="col-md-2 mb-3 d-flex align-items-end">
                <button type="button" class="btn btn-link text-danger p-0" onclick="this.closest('.bg-light').remove()" style="text-decoration: none;">
                    <i class="bi bi-trash me-1"></i> ELIMINAR
                </button>
            </div>
        </div>
    `;
    container.appendChild(additionalServiceDiv);
    
    // Agregar event listeners para click y teclado
    const additionalCodeInput = additionalServiceDiv.querySelector('.additional-service-code');
    const additionalSuggestionsDiv = document.getElementById(suggestionsId);
    
    if (additionalCodeInput && additionalSuggestionsDiv) {
        // Mostrar lista al hacer click
        additionalCodeInput.addEventListener('click', function() {
            if (costoServicios && costoServicios.length > 0) {
                showServiceCodeDropdown(additionalCodeInput, additionalSuggestionsDiv, true);
            }
        });
        
        // Navegación con teclado
        additionalCodeInput.addEventListener('keydown', function(e) {
            handleServiceCodeKeyboard(e, additionalCodeInput);
        });
    }
}

// Función para buscar y sugerir códigos de servicio adicional
function searchAdditionalServiceCode(inputElement) {
    const serviceIndex = inputElement.getAttribute('data-service-index');
    const suggestionsDiv = document.getElementById(`additional-service-suggestions-${serviceIndex}`);
    
    if (!inputElement || !suggestionsDiv) return;
    
    const searchTerm = inputElement.value.toLowerCase().trim();
    
    // Si hay texto, filtrar; si no, mostrar todos
    let matches = costoServicios;
    if (searchTerm.length > 0) {
        matches = costoServicios.filter(s => 
            s.codigo.toLowerCase().includes(searchTerm) ||
            (s.tipo && s.tipo.toLowerCase().includes(searchTerm)) ||
            (s.descripcion && s.descripcion.toLowerCase().includes(searchTerm))
        );
    }
    
    if (matches.length === 0) {
        suggestionsDiv.style.display = 'none';
        return;
    }
    
    // Mostrar sugerencias filtradas
    suggestionsDiv.innerHTML = '';
    let selectedIndex = -1;
    
    matches.forEach((servicio, index) => {
        const item = document.createElement('a');
        item.href = '#';
        item.className = 'list-group-item list-group-item-action service-code-item';
        item.setAttribute('data-index', index);
        const descripcion = servicio.descripcion || servicio.tipo || 'Sin descripción';
        item.innerHTML = `
            <div class="service-code-option">${servicio.codigo} - ${descripcion}</div>
        `;
        item.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            selectServiceCode(servicio, inputElement, suggestionsDiv, true);
        };
        item.onmouseenter = function() {
            suggestionsDiv.querySelectorAll('.service-code-item').forEach(el => el.classList.remove('active'));
            this.classList.add('active');
            selectedIndex = index;
        };
        suggestionsDiv.appendChild(item);
    });
    
    suggestionsDiv.style.display = 'block';
    suggestionsDiv.style.maxHeight = '200px';
    suggestionsDiv.style.overflowY = 'auto';
    
    // Actualizar referencia para navegación con teclado
    inputElement._serviceCodeDropdown = {
        suggestionsDiv: suggestionsDiv,
        items: suggestionsDiv.querySelectorAll('.service-code-item'),
        selectedIndex: selectedIndex,
        isAdditional: true,
        matches: matches
    };
}

// Función para cargar los detalles del servicio adicional seleccionado
function loadAdditionalServiceDetails(inputElement) {
    if (!inputElement) {
        return;
    }
    
    const serviceCode = inputElement.value ? inputElement.value.trim() : '';
    // Buscar el contenedor principal del servicio adicional (el div con bg-light)
    const serviceDiv = inputElement.closest('.bg-light');
    
    if (!serviceDiv) {
        return;
    }
    
    const typeInput = serviceDiv.querySelector('.additional-service-type');
    const descriptionInput = serviceDiv.querySelector('.additional-service-description');
    const serviceIndex = inputElement.getAttribute('data-service-index');
    const suggestionsDiv = serviceIndex ? document.getElementById(`additional-service-suggestions-${serviceIndex}`) : null;
    
    if (suggestionsDiv) {
        suggestionsDiv.style.display = 'none';
    }
    
    // Buscar el servicio en costoServicios
    if (serviceCode && costoServicios && Array.isArray(costoServicios) && costoServicios.length > 0) {
        // Buscar exacto primero
        let servicio = costoServicios.find(s => s.codigo === serviceCode);
        // Si no se encuentra, buscar case-insensitive
        if (!servicio) {
            servicio = costoServicios.find(s => s.codigo && s.codigo.toLowerCase() === serviceCode.toLowerCase());
        }
        
        if (servicio) {
            if (typeInput) {
                typeInput.value = servicio.tipo || '';
            }
            if (descriptionInput) {
                descriptionInput.value = servicio.descripcion || '';
            }
        } else {
            // Si no se encuentra, limpiar campos para que el usuario pueda escribir manualmente
            if (typeInput) {
                typeInput.value = '';
            }
            if (descriptionInput) {
                descriptionInput.value = '';
            }
        }
    } else {
        // Si no hay código o no hay costoServicios, limpiar campos
        if (typeInput) {
            typeInput.value = '';
        }
        if (descriptionInput) {
            descriptionInput.value = '';
        }
    }
}

function formatServiceDate(dateString) {
    if (!dateString) return '-';
    
    // Si ya está en formato dd/mm/yyyy, devolverlo tal cual
    if (typeof dateString === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
        return dateString;
    }
    
    // Si está en formato ISO (YYYY-MM-DD), convertir directamente sin usar Date para evitar problemas de zona horaria
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    }
    
    // Intentar parsear como fecha
    try {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        }
    } catch (e) {
        // Si hay error, devolver el string original
    }
    
    return dateString || '-';
}

// Función para convertir hora decimal de Excel a formato de hora
function convertExcelTimeToHourFormat(excelTime) {
    if (!excelTime && excelTime !== 0) return '';
    
    // Si es un número (decimal de Excel), convertirlo
    if (typeof excelTime === 'number') {
        // Excel almacena la hora como fracción de día (0.0 = medianoche, 0.5 = mediodía)
        const totalSeconds = Math.round(excelTime * 24 * 60 * 60);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        const ampm = hours >= 12 ? 'p. m.' : 'a. m.';
        const hours12 = hours % 12 || 12;
        return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} ${ampm}`;
    }
    
    // Si ya es un string, convertirlo a formato de 12 horas si es necesario
    if (typeof excelTime === 'string') {
        return convertTo12HourFormat(excelTime);
    }
    
    return '';
}

// Función para convertir cualquier formato de hora a formato de 12 horas (HH:mm:ss a. m./p. m.)
function convertTo12HourFormat(timeString) {
    if (!timeString || (typeof timeString === 'string' && timeString.trim() === '')) {
        return '';
    }
    
    const trimmedTime = String(timeString).trim();
    
    // Si ya está en formato de 12 horas (contiene a. m. o p. m. o AM/PM), devolverlo tal cual
    if (trimmedTime.includes('a. m.') || trimmedTime.includes('p. m.') || 
        trimmedTime.includes('AM') || trimmedTime.includes('PM') || 
        trimmedTime.includes('am') || trimmedTime.includes('pm')) {
        return trimmedTime;
    }
    
    // Si está en formato de hora 24 horas (contiene :), convertir a formato de 12 horas
    if (trimmedTime.includes(':')) {
        // Patrón para HH:mm o HH:mm:ss
        const timeMatch = trimmedTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
        if (timeMatch) {
            let hours = parseInt(timeMatch[1], 10);
            const minutes = parseInt(timeMatch[2], 10);
            const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
            
            // Validar que sea una hora válida
            if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 && seconds >= 0 && seconds <= 59) {
                const ampm = hours >= 12 ? 'p. m.' : 'a. m.';
                const hours12 = hours % 12 || 12;
                return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} ${ampm}`;
            }
        }
        // Si no coincide con el patrón, devolver tal cual
        return trimmedTime;
    }
    
    // Intentar parsear como fecha/hora
    try {
        const date = new Date(timeString);
        if (!isNaN(date.getTime())) {
            const hours = date.getHours();
            const minutes = date.getMinutes();
            const seconds = date.getSeconds();
            
            if (hours >= 0 || minutes > 0 || seconds > 0) {
                const ampm = hours >= 12 ? 'p. m.' : 'a. m.';
                const hours12 = hours % 12 || 12;
                return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} ${ampm}`;
            }
        }
    } catch (e) {
        // Si no se puede parsear, devolver el string original
        return trimmedTime;
    }
    
    return trimmedTime;
}

function formatServiceTime(timeString) {
    if (!timeString && timeString !== 0) return '-';
    
    // Si es un número (decimal de Excel), convertirlo
    if (typeof timeString === 'number') {
        return convertExcelTimeToHourFormat(timeString);
    }
    
    // Si es un string vacío, devolver '-'
    if (typeof timeString === 'string' && timeString.trim() === '') {
        return '-';
    }
    
    // Si es un string, intentar parsearlo
    if (typeof timeString === 'string') {
        const trimmedTime = timeString.trim();
        
        // Si ya está en formato de hora con a. m./p. m., devolverlo tal cual
        if (trimmedTime.includes('a. m.') || trimmedTime.includes('p. m.') || trimmedTime.includes('AM') || trimmedTime.includes('PM') || trimmedTime.includes('am') || trimmedTime.includes('pm')) {
            return trimmedTime;
        }
        
        // Si está en formato de hora (contiene :), convertir a formato de 12 horas
        if (trimmedTime.includes(':')) {
            const timeMatch = trimmedTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
            if (timeMatch) {
                let hours = parseInt(timeMatch[1], 10);
                const minutes = parseInt(timeMatch[2], 10);
                const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
                
                // Validar que sea una hora válida
                if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 && seconds >= 0 && seconds <= 59) {
                    const ampm = hours >= 12 ? 'p. m.' : 'a. m.';
                    const hours12 = hours % 12 || 12;
                    return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} ${ampm}`;
                }
            }
            // Si no coincide con el patrón, devolver tal cual
            return trimmedTime;
        }
        
        // Intentar parsear como fecha/hora
        try {
            const date = new Date(timeString);
            if (!isNaN(date.getTime())) {
                const hours = date.getHours();
                const minutes = date.getMinutes();
                const seconds = date.getSeconds();
                
                if (hours >= 0 || minutes > 0 || seconds > 0) {
                    const ampm = hours >= 12 ? 'p. m.' : 'a. m.';
                    const hours12 = hours % 12 || 12;
                    return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} ${ampm}`;
                }
            }
        } catch (e) {
            // Si no se puede parsear, devolver el string original
            return trimmedTime;
        }
    }
    
    return '-';
}

// --- Assign Tasks/Services (Admin) ---

function populateAssignServiceDropdown() {
    const dropdown = document.getElementById('assign-service-id');
    dropdown.innerHTML = '<option value="">Seleccionar un servicio...</option>';
    services.filter(s => !s.technicianId && !['Finalizado', 'Cancelado'].includes(s.status)).forEach(service => {
        const option = document.createElement('option');
        option.value = service.id;
        option.textContent = `ID: ${service.id} - Cliente: ${service.clientName} - Ubicación: ${service.location}`;
        dropdown.appendChild(option);
    });
}

function populateAssignTechnicianDropdown() {
    const dropdown = document.getElementById('assign-technician');
    dropdown.innerHTML = '<option value="">Seleccionar un técnico...</option>';
    users.filter(u => u.role === 'employee').forEach(technician => {
        const option = document.createElement('option');
        option.value = technician.id;
        option.textContent = technician.username;
        dropdown.appendChild(option);
    });
}

function assignServiceToTechnician() {
    const serviceId = document.getElementById('assign-service-id').value;
    const technicianId = document.getElementById('assign-technician').value;
    const assignMessage = document.getElementById('assign-message');

    if (!serviceId || !technicianId) {
        assignMessage.textContent = 'Por favor, selecciona un servicio y un técnico.';
        assignMessage.className = 'text-danger mt-3';
        return;
    }

    const serviceIndex = services.findIndex(s => s.id === serviceId);
    if (serviceIndex !== -1) {
        if (['Finalizado', 'Cancelado'].includes(services[serviceIndex].status)) {
            assignMessage.textContent = 'No se puede re-asignar un servicio finalizado o cancelado.';
            assignMessage.className = 'text-danger mt-3';
            return;
        }

        const oldTechnicianId = services[serviceIndex].technicianId; // Capturar técnico actual
        const previousTechnicianId = services[serviceIndex].previousTechnicianId; // Capturar técnico anterior (si fue desasignado)
        
        // Determinar el tipo de asignación
        const isReassignmentToDifferent = oldTechnicianId && oldTechnicianId !== technicianId; // Reasignación a otro técnico
        const isReassignmentToSame = previousTechnicianId === technicianId && oldTechnicianId !== technicianId; // Reasignación al mismo técnico después de desasignarlo
        
        services[serviceIndex].technicianId = technicianId;
        services[serviceIndex].status = 'Pendiente';
        // Limpiar previousTechnicianId ya que ahora tiene un técnico asignado
        if (services[serviceIndex].previousTechnicianId) {
            delete services[serviceIndex].previousTechnicianId;
        }
        saveServices();
        assignMessage.textContent = 'Servicio asignado exitosamente.';
        assignMessage.className = 'text-success mt-3';
        
        // Notificar al técnico anterior si es una reasignación a otro técnico
        if (isReassignmentToDifferent && oldTechnicianId) {
            sendNotification(oldTechnicianId, `El servicio ID: ${serviceId} (Cliente: ${services[serviceIndex].clientName}, Tipo: ${services[serviceIndex].safeType}) ha sido REASIGNADO a otro técnico. Ya no está asignado a ti.`);
        }
        
        // Notificar al técnico según el tipo de asignación
        if (isReassignmentToSame) {
            // Reasignación al mismo técnico después de haber sido desasignado
            sendNotification(technicianId, `El servicio ID: ${serviceId} (Cliente: ${services[serviceIndex].clientName}, Tipo: ${services[serviceIndex].safeType}) ha sido REASIGNADO a ti nuevamente. Ubicación: ${services[serviceIndex].location}.`);
        } else {
            // Nueva asignación
            sendNotification(technicianId, `¡Nuevo servicio asignado! ID: ${serviceId}. Cliente: ${services[serviceIndex].clientName}. Ubicación: ${services[serviceIndex].location}.`);
        }
        renderAdminServicesList(services, 1);
        renderAssignedServicesList(1);
        
        // Poblar los dropdowns primero (esto actualiza la lista de servicios disponibles)
        populateAssignServiceDropdown();
        populateAssignTechnicianDropdown();
        
        // Limpiar los valores seleccionados después de poblar los dropdowns
        // Obtener las referencias nuevamente después de poblar para asegurar que estén actualizadas
        const assignServiceSelect = document.getElementById('assign-service-id');
        const assignTechnicianSelect = document.getElementById('assign-technician');
        
        // Limpiar los campos select de manera explícita
        if (assignServiceSelect) {
            assignServiceSelect.value = '';
            assignServiceSelect.selectedIndex = 0;
            // Forzar el evento change para asegurar que se actualice visualmente
            assignServiceSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (assignTechnicianSelect) {
            assignTechnicianSelect.value = '';
            assignTechnicianSelect.selectedIndex = 0;
            // Forzar el evento change para asegurar que se actualice visualmente
            assignTechnicianSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        renderEmployeeAssignedServices();
        
        // Actualizar contadores de filtros si el técnico asignado está logueado
        if (currentUser && currentUser.role === 'employee' && currentUser.id === technicianId) {
            updateEmployeeFilterCounts();
        }

        // Hide message after 3 seconds
        setTimeout(() => {
            assignMessage.textContent = '';
            assignMessage.className = '';
        }, 3000);

    } else {
        assignMessage.textContent = 'Error: Servicio no encontrado.';
        assignMessage.className = 'text-danger mt-3';
    }
}

function renderAssignedServicesList(page = 1) {
    currentAssignedServicesPage = page;
    const assignedListElement = document.getElementById('assigned-services-list');
    const assignedCardsElement = document.getElementById('assigned-services-list-cards');
    const assignedTable = assignedListElement.closest('table');
    
    assignedListElement.innerHTML = '';
    assignedCardsElement.innerHTML = '';
    
    const assignedServices = services.filter(s => s.technicianId);
    const totalPages = getTotalPages(assignedServices.length);
    const paginatedServices = paginateArray(assignedServices, page);
    
    if (paginatedServices.length === 0) {
        // Mensaje para tabla (11 columnas: #, ID, FECHA, HORA, CLIENTE, NIT/CC, UBICACIÓN, CÓDIGO SERVICIO, TÉCNICO, ESTADO, ACCIONES)
        const noResultsRow = document.createElement('tr');
        noResultsRow.innerHTML = `
            <td colspan="11" class="text-center text-muted py-4" style="text-align: center !important; vertical-align: middle;">
                <i class="bi bi-list-check" style="font-size: 2rem;"></i>
                <br><br>
                <strong>No hay servicios asignados</strong>
            </td>
        `;
        assignedListElement.appendChild(noResultsRow);
        
        // Mensaje para tarjetas móviles
        const noResultsCard = document.createElement('div');
        noResultsCard.className = 'text-center text-muted py-4';
        noResultsCard.innerHTML = `
            <i class="bi bi-list-check" style="font-size: 2rem;"></i>
            <br><br>
            <strong>No hay servicios asignados</strong>
        `;
        assignedCardsElement.appendChild(noResultsCard);
    } else {
        paginatedServices.forEach((service, index) => {
            const canUnassign = !['Finalizado', 'Cancelado'].includes(service.status);
            
            // Formatear fecha usando la misma función que en la tabla de servicios
            const formattedDate = formatServiceDate(service.date);
            
            // Formatear hora
            const serviceTime = formatServiceTime(service.time);
            
            // Obtener NIT/CC del cliente
            const clientNit = getClientNitByName(service.clientName);
            
            // Botón de estado con color según el estado del servicio
            let statusButtonClass = 'btn-status-service';
            let statusButtonColor = '';
            switch(service.status) {
                case 'Finalizado':
                    statusButtonColor = 'btn-status-finalizado';
                    break;
                case 'En proceso':
                    statusButtonColor = 'btn-status-en-proceso';
                    break;
                case 'Pendiente':
                    statusButtonColor = 'btn-status-pendiente';
                    break;
                case 'Cancelado':
                    statusButtonColor = 'btn-status-cancelado';
                    break;
                default:
                    statusButtonColor = 'btn-status-default';
            }
            const statusButton = `<button class="btn ${statusButtonClass} ${statusButtonColor}" disabled>${service.status || '-'}</button>`;
            
            // Botones de acciones apilados verticalmente (cuadrados con iconos)
            const actionsButtons = `
                <div class="d-flex flex-column gap-1">
                    <button class="btn btn-info btn-sm" onclick="viewServiceDetails('${service.id}')" title="Ver detalles" style="width: 38px; height: 38px; padding: 0; display: flex; align-items: center; justify-content: center;">
                        <i class="bi bi-eye-fill"></i>
                    </button>
                    <button class="btn btn-warning btn-sm" onclick="openAvisoNumberModal('${service.id}')" title="Agregar # de Aviso" style="width: 38px; height: 38px; padding: 0; display: flex; align-items: center; justify-content: center;">
                        <i class="bi bi-tag-fill"></i>
                    </button>
                    ${canUnassign ? `<button class="btn btn-secondary btn-sm" onclick="unassignService('${service.id}')" title="Desasignar" style="width: 38px; height: 38px; padding: 0; display: flex; align-items: center; justify-content: center;">
                        <i class="bi bi-person-x-fill"></i>
                    </button>` : ''}
                </div>
            `;

            // Generar fila de tabla (vista desktop)
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${(page - 1) * ITEMS_PER_PAGE + index + 1}</td>
                <td>${service.id}</td>
                <td>${formattedDate}</td>
                <td>${serviceTime}</td>
                <td>${service.clientName}</td>
                <td>${clientNit}</td>
                <td>${service.location}</td>
                <td>${service.serviceCode || '-'}</td>
                <td>${getTechnicianNameById(service.technicianId)}</td>
                <td>${statusButton}</td>
                <td>${actionsButtons}</td>
            `;
            assignedListElement.appendChild(row);
            
            // Generar tarjeta móvil (vista móvil)
            const serviceCard = document.createElement('div');
            serviceCard.className = 'service-card';
            
            // Determinar clase de estado para la tarjeta
            let statusClass = '';
            switch(service.status) {
                case 'Pendiente':
                    statusClass = 'status-pendiente';
                    break;
                case 'En proceso':
                    statusClass = 'status-en-proceso';
                    break;
                case 'Finalizado':
                    statusClass = 'status-finalizado';
                    break;
                case 'Cancelado':
                    statusClass = 'status-cancelado';
                    break;
            }
            
            // Botón de desasignar para tarjeta móvil
            const unassignButton = canUnassign ? `<button class="btn btn-secondary btn-sm" onclick="unassignService('${service.id}')" title="Desasignar">
                        <i class="bi bi-person-x-fill"></i>
                    </button>` : '';
            
            serviceCard.innerHTML = `
                <div class="service-card-header">
                    <span class="service-card-id">#${service.id}</span>
                    <span class="service-card-status ${statusClass}">${service.status}</span>
                </div>
                <div class="service-card-info">
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Fecha:</span>
                        <span class="service-card-info-value">${formattedDate}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Hora:</span>
                        <span class="service-card-info-value">${serviceTime}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Cliente:</span>
                        <span class="service-card-info-value">${service.clientName}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Código Servicio:</span>
                        <span class="service-card-info-value">${service.serviceCode || '-'}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Tipo Servicio:</span>
                        <span class="service-card-info-value">${service.safeType}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Ubicación:</span>
                        <span class="service-card-info-value">${service.location}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Técnico:</span>
                        <span class="service-card-info-value">${getTechnicianNameById(service.technicianId)}</span>
                    </div>
                </div>
                <div class="service-card-actions">
                    <button class="btn btn-info btn-sm me-1" onclick="viewServiceDetails('${service.id}')" title="Ver detalles" style="width: 38px; height: 38px; padding: 0; display: flex; align-items: center; justify-content: center;">
                        <i class="bi bi-eye-fill"></i>
                    </button>
                    <button class="btn btn-warning btn-sm me-1" onclick="openAvisoNumberModal('${service.id}')" title="Agregar # de Aviso" style="width: 38px; height: 38px; padding: 0; display: flex; align-items: center; justify-content: center;">
                        <i class="bi bi-tag-fill"></i>
                    </button>
                    ${canUnassign ? `<button class="btn btn-secondary btn-sm" onclick="unassignService('${service.id}')" title="Desasignar" style="width: 38px; height: 38px; padding: 0; display: flex; align-items: center; justify-content: center;">
                        <i class="bi bi-person-x-fill"></i>
                    </button>` : ''}
                </div>
            `;
            assignedCardsElement.appendChild(serviceCard);
        });
        
        // La numeración ya está incluida en las filas, no necesitamos addRowNumbers
    }
    
    // Generar controles de paginación
    const paginationContainer = assignedTable.closest('.card-body');
    const existingPagination = paginationContainer.querySelector('.pagination-container');
    if (existingPagination) {
        existingPagination.remove();
    }
    
    const paginationDiv = document.createElement('div');
    paginationDiv.id = 'assigned-services-pagination';
    paginationDiv.className = 'pagination-container';
    paginationContainer.appendChild(paginationDiv);
    
    generatePaginationControls(page, totalPages, 'assigned-services-pagination', renderAssignedServicesList);
}

function openAvisoNumberModal(serviceId) {
    const service = services.find(s => s.id === serviceId);
    if (!service) {
        showAlert('Servicio no encontrado.');
        return;
    }
    
    // Cargar el valor actual del # de aviso si existe
    const avisoInput = document.getElementById('aviso-number-input');
    if (avisoInput) {
        avisoInput.value = service.avisoNumber || '';
    }
    
    // Guardar el ID del servicio en un atributo del modal para usarlo al guardar
    const modal = document.getElementById('avisoNumberModal');
    if (modal) {
        modal.setAttribute('data-service-id', serviceId);
    }
    
    // Mostrar el modal
    const bootstrapModal = new bootstrap.Modal(document.getElementById('avisoNumberModal'));
    bootstrapModal.show();
}

// Función para guardar el # de aviso
function saveAvisoNumber() {
    const modal = document.getElementById('avisoNumberModal');
    if (!modal) return;
    
    const serviceId = modal.getAttribute('data-service-id');
    if (!serviceId) return;
    
    const avisoInput = document.getElementById('aviso-number-input');
    if (!avisoInput) return;
    
    const avisoNumber = avisoInput.value.trim();
    
    const serviceIndex = services.findIndex(s => s.id === serviceId);
    if (serviceIndex !== -1) {
        services[serviceIndex].avisoNumber = avisoNumber || null;
        saveServices();
        
        // Actualizar las listas
        renderAssignedServicesList(1);
        renderAdminServicesList(services, 1);
        
        // Cerrar el modal
        const bootstrapModal = bootstrap.Modal.getInstance(modal);
        if (bootstrapModal) {
            bootstrapModal.hide();
        }
        
        showAlert(avisoNumber ? `# de Aviso "${avisoNumber}" guardado correctamente.` : '# de Aviso eliminado correctamente.');
    }
}


function unassignService(serviceId) {
    showConfirm('¿Estás seguro de que quieres desasignar este servicio?', (result) => {
        if (result) {
            const serviceIndex = services.findIndex(s => s.id === serviceId);
            if (serviceIndex !== -1) {
                const service = services[serviceIndex];
                if (['Finalizado', 'Cancelado'].includes(service.status)) {
                    showAlert('No se puede desasignar un servicio finalizado o cancelado.');
                    return;
                }
                const oldTechnicianId = service.technicianId; // Capture old technician ID
                // Guardar el técnico anterior en previousTechnicianId para detectar reasignaciones
                if (oldTechnicianId) {
                    service.previousTechnicianId = oldTechnicianId;
                }
                service.technicianId = null;
                service.status = 'Pendiente';
                saveServices();
                renderAdminServicesList(services, 1);
                renderAssignedServicesList(1);
                populateAssignServiceDropdown();
                // Solo notificar al técnico, no al admin
                if (oldTechnicianId) {
                    sendNotification(oldTechnicianId, `El servicio ID: ${serviceId} (Cliente: ${service.clientName}, Tipo: ${service.safeType}) ha sido DESASIGNADO por el administrador. Ya no está asignado a ti.`);
                }
                renderEmployeeAssignedServices(1);
                
                // Actualizar contadores de filtros si el técnico desasignado está logueado
                if (currentUser && currentUser.role === 'employee' && currentUser.id === oldTechnicianId) {
                    updateEmployeeFilterCounts();
                }
            }
        }
    });
}


// --- Report Novelty/Problems ---

document.getElementById('novelty-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Validar y corregir IDs antes de crear nuevo reporte
    validateAndCorrectIds();
    
    const serviceId = document.getElementById('novelty-service-id').value;
    const description = document.getElementById('novelty-description').value;
    const generatedReportId = generateReportId();
    const newReport = {
        id: generatedReportId,
        date: new Date().toISOString().split('T')[0],
        serviceId: serviceId || 'N/A',
        reporterId: currentUser.id,
        reporterName: currentUser ? currentUser.username : 'Desconocido',
        description: description,
        replies: [],
        readForAdmin: false // Mark as unread for admin when a new report is created
    };
    reports.push(newReport);
    saveReports();
    renderReportsList(1);
    // Los reportes se muestran solo en la sección "Reportes/Novedades" del admin
    // No se envían notificaciones para mantener la separación entre notificaciones y reportes
    updateNotificationBadges();

    const modal = bootstrap.Modal.getInstance(document.getElementById('reportNoveltyModal'));
    modal.hide();
    document.getElementById('novelty-form').reset();
});

function renderReportsList(page = 1) {
    currentReportsPage = page;
    const reportsListElement = document.getElementById('reports-list');
    const reportsContainer = reportsListElement.closest('.card-body');
    reportsListElement.innerHTML = '';
    
    // Ordenar reportes: primero los no leídos por admin, luego por fecha (más recientes primero)
    const sortedReports = reports.sort((a, b) => {
        // Si uno no ha sido leído por admin y el otro sí, el no leído va primero
        if (!a.readForAdmin && b.readForAdmin) return -1;
        if (a.readForAdmin && !b.readForAdmin) return 1;
        
        // Si ambos tienen el mismo estado de lectura, ordenar por fecha (más reciente primero)
        return new Date(b.date) - new Date(a.date);
    });

    const totalPages = getTotalPages(sortedReports.length);
    const paginatedReports = paginateArray(sortedReports, page);

    if (paginatedReports.length === 0) {
        reportsListElement.innerHTML = '<p>No hay reportes de novedades.</p>';
    } else {
        paginatedReports.forEach((report, index) => {
            const globalIndex = (page - 1) * ITEMS_PER_PAGE + index + 1;
            const reportDiv = document.createElement('div');
            // Usar el mismo estilo que las notificaciones
            const isUnread = !report.readForAdmin;
            reportDiv.className = `alert ${isUnread ? 'alert-info' : 'alert-light'} d-flex justify-content-between align-items-start`;
            
            // Formatear fecha
            const reportDate = new Date(report.date).toLocaleString();
            
            // Construir el mensaje principal
            let messageParts = [];
            if (report.serviceId) {
                messageParts.push(`ID Servicio: ${report.serviceId}`);
            }
            messageParts.push(`Reportado por: ${report.reporterName}`);
            messageParts.push(`Descripción: ${report.description}`);
            
            let repliesHtml = '';
            if (report.replies && report.replies.length > 0) {
                repliesHtml = '<div class="mt-2"><strong>Respuestas:</strong><ul class="list-group mt-2">';
                report.replies.forEach(reply => {
                    repliesHtml += `<li class="list-group-item list-group-item-light"><strong>Admin (${new Date(reply.timestamp).toLocaleString()}):</strong> ${reply.message}</li>`;
                });
                repliesHtml += '</ul></div>';
            }

            reportDiv.innerHTML = `
                <div class="d-flex align-items-start flex-grow-1">
                    <span class="badge bg-secondary me-2">${globalIndex}</span>
                    <div class="flex-grow-1">
                        <div>
                            <strong>${reportDate}:</strong> ${messageParts.join(' | ')}
                        </div>
                        ${repliesHtml}
                        <button class="btn btn-sm btn-primary mt-2" onclick="openReplyReportModal('${report.id}')">Responder</button>
                    </div>
                </div>
                ${isUnread ? `<button class="btn btn-sm btn-outline-primary" onclick="markReportAsRead('${report.id}')">Marcar como leído</button>` : ''}
            `;
            reportsListElement.appendChild(reportDiv);
        });
    }
    
    // Generar controles de paginación
    const existingPagination = reportsContainer.querySelector('.pagination-container');
    if (existingPagination) {
        existingPagination.remove();
    }
    
    const paginationDiv = document.createElement('div');
    paginationDiv.id = 'reports-pagination';
    paginationDiv.className = 'pagination-container';
    reportsContainer.appendChild(paginationDiv);
    
    generatePaginationControls(page, totalPages, 'reports-pagination', renderReportsList);
    
    updateNotificationBadges();
}

function openReplyReportModal(reportId) {
    document.getElementById('reply-report-id').value = reportId;
    const modal = new bootstrap.Modal(document.getElementById('replyReportModal'));
    modal.show();
}

document.getElementById('reply-report-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const reportId = document.getElementById('reply-report-id').value;
    const replyMessage = document.getElementById('reply-report-message').value;

    const reportIndex = reports.findIndex(r => r.id === reportId);
    if (reportIndex !== -1) {
        const report = reports[reportIndex];
        if (!report.replies) {
            report.replies = [];
        }
        const newReply = {
            message: replyMessage,
            timestamp: new Date().toISOString(),
            adminId: currentUser.id,
            adminName: currentUser.username,
            readForTechnician: false
        };
        report.replies.push(newReply);
        // Mark the report as "read" for the admin once they reply
        report.readForAdmin = true;
        saveReports();
        renderReportsList(1);
        sendNotification(report.reporterId, `¡El administrador ha respondido a tu reporte ID ${report.id}: "${replyMessage}"`);
        updateNotificationBadges(); // Crucial for updating the badge

        const modal = bootstrap.Modal.getInstance(document.getElementById('replyReportModal'));
        modal.hide();
        document.getElementById('reply-report-form').reset();
    } else {
        showAlert('Error: Reporte no encontrado.');
    }
});


// --- Employee Dashboard ---

function renderEmployeeAssignedServices(page = 1) {
    currentEmployeeServicesPage = page;
    const employeeServicesList = document.getElementById('employee-assigned-services-list');
    const employeeServicesCards = document.getElementById('employee-assigned-services-cards');
    const employeeTable = employeeServicesList.closest('table');
    const employeeTableHeader = employeeTable.querySelector('thead');
    
    // El encabezado # ya está en el HTML
    
    employeeServicesList.innerHTML = '';
    employeeServicesCards.innerHTML = '';
    let assignedToMe = services.filter(s => s.technicianId === currentUser.id);
    
    // Aplicar filtro de estado
    if (currentEmployeeServicesFilter !== 'todos') {
        assignedToMe = assignedToMe.filter(s => s.status === currentEmployeeServicesFilter);
    }
    
    const totalPages = getTotalPages(assignedToMe.length);
    const paginatedServices = paginateArray(assignedToMe, page);

    if (paginatedServices.length === 0) {
        // Contar el número real de columnas en el header después de agregar la columna #
        const headerRow = employeeTableHeader.querySelector('tr');
        const columnCount = headerRow ? headerRow.querySelectorAll('th').length : 10;
        
        // Mensaje para tabla - incluir celda vacía para columna # y luego el mensaje que ocupe el resto
        // Esto coincide con la estructura de las filas reales que no incluyen la columna #
        const noResultsRow = document.createElement('tr');
        noResultsRow.innerHTML = `
            <td></td>
            <td colspan="${columnCount - 1}" class="text-center text-muted py-4" style="text-align: center !important; vertical-align: middle;">
                <i class="bi bi-person-check" style="font-size: 2rem;"></i>
                <br><br>
                <strong>No tienes servicios asignados</strong>
            </td>
        `;
        employeeServicesList.appendChild(noResultsRow);
        
        // Mensaje para tarjetas móviles
        const noResultsCard = document.createElement('div');
        noResultsCard.className = 'text-center text-muted py-4';
        noResultsCard.innerHTML = `
            <i class="bi bi-person-check" style="font-size: 2rem;"></i>
            <br><br>
            <strong>No tienes servicios asignados</strong>
        `;
        employeeServicesCards.appendChild(noResultsCard);
    } else {
        paginatedServices.forEach((service, index) => {
            const globalIndex = (page - 1) * ITEMS_PER_PAGE + index + 1;
            const isStatusFixed = ['Finalizado', 'Cancelado'].includes(service.status);
            const dropdownDisabled = isStatusFixed ? 'disabled' : '';
            const dropdownTitle = isStatusFixed ? 'No se puede cambiar el estado de un servicio finalizado/cancelado' : '';
            const showStartButton = service.status === 'Pendiente';

            // Formatear fecha y hora
            const formattedDate = formatServiceDate(service.date);
            const serviceTime = formatServiceTime(service.time);
            
            // Obtener NIT/CC del cliente
            const clientNit = getClientNitByName(service.clientName);
            
            // Botón de estado con color según el estado del servicio
            let statusButtonClass = 'btn-status-service';
            let statusButtonColor = '';
            switch(service.status) {
                case 'Finalizado':
                    statusButtonColor = 'btn-status-finalizado';
                    break;
                case 'En proceso':
                    statusButtonColor = 'btn-status-en-proceso';
                    break;
                case 'Pendiente':
                    statusButtonColor = 'btn-status-pendiente';
                    break;
                case 'Cancelado':
                    statusButtonColor = 'btn-status-cancelado';
                    break;
                default:
                    statusButtonColor = 'btn-status-default';
            }
            const statusButton = `<button class="btn ${statusButtonClass} ${statusButtonColor}" disabled>${service.status || '-'}</button>`;
            
            // Generar fila de tabla (vista desktop)
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${globalIndex}</td>
                <td>${service.id}</td>
                <td>${formattedDate}</td>
                <td>${serviceTime}</td>
                <td>${service.clientName || '-'}</td>
                <td>${clientNit}</td>
                <td>${service.location || '-'}</td>
                <td>${service.serviceCode || '-'}</td>
                <td>${statusButton}</td>
                <td>
                    <div class="d-flex gap-0 align-items-center">
                        <div class="dropdown d-inline-block">
                            <button class="btn btn-secondary btn-sm dropdown-toggle btn-cambiar-estado" type="button" id="dropdownMenuButton${service.id}" data-bs-toggle="dropdown" aria-expanded="false" ${dropdownDisabled} title="${dropdownTitle}">
                                CAMBIAR ESTADO
                            </button>
                            <ul class="dropdown-menu" aria-labelledby="dropdownMenuButton${service.id}">
                                <li><a class="dropdown-item ${isStatusFixed || service.status === 'Pendiente' ? 'disabled' : ''}" href="#" onclick="if(!${isStatusFixed} && '${service.status}' !== 'Pendiente') handleEmployeeServiceStatusChange('${service.id}', 'Pendiente')">Pendiente</a></li>
                                <li><a class="dropdown-item ${isStatusFixed || service.status === 'En proceso' ? 'disabled' : ''}" href="#" onclick="if(!${isStatusFixed} && '${service.status}' !== 'En proceso') handleEmployeeServiceStatusChange('${service.id}', 'En proceso')">En proceso</a></li>
                                <li><a class="dropdown-item ${isStatusFixed ? 'disabled' : ''}" href="#" onclick="if(!${isStatusFixed}) handleEmployeeServiceStatusChange('${service.id}', 'Finalizado')">Finalizado</a></li>
                                <li><a class="dropdown-item ${isStatusFixed ? 'disabled' : ''}" href="#" onclick="if(!${isStatusFixed}) handleEmployeeServiceStatusChange('${service.id}', 'Cancelado')">Cancelado</a></li>
                            </ul>
                        </div>
                        <button class="btn btn-info btn-sm btn-ver-servicio ms-1" onclick="viewServiceDetails('${service.id}')" title="Ver detalles">
                            <i class="bi bi-eye-fill"></i>
                        </button>
                        <button class="btn btn-danger btn-sm btn-alerta-servicio" data-bs-toggle="modal" data-bs-target="#reportNoveltyModal" onclick="prefillNoveltyServiceId('${service.id}')" title="Reportar novedad">
                            <i class="bi bi-exclamation-triangle-fill"></i>
                        </button>
                        ${showStartButton ? `<button class="btn btn-success btn-sm btn-iniciar-servicio" onclick="startService('${service.id}')" title="Iniciar servicio">
                            <i class="bi bi-play-fill"></i>
                        </button>` : ''}
                    </div>
                </td>
            `;
            employeeServicesList.appendChild(row);
            
            // Generar tarjeta móvil (vista móvil)
            const serviceCard = document.createElement('div');
            serviceCard.className = 'service-card';
            
            // Determinar clase de estado para la tarjeta
            let statusClass = '';
            switch(service.status) {
                case 'Pendiente':
                    statusClass = 'status-pendiente';
                    break;
                case 'En proceso':
                    statusClass = 'status-en-proceso';
                    break;
                case 'Finalizado':
                    statusClass = 'status-finalizado';
                    break;
                case 'Cancelado':
                    statusClass = 'status-cancelado';
                    break;
            }
            
            serviceCard.innerHTML = `
                <div class="service-card-header">
                    <span class="service-card-id">#${service.id}</span>
                    <span class="service-card-status ${statusClass}">${service.status}</span>
                </div>
                <div class="service-card-info">
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Fecha:</span>
                        <span class="service-card-info-value">${formattedDate}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Hora:</span>
                        <span class="service-card-info-value">${serviceTime}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Cliente:</span>
                        <span class="service-card-info-value">${service.clientName}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Código Servicio:</span>
                        <span class="service-card-info-value">${service.serviceCode || '-'}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Tipo Servicio:</span>
                        <span class="service-card-info-value">${service.safeType}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Ubicación:</span>
                        <span class="service-card-info-value">${service.location}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Técnico:</span>
                        <span class="service-card-info-value">${getTechnicianNameById(service.technicianId)}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Teléfono:</span>
                        <span class="service-card-info-value">${service.clientPhone}</span>
                    </div>
                </div>
                <div class="service-card-actions">
                    <button class="btn btn-info btn-sm me-1" onclick="viewServiceDetails('${service.id}')" title="Ver detalles">
                        <i class="bi bi-eye-fill"></i> Ver
                    </button>
                    <div class="dropdown d-inline-block">
                        <button class="btn btn-secondary btn-sm dropdown-toggle" type="button" id="dropdownMenuButtonMobile${service.id}" data-bs-toggle="dropdown" aria-expanded="false" ${dropdownDisabled} title="${dropdownTitle}">
                            Estado
                        </button>
                        <ul class="dropdown-menu" aria-labelledby="dropdownMenuButtonMobile${service.id}">
                            <li><a class="dropdown-item ${isStatusFixed || service.status === 'Pendiente' ? 'disabled' : ''}" href="#" onclick="if(!${isStatusFixed} && '${service.status}' !== 'Pendiente') handleEmployeeServiceStatusChange('${service.id}', 'Pendiente')">Pendiente</a></li>
                            <li><a class="dropdown-item ${isStatusFixed || service.status === 'En proceso' ? 'disabled' : ''}" href="#" onclick="if(!${isStatusFixed} && '${service.status}' !== 'En proceso') handleEmployeeServiceStatusChange('${service.id}', 'En proceso')">En proceso</a></li>
                            <li><a class="dropdown-item ${isStatusFixed ? 'disabled' : ''}" href="#" onclick="if(!${isStatusFixed}) handleEmployeeServiceStatusChange('${service.id}', 'Finalizado')">Finalizado</a></li>
                            <li><a class="dropdown-item ${isStatusFixed ? 'disabled' : ''}" href="#" onclick="if(!${isStatusFixed}) handleEmployeeServiceStatusChange('${service.id}', 'Cancelado')">Cancelado</a></li>
                        </ul>
                    </div>
                    ${showStartButton ? `<button class="btn btn-success btn-sm" onclick="startService('${service.id}')" title="Iniciar servicio"><i class="bi bi-play-fill"></i> Iniciar</button>` : ''}
                    <button class="btn btn-danger btn-sm" data-bs-toggle="modal" data-bs-target="#reportNoveltyModal" onclick="prefillNoveltyServiceId('${service.id}')" title="Reportar novedad"><i class="bi bi-exclamation-triangle-fill"></i> Novedad</button>
                </div>
            `;
            employeeServicesCards.appendChild(serviceCard);
        });
    }
    
    // Generar controles de paginación
    const paginationContainer = employeeTable.closest('.card-body');
    const existingPagination = paginationContainer.querySelector('.pagination-container');
    if (existingPagination) {
        existingPagination.remove();
    }
    
    const paginationDiv = document.createElement('div');
    paginationDiv.id = 'employee-services-pagination';
    paginationDiv.className = 'pagination-container';
    paginationContainer.appendChild(paginationDiv);
    
    generatePaginationControls(page, totalPages, 'employee-services-pagination', renderEmployeeAssignedServices);
    
    // Actualizar contadores de filtros
    updateEmployeeFilterCounts();
    
    updateNotificationBadges();
}

function handleEmployeeServiceStatusChange(id, newStatus) {
    const service = services.find(s => s.id === id);
    if (!service) {
        return;
    }

    if (['Finalizado', 'Cancelado'].includes(service.status)) {
        showAlert('No se puede cambiar el estado de un servicio finalizado o cancelado.');
        return;
    }

    if (newStatus === 'Finalizado') {
        openServiceFinalizationModal(id);
    } else if (newStatus === 'Cancelado') {
        // Show the modal for cancellation reason
        const cancelReasonModal = new bootstrap.Modal(document.getElementById('cancelReasonModal'));
        document.getElementById('cancel-reason-input').value = ''; // Clear previous input
        cancelReasonModal.show();

        // Store service ID temporarily to use in modal's confirm button
        document.getElementById('confirmCancelReasonBtn').dataset.serviceId = id;

        // Remove previous event listener to prevent duplicates
        const confirmCancelBtn = document.getElementById('confirmCancelReasonBtn');
        confirmCancelBtn.onclick = null; // Important to prevent multiple listeners

        confirmCancelBtn.onclick = () => {
            const reason = document.getElementById('cancel-reason-input').value;
            if (reason === null || reason.trim() === '') {
                // Cerrar el modal antes de mostrar la alerta para evitar que aparezca detrás
                cancelReasonModal.hide();
                setTimeout(() => {
                    showAlert('El motivo de cancelación es obligatorio.');
                }, 300);
                return;
            }
            changeServiceStatus(id, newStatus, reason);
            cancelReasonModal.hide();
        };
    } else {
        changeServiceStatus(id, newStatus);
    }
}

function openServiceFinalizationModal(serviceId) {
    // Recargar servicios desde localStorage para asegurar datos actualizados
    services = JSON.parse(localStorage.getItem('services')) || [];
    
    const service = services.find(s => s.id === serviceId);
    if (service) {
        try {
            // Verificar que el modal existe
            const modalElement = document.getElementById('registerServiceModal');
            if (!modalElement) {
                showAlert('Error: No se pudo abrir el modal de finalización. Contacte al administrador.');
                return;
            }
            
            // Actualizar el título del modal
            document.getElementById('registerServiceModalLabel').textContent = `Finalizar Servicio: ${service.id}`;
            
            // Función para cargar los datos cuando el modal esté completamente visible
            const loadDataWhenModalShown = () => {
                // Usar forceLoadServiceDataInModal para cargar todos los datos correctamente
                // Esto asegura que fecha y hora se carguen correctamente
                forceLoadServiceDataInModal(service);
                
                // Asegurar que el estado esté en Finalizado
                document.getElementById('service-status').value = 'Finalizado';
                
                // Cargar código de servicio y tipo de servicio (forceLoadServiceDataInModal ya carga los demás campos)
                populateServiceCodes();
                loadServiceDetails();
                
                // Cargar cantidad del servicio
                const quantityInput = document.getElementById('service-quantity');
                if (quantityInput) {
                    quantityInput.value = service.quantity || 1;
                }
                
                // Cargar servicios adicionales
                const additionalServicesContainer = document.getElementById('additional-services-container');
                if (additionalServicesContainer && service.additionalServices && Array.isArray(service.additionalServices) && service.additionalServices.length > 0) {
                    additionalServicesContainer.innerHTML = '';
                    service.additionalServices.forEach((additionalService, index) => {
                        const serviceIndex = index;
                        const additionalServiceDiv = document.createElement('div');
                        additionalServiceDiv.className = 'mb-3 p-3 border rounded bg-light';
                        additionalServiceDiv.setAttribute('data-service-index', serviceIndex);
                        const suggestionsId = `additional-service-suggestions-${serviceIndex}`;
                        additionalServiceDiv.innerHTML = `
                            <div class="row mb-3">
                                <div class="col-md-6 mb-3">
                                    <div class="service-code-selector">
                                        <label class="form-label fw-bold service-code-label">CÓDIGO DE SERVICIO ADICIONAL</label>
                                        <input type="text" class="form-control service-code-input additional-service-code" placeholder="Escribir para buscar código..." name="additional-service-code-${serviceIndex}" data-service-index="${serviceIndex}" value="${additionalService.code || ''}">
                                        <div class="service-code-suggestions" id="${suggestionsId}" style="display: none;"></div>
                                    </div>
                                </div>
                                <div class="col-md-3 mb-3">
                                    <label class="form-label fw-bold">TIPO DE SERVICIO</label>
                                    <input type="text" class="form-control additional-service-type" placeholder="" name="additional-service-type-${serviceIndex}" value="${additionalService.type || ''}">
                                </div>
                                <div class="col-md-3 mb-3">
                                    <label class="form-label fw-bold">CANTIDAD</label>
                                    <input type="number" class="form-control additional-service-quantity" placeholder="1" name="additional-service-quantity-${serviceIndex}" min="1" value="${additionalService.quantity || 1}">
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-12 mb-3">
                                    <label class="form-label fw-bold">DESCRIPCIÓN</label>
                                    <input type="text" class="form-control additional-service-description" placeholder="" name="additional-service-description-${serviceIndex}" value="${additionalService.description || ''}">
                                </div>
                            </div>
                        `;
                        additionalServicesContainer.appendChild(additionalServiceDiv);
                    });
                } else if (additionalServicesContainer) {
                    additionalServicesContainer.innerHTML = '';
                }
                
                // Aseguramos que los campos se muestren y se inicialicen
                document.getElementById('photo-evidence-section').classList.remove('d-none');
                document.getElementById('client-signature-section').classList.remove('d-none');
                document.getElementById('technician-signature-section').classList.remove('d-none');

                // Pre-cargar foto si existe
                if (service.photo) {
                    document.getElementById('service-photo-preview').src = service.photo;
                    document.getElementById('service-photo-preview').classList.remove('d-none');
                } else {
                    document.getElementById('service-photo-preview').classList.add('d-none');
                    document.getElementById('service-photo').value = '';
                }

                // Inicializar y cargar firmas
                initializeSignaturePads();
                
                if (service.clientSignature) {
                    const imgClient = new Image();
                    imgClient.onload = function() {
                        if (signaturePadClient) signaturePadClient.fromDataURL(service.clientSignature);
                    };
                    imgClient.src = service.clientSignature;
                } else {
                    clearSignaturePad('client');
                }

                if (service.technicianSignature) {
                    const imgTechnician = new Image();
                    imgTechnician.onload = function() {
                        if (signaturePadTechnician) signaturePadTechnician.fromDataURL(service.technicianSignature);
                    };
                    imgTechnician.src = service.technicianSignature;
                } else {
                    clearSignaturePad('technician');
                }

                // Habilitar todos los campos para que el técnico pueda editarlos antes de finalizar
                const elementsToEnable = [
                    'service-date',
                    'service-code',
                    'service-type',
                    'service-type-bovedas',
                    'service-type-puertas', 
                    'service-type-pasatulas',
                    'service-description',
                    'service-location',
                    'service-client-name',
                    'service-client-phone',
                    'service-client-nit',
                    'service-client-email',
                    'service-status',
                    'service-quantity',
                    'service-time',
                    'service-aviso-number'
                ];
                
                elementsToEnable.forEach(elementId => {
                    const element = document.getElementById(elementId);
                    if (element) {
                        element.disabled = false;
                        element.removeAttribute('readonly');
                    }
                });
                
                // Remover readonly de service-type y service-description específicamente
                const serviceType = document.getElementById('service-type');
                if (serviceType) {
                    serviceType.removeAttribute('readonly');
                }
                const serviceDescription = document.getElementById('service-description');
                if (serviceDescription) {
                    serviceDescription.removeAttribute('readonly');
                }
                
                // Habilitar campos de servicios adicionales
                const additionalServiceInputs = document.querySelectorAll('.additional-service-code, .additional-service-type, .additional-service-description, .additional-service-quantity');
                additionalServiceInputs.forEach(input => {
                    input.disabled = false;
                    input.removeAttribute('readonly');
                });
                
                // Remover el listener después de usarlo
                modalElement.removeEventListener('shown.bs.modal', loadDataWhenModalShown);
            };
            
            // Agregar listener para cuando el modal esté completamente visible
            modalElement.addEventListener('shown.bs.modal', loadDataWhenModalShown);
            
            // Abrir el modal
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        } catch (error) {
            showAlert('Error al abrir el modal de finalización: ' + error.message);
        }
    } else {
        showAlert('Error: No se encontró el servicio especificado.');
    }
}


function changeServiceStatus(id, newStatus, cancellationReason = null) {
    const serviceIndex = services.findIndex(s => s.id === id);
    if (serviceIndex !== -1) {
        const oldService = services[serviceIndex];
        const oldStatus = oldService.status;

        oldService.status = newStatus;
        oldService.cancellationReason = cancellationReason;

        // Capture finalization/cancellation time and location
        if ((newStatus === 'Finalizado' || newStatus === 'Cancelado') && currentUser.role === 'employee') {
            const options = {
                enableHighAccuracy: true,  // Solicitar la mejor precisión disponible
                timeout: 30000,           // Timeout de 30 segundos
                maximumAge: 0             // No usar ubicación en caché, obtener ubicación fresca
            };

            // Usar la instancia global de geolocalización
            if (!window.globalGeolocation) {
                window.globalGeolocation = new EnhancedGeolocation();
            }
            
            // Función auxiliar para obtener ubicación y guardar
            const getLocationAndSave = () => {
                // Mostrar mensaje de carga
                showAlert('🌍 Obteniendo ubicación para cambio de estado...\n\nPor favor espera mientras obtenemos tu ubicación GPS.');
                
                window.globalGeolocation.getQuickLocation(
                    (locationData) => {
                        // Éxito: ubicación obtenida
                        oldService.finalizationOrCancellationTime = locationData.timestamp;
                        oldService.finalizationOrCancellationLocation = {
                            latitude: locationData.latitude,
                            longitude: locationData.longitude,
                            accuracy: locationData.accuracy,
                            timestamp: locationData.timestamp,
                            altitude: locationData.altitude,
                            heading: locationData.heading,
                            speed: locationData.speed,
                            altitudeAccuracy: locationData.altitudeAccuracy,
                            browser: locationData.browser,
                            deviceInfo: locationData.deviceInfo,
                            context: locationData.context
                        };
                        
                        saveAndNotify();
                    },
                    (error) => {
                        // Error: mostrar mensaje específico
                        showAlert(`❌ ${error.message}\n\n${error.details || ''}\n\n🔧 Soluciones:\n• Verifica que el GPS esté activado\n• Permite el acceso a la ubicación en tu navegador\n• Asegúrate de tener conexión a internet\n• Intenta en un área con mejor señal GPS`);
                    },
                    'cambio_estado'
                );
            };
            
            // Cerrar el modal de finalización antes de obtener la ubicación (importante para móvil)
            const finalizationModal = bootstrap.Modal.getInstance(document.getElementById('registerServiceModal'));
            if (finalizationModal) {
                finalizationModal.hide();
                // Esperar a que el modal se cierre completamente antes de continuar (especialmente importante en móvil)
                const modalElement = document.getElementById('registerServiceModal');
                if (modalElement) {
                    modalElement.addEventListener('hidden.bs.modal', function onModalHidden() {
                        modalElement.removeEventListener('hidden.bs.modal', onModalHidden);
                        // Esperar un pequeño delay para asegurar que el modal se cerró completamente
                        setTimeout(() => {
                            getLocationAndSave();
                        }, 300);
                    }, { once: true });
                } else {
                    // Si no hay elemento modal, proceder directamente después de un pequeño delay
                    setTimeout(() => {
                        getLocationAndSave();
                    }, 300);
                }
            } else {
                // Si no hay modal que cerrar, proceder directamente
                getLocationAndSave();
            }
        } else {
            saveAndNotify();
        }

        function saveAndNotify() {
            saveServices();
            renderEmployeeAssignedServices(1);
            renderAdminServicesList(services, 1);
            updateEmployeeFilterCounts(); // Actualizar contadores de filtros
            
            // Obtener coordenadas y timestamp para la notificación
            let notificationCoordinates = null;
            let notificationTimestamp = null;
            if (oldService.finalizationOrCancellationLocation) {
                notificationCoordinates = {
                    latitude: oldService.finalizationOrCancellationLocation.latitude,
                    longitude: oldService.finalizationOrCancellationLocation.longitude
                };
                notificationTimestamp = oldService.finalizationOrCancellationTime || new Date().toISOString();
            } else if (oldService.startLocation) {
                notificationCoordinates = {
                    latitude: oldService.startLocation.latitude,
                    longitude: oldService.startLocation.longitude
                };
                notificationTimestamp = oldService.startTime || new Date().toISOString();
            }
            
            // Formatear timestamp
            if (!window.globalGeolocation) {
                window.globalGeolocation = new EnhancedGeolocation();
            }
            const timestamp = notificationTimestamp ? new Date(notificationTimestamp).toLocaleString() : new Date().toLocaleString();
            const coordinates = notificationCoordinates ? `${notificationCoordinates.latitude.toFixed(8)}, ${notificationCoordinates.longitude.toFixed(8)}` : '';
            
            // Crear mensaje según el estado
            let message = '';
            if (newStatus === 'Finalizado') {
                message = `El técnico ${currentUser.username} ha finalizado el servicio ID: ${id} a las ${timestamp} en la ubicación: ${coordinates}.`;
            } else if (newStatus === 'Cancelado') {
                message = `El técnico ${currentUser.username} ha cancelado el servicio ID: ${id} a las ${timestamp} en la ubicación: ${coordinates}. ${cancellationReason ? `Motivo: ${cancellationReason}` : ''}`;
            } else {
                message = `El servicio ID: ${id} ha sido cambiado de estado de "${oldStatus}" a "${newStatus}" por el técnico ${currentUser.username}.`;
            }
            
            sendNotification('admin', message, notificationCoordinates);
            
            // Notificar al técnico cuando el admin cancela un servicio
            if (currentUser.role === 'admin' && newStatus === 'Cancelado' && oldService.technicianId) {
                const technicianMessage = `El servicio ID: ${id} (Cliente: ${oldService.clientName}, Tipo: ${oldService.safeType || '-'}) ha sido CANCELADO por el administrador. ${cancellationReason ? `Motivo: ${cancellationReason}` : ''}`;
                sendNotification(oldService.technicianId, technicianMessage);
            }
            
            // Mostrar mensaje de éxito con ubicación para cancelación
            if (newStatus === 'Cancelado') {
                // Cerrar el modal de cancelación si está abierto
                const cancelReasonModal = bootstrap.Modal.getInstance(document.getElementById('cancelReasonModal'));
                if (cancelReasonModal) {
                    cancelReasonModal.hide();
                }
                
                // Mostrar alerta con ubicación detallada después de un pequeño delay
                setTimeout(() => {
                    if (oldService.finalizationOrCancellationLocation) {
                        if (!window.globalGeolocation) {
                            window.globalGeolocation = new EnhancedGeolocation();
                        }
                        const displayInfo = window.globalGeolocation.formatLocationForDisplay(oldService.finalizationOrCancellationLocation);
                        
                        showAlert(`✅ Servicio cancelado exitosamente.\n\n📍 Ubicación registrada:\nCoordenadas: ${displayInfo.coordinates}\nPrecisión: ${displayInfo.accuracy}\nDirección: ${displayInfo.direction}\nVelocidad: ${displayInfo.speed}\nAltitud: ${displayInfo.altitude}\nNavegador: ${displayInfo.browser}\n\nMotivo de cancelación: ${cancellationReason}\n\nEl servicio ha sido marcado como "Cancelado" y se ha registrado la ubicación de cancelación.`);
                    } else {
                        showAlert(`✅ Servicio cancelado exitosamente.\n\nMotivo de cancelación: ${cancellationReason}\n\nEl servicio ha sido marcado como "Cancelado".`);
                    }
                }, 300);
            }
        }
    }
}

function startService(serviceId) {
    // Usar la instancia global de geolocalización
    if (!window.globalGeolocation) {
        window.globalGeolocation = new EnhancedGeolocation();
    }
    
    // Mostrar mensaje de carga
    showAlert('🌍 Obteniendo ubicación para iniciar servicio...\n\nPor favor espera mientras obtenemos tu ubicación GPS.');
    
    window.globalGeolocation.getQuickLocation(
        (locationData) => {
            // Éxito: ubicación obtenida
            saveServiceLocation(serviceId, locationData);
        },
        (error) => {
            // Error: mostrar mensaje específico
            showAlert(`❌ ${error.message}\n\n${error.details || ''}\n\n🔧 Soluciones:\n• Verifica que el GPS esté activado\n• Permite el acceso a la ubicación en tu navegador\n• Asegúrate de tener conexión a internet\n• Intenta en un área con mejor señal GPS`);
        },
        'inicio_servicio'
    );
}

function saveServiceLocation(serviceId, locationData) {
    const serviceIndex = services.findIndex(s => s.id === serviceId);
    if (serviceIndex !== -1) {
        if (['Finalizado', 'Cancelado', 'En proceso'].includes(services[serviceIndex].status)) {
            showAlert('Este servicio ya está en proceso, finalizado o cancelado.');
            return;
        }

        services[serviceIndex].startTime = locationData.timestamp;
        services[serviceIndex].startLocation = {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            accuracy: locationData.accuracy,
            timestamp: locationData.timestamp,
            altitude: locationData.altitude,
            heading: locationData.heading,
            speed: locationData.speed,
            altitudeAccuracy: locationData.altitudeAccuracy,
            browser: locationData.browser,
            deviceInfo: locationData.deviceInfo,
            context: locationData.context
        };
        services[serviceIndex].status = 'En proceso';
        saveServices();
        renderEmployeeAssignedServices(1);
        renderAdminServicesList(services, 1);

        // Cerrar cualquier modal abierto
        const finalizationModal = bootstrap.Modal.getInstance(document.getElementById('registerServiceModal'));
        if (finalizationModal) {
            finalizationModal.hide();
        }

        // Formatear información para mostrar al usuario
        if (!window.globalGeolocation) {
            window.globalGeolocation = new EnhancedGeolocation();
        }
        const displayInfo = window.globalGeolocation.formatLocationForDisplay(locationData);
        
        const message = `El técnico ${currentUser.username} ha iniciado el servicio ID: ${serviceId} a las ${displayInfo.timestamp} en la ubicación: ${displayInfo.coordinates}.`;
        sendNotification('admin', message, {
            latitude: locationData.latitude,
            longitude: locationData.longitude
        });
        
        showAlert(`✅ Servicio iniciado exitosamente.\n\n📍 Ubicación registrada:\nCoordenadas: ${displayInfo.coordinates}\nPrecisión: ${displayInfo.accuracy}\nDirección: ${displayInfo.direction}\nVelocidad: ${displayInfo.speed}\nAltitud: ${displayInfo.altitude}\nNavegador: ${displayInfo.browser}\n\nEl estado del servicio ha cambiado a "En proceso".`);
    }
}

function prefillNoveltyServiceId(serviceId) {
    document.getElementById('novelty-service-id').value = serviceId;
}

// --- Notifications ---

function sendNotification(targetRoleOrUserId, message, coordinates = null) {
    let targetUsers = [];
    if (targetRoleOrUserId === 'admin') {
        targetUsers = users.filter(u => u.role === 'admin');
    } else if (typeof targetRoleOrUserId === 'string') {
        // Aceptar cualquier ID de usuario (user001, user002, _xxx, etc.)
        const targetUser = users.find(u => u.id === targetRoleOrUserId);
        if (targetUser) {
            targetUsers.push(targetUser);
        }
    } else {
        return;
    }

    if (targetUsers.length > 0) {
        targetUsers.forEach(user => {
            // Evitar duplicar notificaciones para el mismo usuario con el mismo mensaje
            const existingNotification = notifications.find(n => 
                n.userId === user.id && 
                n.message === message && 
                !n.read &&
                (new Date() - new Date(n.timestamp)) < 60000 // Solo verificar notificaciones de los últimos 60 segundos
            );
            
            if (!existingNotification) {
                const notification = {
                    id: generateId(),
                    userId: user.id,
                    message: message,
                    timestamp: new Date().toISOString(),
                    read: false
                };
                
                // Agregar coordenadas si están disponibles
                if (coordinates && coordinates.latitude && coordinates.longitude) {
                    notification.coordinates = {
                        latitude: coordinates.latitude,
                        longitude: coordinates.longitude
                    };
                }
                
                notifications.push(notification);
            }
        });
        saveNotifications();
        updateNotificationBadges();
    }
}

function renderAdminNotifications(page = 1) {
    currentAdminNotificationsPage = page;
    const notificationsList = document.getElementById('admin-notifications-list');
    const notificationsContainer = notificationsList.closest('.card-body');
    
    notificationsList.innerHTML = '';
    const adminNotifications = notifications.filter(n => {
        const targetUser = users.find(u => u.id === n.userId);
        return targetUser && targetUser.role === 'admin';
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const totalPages = getTotalPages(adminNotifications.length);
    const paginatedNotifications = paginateArray(adminNotifications, page);

    if (paginatedNotifications.length === 0) {
        notificationsList.innerHTML = '<p>No hay notificaciones para administradores.</p>';
    } else {
        paginatedNotifications.forEach((n, index) => {
            const notificationDiv = document.createElement('div');
            notificationDiv.className = `alert ${n.read ? 'alert-light' : 'alert-info'} d-flex justify-content-between align-items-center`;
            
            // Verificar si hay coordenadas para mostrar el botón de Google Maps
            let googleMapsButton = '';
            if (n.coordinates && n.coordinates.latitude && n.coordinates.longitude) {
                const mapsUrl = `https://www.google.com/maps?q=${n.coordinates.latitude},${n.coordinates.longitude}`;
                googleMapsButton = `<a href="${mapsUrl}" target="_blank" class="btn btn-sm btn-success ms-2" title="Abrir en Google Maps">
                    <i class="bi bi-geo-alt-fill"></i> Ver en Maps
                </a>`;
            }
            
            notificationDiv.innerHTML = `
                <div class="d-flex align-items-center flex-grow-1">
                    <span class="badge bg-secondary me-2">${(page - 1) * ITEMS_PER_PAGE + index + 1}</span>
                    <div class="flex-grow-1">
                        <strong>${new Date(n.timestamp).toLocaleString()}:</strong> ${n.message}
                        ${n.coordinates && n.coordinates.latitude && n.coordinates.longitude ? 
                            `<div class="mt-1"><small class="text-muted">Coordenadas: ${n.coordinates.latitude.toFixed(6)}, ${n.coordinates.longitude.toFixed(6)}</small></div>` : ''}
                    </div>
                </div>
                <div class="d-flex align-items-center">
                    ${googleMapsButton}
                    ${!n.read ? `<button class="btn btn-sm btn-outline-primary ms-2" onclick="markNotificationAsRead('${n.id}')">Marcar como leído</button>` : ''}
                </div>
            `;
            notificationsList.appendChild(notificationDiv);
        });
    }
    
    // Generar controles de paginación
    const existingPagination = notificationsContainer.querySelector('.pagination-container');
    if (existingPagination) {
        existingPagination.remove();
    }
    
    const paginationDiv = document.createElement('div');
    paginationDiv.id = 'admin-notifications-pagination';
    paginationDiv.className = 'pagination-container';
    notificationsContainer.appendChild(paginationDiv);
    
    generatePaginationControls(page, totalPages, 'admin-notifications-pagination', renderAdminNotifications);
    
    updateNotificationBadges();
}

function renderEmployeeNotifications(page = 1) {
    currentEmployeeNotificationsPage = page;
    const notificationsList = document.getElementById('employee-notifications-list');
    const notificationsContainer = notificationsList.closest('.card-body');
    notificationsList.innerHTML = '';
    if (!currentUser) return;

    const employeeNotifications = notifications.filter(n => n.userId === currentUser.id)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Solo mostrar notificaciones regulares (excluyendo respuestas de reportes)
    const regularNotifications = employeeNotifications.filter(n => !n.message.includes('ha respondido a tu reporte'));

    const totalPages = getTotalPages(regularNotifications.length);
    const paginatedNotifications = paginateArray(regularNotifications, page);

    if (paginatedNotifications.length === 0) {
        notificationsList.innerHTML = '<p>No hay notificaciones para ti.</p>';
    } else {
        paginatedNotifications.forEach((n, index) => {
            const globalIndex = (page - 1) * ITEMS_PER_PAGE + index + 1;
            
            const notificationDiv = document.createElement('div');
            notificationDiv.className = `alert ${n.read ? 'alert-light' : 'alert-info'} d-flex justify-content-between align-items-center`;
            notificationDiv.innerHTML = `
                <div class="d-flex align-items-center">
                    <span class="badge bg-secondary me-2">${globalIndex}</span>
                    <div>
                        <strong>${new Date(n.timestamp).toLocaleString()}:</strong> ${n.message}
                    </div>
                </div>
                ${!n.read ? `<button class="btn btn-sm btn-outline-primary" onclick="markNotificationAsRead('${n.id}')">Marcar como leído</button>` : ''}
            `;
            notificationsList.appendChild(notificationDiv);
        });
    }
    
    // Generar controles de paginación
    const existingPagination = notificationsContainer.querySelector('.pagination-container');
    if (existingPagination) {
        existingPagination.remove();
    }
    
    const paginationDiv = document.createElement('div');
    paginationDiv.id = 'employee-notifications-pagination';
    paginationDiv.className = 'pagination-container';
    notificationsContainer.appendChild(paginationDiv);
    
    generatePaginationControls(page, totalPages, 'employee-notifications-pagination', renderEmployeeNotifications);
    
    updateNotificationBadges();
}

function renderEmployeeReportReplies(page = 1) {
    currentEmployeeReportRepliesPage = page;
    const reportRepliesList = document.getElementById('employee-report-replies-list');
    const reportRepliesContainer = reportRepliesList.closest('.card-body');
    reportRepliesList.innerHTML = '';
    if (!currentUser) return;

    const employeeReportsWithReplies = reports.filter(r => r.reporterId === currentUser.id && r.replies && r.replies.length > 0);

    // Obtener todas las respuestas (leídas y no leídas), ordenadas por fecha (más recientes primero)
    let allReplies = [];
    let replyCounter = 0;

    employeeReportsWithReplies.forEach(report => {
        report.replies.forEach(reply => {
            allReplies.push({
                report: report,
                reply: reply,
                index: replyCounter++
            });
        });
    });
    
    // Ordenar por fecha (más recientes primero) y luego por estado de lectura (no leídas primero)
    allReplies.sort((a, b) => {
        // Primero ordenar por estado de lectura (no leídas primero)
        if (!a.reply.readForTechnician && b.reply.readForTechnician) return -1;
        if (a.reply.readForTechnician && !b.reply.readForTechnician) return 1;
        // Si tienen el mismo estado, ordenar por fecha (más recientes primero)
        return new Date(b.reply.timestamp) - new Date(a.reply.timestamp);
    });

    const totalPages = getTotalPages(allReplies.length);
    const paginatedReplies = paginateArray(allReplies, page);

    if (paginatedReplies.length === 0) {
        reportRepliesList.innerHTML = '<p>No hay respuestas a tus reportes.</p>';
    } else {
        paginatedReplies.forEach((item, index) => {
            const globalIndex = (page - 1) * ITEMS_PER_PAGE + index + 1;
            const { report, reply } = item;
            
            // Usar el mismo estilo que las notificaciones
            const isUnread = !reply.readForTechnician;
            const replyDiv = document.createElement('div');
            replyDiv.className = `alert ${isUnread ? 'alert-info' : 'alert-light'} d-flex justify-content-between align-items-center`;
            replyDiv.innerHTML = `
                <div class="d-flex align-items-center">
                    <span class="badge bg-secondary me-2">${globalIndex}</span>
                    <div>
                        <strong>${new Date(reply.timestamp).toLocaleString()}:</strong> Respuesta a Reporte ID ${report.id}: ${reply.message}
                    </div>
                </div>
                ${isUnread ? `<button class="btn btn-sm btn-outline-primary" onclick="markReportReplyAsRead('${report.id}', '${reply.timestamp}')">Marcar como leído</button>` : ''}
            `;
            reportRepliesList.appendChild(replyDiv);
        });
    }
    
    // Generar controles de paginación
    const existingPagination = reportRepliesContainer.querySelector('.pagination-container');
    if (existingPagination) {
        existingPagination.remove();
    }
    
    const paginationDiv = document.createElement('div');
    paginationDiv.id = 'employee-report-replies-pagination';
    paginationDiv.className = 'pagination-container';
    reportRepliesContainer.appendChild(paginationDiv);
    
    generatePaginationControls(page, totalPages, 'employee-report-replies-pagination', renderEmployeeReportReplies);
    
    updateNotificationBadges();
}

function markNotificationAsRead(id) {
    const notificationIndex = notifications.findIndex(n => n.id === id);
    if (notificationIndex !== -1) {
        notifications[notificationIndex].read = true;
        saveNotifications();
        updateNotificationBadges();
        if (currentUser && currentUser.role === 'admin') {
            renderAdminNotifications(1);
        } else if (currentUser && currentUser.role === 'employee') {
            renderEmployeeNotifications(1);
        }
    }
}

function markReportAsRead(reportId) {
    const report = reports.find(r => r.id === reportId);
    if (report) {
        report.readForAdmin = true;
        saveReports();
        renderReportsList(currentReportsPage);
        updateNotificationBadges();
    }
}

function markReportReplyAsRead(reportId, replyTimestamp) {
    const reportIndex = reports.findIndex(r => r.id === reportId);
    if (reportIndex !== -1) {
        const replyIndex = reports[reportIndex].replies.findIndex(reply => reply.timestamp === replyTimestamp);
        if (replyIndex !== -1) {
            reports[reportIndex].replies[replyIndex].readForTechnician = true;
            saveReports();
            updateNotificationBadges();
            renderEmployeeNotifications(1);
            renderEmployeeReportReplies(1);
        }
    }
}


// --- Notification Badges in Nav ---
function updateNotificationBadges() {
    const adminReportsTab = document.getElementById('admin-reports-tab');
    const adminNotificationsTab = document.getElementById('admin-notifications-tab');
    const employeeNotificationsTab = document.getElementById('employee-notifications-tab');

    if (currentUser && currentUser.role === 'admin') {
        const unreadReportsCount = reports.filter(r => !r.readForAdmin).length;

        const unreadAdminNotificationsCount = notifications.filter(n => n.userId === currentUser.id && !n.read).length;

        if (unreadReportsCount > 0) {
            adminReportsTab.innerHTML = `Reportes/Novedades <span class="badge bg-danger ms-1" style="display: inline-block; vertical-align: middle;">${unreadReportsCount}</span>`;
        } else {
            adminReportsTab.innerHTML = `Reportes/Novedades`;
        }

        if (unreadAdminNotificationsCount > 0) {
            adminNotificationsTab.innerHTML = `Notificaciones <span class="badge bg-danger ms-1" style="display: inline-block; vertical-align: middle;">${unreadAdminNotificationsCount}</span>`;
        } else {
            adminNotificationsTab.innerHTML = `Notificaciones`;
        }

    } else if (currentUser && currentUser.role === 'employee') {
        const unreadEmployeeNotificationsCount = notifications.filter(n => 
            n.userId === currentUser.id && 
            !n.read && 
            !n.message.includes('ha respondido a tu reporte')
        ).length;
        const unreadReportRepliesCount = reports.filter(r => r.reporterId === currentUser.id && r.replies.some(reply => !reply.readForTechnician)).length;

        // Actualizar badge de notificaciones
        if (unreadEmployeeNotificationsCount > 0) {
            employeeNotificationsTab.innerHTML = `Notificaciones <span class="badge bg-danger ms-1" style="display: inline-block; vertical-align: middle;">${unreadEmployeeNotificationsCount}</span>`;
        } else {
            employeeNotificationsTab.innerHTML = `Notificaciones`;
        }

        // Actualizar badge de respuestas de reportes
        const employeeReportRepliesTab = document.getElementById('employee-report-replies-tab');
        if (employeeReportRepliesTab) {
            if (unreadReportRepliesCount > 0) {
                employeeReportRepliesTab.innerHTML = `Respuestas de Reportes <span class="badge bg-success ms-1" style="display: inline-block; vertical-align: middle;">${unreadReportRepliesCount}</span>`;
            } else {
                employeeReportRepliesTab.innerHTML = `Respuestas de Reportes`;
            }
        }
    }
}

// --- Funciones de Exportación a Excel ---
function exportToExcel(data, filename) {
    if (!data || data.length === 0) {
        showAlert('No hay datos para exportar.');
        return;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Datos");
    XLSX.writeFile(wb, filename + '.xlsx');
}

function exportUsersToExcel() {
    // Excluimos la contraseña si no es deseado exportarla
    const usersToExport = users.map(({ password, ...rest }) => rest);
    exportToExcel(usersToExport, 'usuarios');
}

function exportServicesToExcel() {
    // Obtener los servicios filtrados actualmente
    const searchTerm = document.getElementById('search-services').value.toLowerCase();
    const dateFrom = document.getElementById('filter-date-from').value;
    const dateTo = document.getElementById('filter-date-to').value;

    let servicesToExport = services;

    // Aplicar los mismos filtros que en la vista
    if (searchTerm) {
        servicesToExport = servicesToExport.filter(service => {
            const serviceId = service.id.toLowerCase();
            const serviceCode = (service.serviceCode || '').toLowerCase();
            const clientName = service.clientName.toLowerCase();
            const safeType = service.safeType.toLowerCase();
            const technicianName = getTechnicianNameById(service.technicianId).toLowerCase();
            const status = service.status.toLowerCase();
            
            return serviceId.includes(searchTerm) ||
                   serviceCode.includes(searchTerm) ||
                   clientName.includes(searchTerm) ||
                   safeType.includes(searchTerm) ||
                   technicianName.includes(searchTerm) ||
                   status.includes(searchTerm);
        });
    }

    if (dateFrom) {
        servicesToExport = servicesToExport.filter(service => service.date >= dateFrom);
    }

    if (dateTo) {
        servicesToExport = servicesToExport.filter(service => service.date <= dateTo);
    }

    // Exportar TODA la información del servicio incluyendo código de servicio
    const servicesToExportFormatted = servicesToExport.map(service => {
        const technicianName = getTechnicianNameById(service.technicianId);
        return {
            'ID Servicio': service.id,
            'Código de Servicio': service.serviceCode || 'N/A',
            'Fecha': service.date,
            'Tipo de Servicio': service.safeType,
            'Descripción': service.description || 'N/A',
            'Ubicación': service.location,
            'Técnico Encargado': technicianName,
            'Nombre del Cliente': service.clientName,
            'Teléfono del Cliente': service.clientPhone,
            'Estado': service.status,
            'Motivo de Cancelación': service.cancellationReason || 'N/A',
            'Hora de Inicio': service.startTime ? new Date(service.startTime).toLocaleString() : 'N/A',
            'Ubicación de Inicio (Lat)': service.startLocation ? service.startLocation.latitude.toFixed(8) : 'N/A',
            'Ubicación de Inicio (Lon)': service.startLocation ? service.startLocation.longitude.toFixed(8) : 'N/A',
            'Precisión de Inicio (m)': service.startLocation && service.startLocation.accuracy ? Math.round(service.startLocation.accuracy) : 'N/A',
            'Altitud de Inicio (m)': service.startLocation && service.startLocation.altitude ? service.startLocation.altitude.toFixed(1) : 'N/A',
            'Velocidad de Inicio (m/s)': service.startLocation && service.startLocation.speed ? service.startLocation.speed.toFixed(1) : 'N/A',
            'Dirección de Inicio (°)': service.startLocation && service.startLocation.heading ? service.startLocation.heading.toFixed(1) : 'N/A',
            'Hora de Finalización/Cancelación': service.finalizationOrCancellationTime ? new Date(service.finalizationOrCancellationTime).toLocaleString() : 'N/A',
            'Ubicación de Finalización/Cancelación (Lat)': service.finalizationOrCancellationLocation ? service.finalizationOrCancellationLocation.latitude.toFixed(8) : 'N/A',
            'Ubicación de Finalización/Cancelación (Lon)': service.finalizationOrCancellationLocation ? service.finalizationOrCancellationLocation.longitude.toFixed(8) : 'N/A',
            'Precisión de Finalización (m)': service.finalizationOrCancellationLocation && service.finalizationOrCancellationLocation.accuracy ? Math.round(service.finalizationOrCancellationLocation.accuracy) : 'N/A',
            'Altitud de Finalización (m)': service.finalizationOrCancellationLocation && service.finalizationOrCancellationLocation.altitude ? service.finalizationOrCancellationLocation.altitude.toFixed(1) : 'N/A',
            'Velocidad de Finalización (m/s)': service.finalizationOrCancellationLocation && service.finalizationOrCancellationLocation.speed ? service.finalizationOrCancellationLocation.speed.toFixed(1) : 'N/A',
            'Dirección de Finalización (°)': service.finalizationOrCancellationLocation && service.finalizationOrCancellationLocation.heading ? service.finalizationOrCancellationLocation.heading.toFixed(1) : 'N/A'
        };
    });
    
    const filename = `servicios_${new Date().toISOString().split('T')[0]}`;
    exportToExcel(servicesToExportFormatted, filename);
}

// Funciones para el módulo de Costo Servicios
function renderCostoServiciosList(filteredCostoServicios = costoServicios, page = 1) {
    currentCostoServiciosPage = page;
    const costoServiciosList = document.getElementById('costo-servicios-list');
    const costoServiciosCards = document.getElementById('costo-servicios-cards');
    
    // Verificar que los elementos existan
    if (!costoServiciosList || !costoServiciosCards) {
        console.error('Elementos de tabla de costo servicios no encontrados');
        return;
    }
    
    costoServiciosList.innerHTML = '';
    costoServiciosCards.innerHTML = '';
    if (filteredCostoServicios.length === 0) {
        // Mensaje para tabla
        const noResultsRow = document.createElement('tr');
        noResultsRow.innerHTML = `
            <td colspan="7" class="text-center text-muted py-4" style="text-align: center !important; vertical-align: middle;">
                <i class="bi bi-currency-dollar" style="font-size: 2rem;"></i>
                <br><br>
                <strong>No hay servicios de costo registrados</strong>
            </td>
        `;
        costoServiciosList.appendChild(noResultsRow);
        
        // Mensaje para tarjetas móviles
        const noResultsCard = document.createElement('div');
        noResultsCard.className = 'text-center text-muted py-4';
        noResultsCard.innerHTML = `
            <i class="bi bi-currency-dollar" style="font-size: 2rem;"></i>
            <br><br>
            <strong>No hay servicios de costo registrados</strong>
        `;
        costoServiciosCards.appendChild(noResultsCard);
        
        // Eliminar paginación cuando la tabla está vacía
        const costoServiciosTable = document.getElementById('costo-servicios-list').closest('table');
        const paginationContainer = costoServiciosTable ? costoServiciosTable.closest('.card-body') : null;
        
        if (paginationContainer) {
            // Eliminar cualquier paginación existente
            const existingPagination = paginationContainer.querySelector('.pagination-container');
            if (existingPagination) {
                existingPagination.remove();
            }
            
            // Eliminar el elemento antiguo del HTML si existe
            const oldPagination = document.getElementById('costo-servicios-pagination');
            if (oldPagination) {
                oldPagination.remove();
            }
        }
    } else {
        // Aplicar paginación
        const totalPages = getTotalPages(filteredCostoServicios.length, ITEMS_PER_PAGE_COSTO_SERVICIOS);
        const paginatedServicios = paginateArray(filteredCostoServicios, page, ITEMS_PER_PAGE_COSTO_SERVICIOS);
        
        paginatedServicios.forEach((servicio, index) => {
            // Calcular número de fila global
            const rowNumber = (page - 1) * ITEMS_PER_PAGE_COSTO_SERVICIOS + index + 1;
            
            // Generar fila de tabla (vista desktop)
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${rowNumber}</td>
                <td>${servicio.codigo || 'N/A'}</td>
                <td>${servicio.fecha || 'N/A'}</td>
                <td>${servicio.tipo || 'N/A'}</td>
                <td>${servicio.descripcion || 'N/A'}</td>
                <td>$${(servicio.precio || 0).toLocaleString()}</td>
                <td>
                    <button class="btn btn-warning btn-sm me-1" onclick="editCostoServicio('${servicio.id}')" title="Editar servicio">
                        <i class="bi bi-pencil-fill"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteCostoServicio('${servicio.id}')" title="Eliminar servicio">
                        <i class="bi bi-trash-fill"></i>
                    </button>
                </td>
            `;
            costoServiciosList.appendChild(row);
            
            // Generar tarjeta móvil (vista móvil)
            const serviceCard = document.createElement('div');
            serviceCard.className = 'service-card';
            serviceCard.innerHTML = `
                <div class="service-card-header">
                    <span class="service-card-id">#${servicio.codigo || 'N/A'}</span>
                    <span class="service-card-status">$${(servicio.precio || 0).toLocaleString()}</span>
                </div>
                <div class="service-card-info">
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Fecha:</span>
                        <span class="service-card-info-value">${servicio.fecha || 'N/A'}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Tipo Servicio:</span>
                        <span class="service-card-info-value">${servicio.tipo || 'N/A'}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Descripción:</span>
                        <span class="service-card-info-value">${servicio.descripcion || 'N/A'}</span>
                    </div>
                </div>
                <div class="service-card-actions">
                    <button class="btn btn-warning btn-sm me-1" onclick="editCostoServicio('${servicio.id}')" title="Editar">
                        <i class="bi bi-pencil-fill"></i> Editar
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteCostoServicio('${servicio.id}')" title="Eliminar">
                        <i class="bi bi-trash-fill"></i> Eliminar
                    </button>
                </div>
            `;
            costoServiciosCards.appendChild(serviceCard);
        });
        
        // Generar controles de paginación
        const costoServiciosTable = document.getElementById('costo-servicios-list').closest('table');
        const paginationContainer = costoServiciosTable ? costoServiciosTable.closest('.card-body') : null;
        
        if (paginationContainer) {
            // Eliminar cualquier paginación existente
            const existingPagination = paginationContainer.querySelector('.pagination-container');
            if (existingPagination) {
                existingPagination.remove();
            }
            
            // Eliminar el elemento antiguo del HTML si existe
            const oldPagination = document.getElementById('costo-servicios-pagination');
            if (oldPagination) {
                oldPagination.remove();
            }
            
            const paginationDiv = document.createElement('div');
            paginationDiv.id = 'costo-servicios-pagination';
            paginationDiv.className = 'pagination-container';
            paginationContainer.appendChild(paginationDiv);
            
            generatePaginationControls(
                page,
                totalPages,
                'costo-servicios-pagination',
                (newPage) => {
                    renderCostoServiciosList(filteredCostoServicios, newPage);
                }
            );
        }
    }
}

function filterCostoServicios() {
    const searchTerm = document.getElementById('search-costo-servicios').value.toLowerCase();
    const dateFromInput = document.getElementById('filter-costo-servicio-date-from');
    const dateToInput = document.getElementById('filter-costo-servicio-date-to');
    
    // Obtener valores y convertir formato de fecha si es necesario
    let dateFrom = dateFromInput.value;
    let dateTo = dateToInput.value;
    
    // Convertir formato dd/mm/aaaa a aaaa-mm-dd si es necesario
    if (dateFrom && dateFrom.includes('/')) {
        const parts = dateFrom.split('/');
        if (parts.length === 3) {
            dateFrom = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
    }
    if (dateTo && dateTo.includes('/')) {
        const parts = dateTo.split('/');
        if (parts.length === 3) {
            dateTo = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
    }

    let filtered = costoServicios;

    // Filtrar por término de búsqueda
    if (searchTerm) {
        filtered = filtered.filter(servicio => {
            const codigo = (servicio.codigo || '').toLowerCase();
            const tipo = (servicio.tipo || '').toLowerCase();
            const descripcion = (servicio.descripcion || '').toLowerCase();
            const precio = (servicio.precio || 0).toString().toLowerCase();
            const fecha = (servicio.fecha || '').toLowerCase();
            
            return codigo.includes(searchTerm) ||
                   tipo.includes(searchTerm) ||
                   descripcion.includes(searchTerm) ||
                   precio.includes(searchTerm) ||
                   fecha.includes(searchTerm);
        });
    }

    // Filtrar por fecha desde
    if (dateFrom) {
        filtered = filtered.filter(servicio => {
            const servicioFecha = servicio.fecha || '';
            return servicioFecha >= dateFrom;
        });
    }

    // Filtrar por fecha hasta
    if (dateTo) {
        filtered = filtered.filter(servicio => {
            const servicioFecha = servicio.fecha || '';
            return servicioFecha <= dateTo;
        });
    }

    // Resetear a página 1 cuando se filtran los resultados
    renderCostoServiciosList(filtered, 1);
}

function clearCostoServiciosFilters() {
    document.getElementById('search-costo-servicios').value = '';
    document.getElementById('filter-costo-servicio-date-from').value = '';
    document.getElementById('filter-costo-servicio-date-to').value = '';
    filterCostoServicios();
}

function editCostoServicio(id) {
    // Recargar datos desde localStorage para asegurar que estén actualizados
    costoServicios = JSON.parse(localStorage.getItem('costoServicios')) || [];
    // Asegurar que costoServicios esté cargado
    if (!costoServicios || costoServicios.length === 0) {
        showAlert('Error: No hay datos de servicios disponibles');
        return;
    }
    
    const servicio = costoServicios.find(s => s.id === id);
    if (servicio) {
        // Cargar datos en el formulario ANTES de abrir el modal
        forceLoadDataInModal(servicio);
        
        // Abrir el modal
        const modal = new bootstrap.Modal(document.getElementById('createCostoServicioModal'));
        modal.show();
    } else {
        showAlert('Error: No se encontró el servicio a editar');
    }
}

function deleteCostoServicio(id) {
    showConfirm('¿Estás seguro de que deseas eliminar este servicio?', (confirmed) => {
        if (confirmed) {
            costoServicios = costoServicios.filter(s => s.id !== id);
            saveCostoServicios();
            // Recalcular página actual si es necesario
            const totalItems = costoServicios.length;
            const maxPage = Math.ceil(totalItems / ITEMS_PER_PAGE_COSTO_SERVICIOS);
            const pageToShow = currentCostoServiciosPage > maxPage && maxPage > 0 ? maxPage : currentCostoServiciosPage;
            renderCostoServiciosList(costoServicios, pageToShow);
        }
    });
}

// Funciones para eliminar costos de servicios masivamente
function openDeleteCostoServiciosModal() {
    const modal = new bootstrap.Modal(document.getElementById('deleteCostoServiciosModal'));
    const deleteCostoServiciosList = document.getElementById('delete-costo-servicios-list');
    const searchInput = document.getElementById('search-delete-costo-servicios');
    if (searchInput) searchInput.value = '';
    deleteCostoServiciosList.innerHTML = '';
    
    // Mostrar todos los costos de servicios con checkboxes
    costoServicios.forEach(servicio => {
        const servicioCard = document.createElement('div');
        servicioCard.className = 'card mb-2';
        servicioCard.style.border = '1px solid #dee2e6';
        servicioCard.innerHTML = `
            <div class="card-body d-flex align-items-center">
                <input type="checkbox" class="form-check-input me-3" value="${servicio.id}" id="costo-servicio-checkbox-${servicio.id}" style="width: 20px; height: 20px;">
                <div class="flex-grow-1">
                    <strong>Código: ${servicio.codigo || 'N/A'}</strong>
                    <div class="text-muted">Tipo: ${servicio.tipo || 'N/A'}</div>
                    <div class="text-muted">Descripción: ${servicio.descripcion || 'N/A'}</div>
                    <div class="text-muted">Precio: $${(servicio.precio || 0).toLocaleString()}</div>
                </div>
            </div>
        `;
        deleteCostoServiciosList.appendChild(servicioCard);
    });
    
    modal.show();
}

function selectAllCostoServicios() {
    const checkboxes = document.querySelectorAll('#delete-costo-servicios-list input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
    });
}

function deselectAllCostoServicios() {
    const checkboxes = document.querySelectorAll('#delete-costo-servicios-list input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
}

function confirmDeleteCostoServicios() {
    const checkboxes = document.querySelectorAll('#delete-costo-servicios-list input[type="checkbox"]:checked');
    const selectedIds = Array.from(checkboxes).map(cb => cb.value);
    
    if (selectedIds.length === 0) {
        showAlert('Por favor, selecciona al menos un costo de servicio para eliminar.');
        return;
    }
    
    showConfirm(`¿Estás seguro de que quieres eliminar ${selectedIds.length} costo(s) de servicio(s)? Esta acción no se puede deshacer.`, (result) => {
        if (result) {
            // Cerrar modal de selección
            const modal = bootstrap.Modal.getInstance(document.getElementById('deleteCostoServiciosModal'));
            modal.hide();
            
            // Inicializar modal de progreso
            initProgressModal('delete', selectedIds.length);
            
            let processed = 0;
            let successes = 0;
            let errors = 0;
            
            // Función para eliminar cada costo de servicio de forma asíncrona
            function deleteCostoServicio(index) {
                if (index >= selectedIds.length) {
                    // Eliminación completada
                    saveCostoServicios();
                    
                    // Recalcular página actual si es necesario
                    const totalItems = costoServicios.length;
                    const maxPage = Math.ceil(totalItems / ITEMS_PER_PAGE_COSTO_SERVICIOS);
                    const pageToShow = totalItems === 0 ? 1 : (currentCostoServiciosPage > maxPage && maxPage > 0 ? maxPage : currentCostoServiciosPage);
                    renderCostoServiciosList(costoServicios, pageToShow);
                    
                    completeProgress('delete', successes, 
                        `Eliminación completada. ${successes} registro(s) eliminado(s).`, 
                        successes, 0, errors);
                    return;
                }
                
                const servicioId = selectedIds[index];
                const initialLength = costoServicios.length;
                costoServicios = costoServicios.filter(s => s.id !== servicioId);
                
                if (costoServicios.length < initialLength) {
                    successes++;
                } else {
                    errors++;
                }
                
                processed++;
                updateProgress(processed, selectedIds.length, 
                    `Eliminando registro ${processed} de ${selectedIds.length}...`, 
                    successes, 0, errors);
                
                // Procesar siguiente costo de servicio con pequeño delay
                setTimeout(() => deleteCostoServicio(index + 1), 10);
            }
            
            // Iniciar eliminación
            deleteCostoServicio(0);
        }
    });
}

function exportCostoServiciosToExcel() {
    const data = costoServicios.map(servicio => ({
        'Código Servicio': servicio.codigo,
        'Tipo de Servicio': servicio.tipo,
        'Descripción': servicio.descripcion,
        'Precio': servicio.precio
    }));

    exportToExcel(data, 'costo_servicios_consegur');
}

function importCostoServiciosFromExcel() {
    document.getElementById('import-costo-servicios-file').click();
}

function importServicesFromExcel() {
    document.getElementById('import-services-file').click();
}

// Función para convertir fecha de formato dd/mm/yyyy a formato YYYY-MM-DD
function convertDateToISO(dateString) {
    if (!dateString) return '';
    
    // Si ya está en formato ISO (YYYY-MM-DD), devolverla
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
    }
    
    // Si está en formato dd/mm/yyyy, convertirla
    if (typeof dateString === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
        const [day, month, year] = dateString.split('/');
        return `${year}-${month}-${day}`;
    }
    
    // Intentar parsear como fecha
    try {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    } catch (e) {
        // Si hay error, devolver string vacío
    }
    
    return '';
}

// Función para convertir fecha serial de Excel a formato YYYY-MM-DD
function convertExcelDateToISO(excelDate) {
    // Si ya es una fecha válida en formato string ISO, la devolvemos
    if (typeof excelDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(excelDate)) {
        return excelDate;
    }
    
    // Si es un string en formato de fecha, detectar el formato
    if (typeof excelDate === 'string') {
        // Formato mm/dd/yyyy o dd/mm/yyyy
        const mmddyyyyMatch = excelDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (mmddyyyyMatch) {
            const firstPart = parseInt(mmddyyyyMatch[1], 10);
            const secondPart = parseInt(mmddyyyyMatch[2], 10);
            const year = mmddyyyyMatch[3];
            
            // Si el primer número es <= 12 y el segundo es > 12, es formato mm/dd/yyyy
            // Si ambos son <= 12, asumimos mm/dd/yyyy (formato común en Excel)
            // Si el primer número es > 12, es formato dd/mm/yyyy
            let month, day;
            if (firstPart > 12) {
                // Es formato dd/mm/yyyy
                day = String(firstPart).padStart(2, '0');
                month = String(secondPart).padStart(2, '0');
            } else if (secondPart > 12) {
                // Es formato mm/dd/yyyy
                month = String(firstPart).padStart(2, '0');
                day = String(secondPart).padStart(2, '0');
            } else {
                // Ambos son <= 12, asumimos mm/dd/yyyy (formato estándar de Excel)
                month = String(firstPart).padStart(2, '0');
                day = String(secondPart).padStart(2, '0');
            }
            
            // Validar que el mes y día sean válidos
            const monthNum = parseInt(month, 10);
            const dayNum = parseInt(day, 10);
            if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
                return `${year}-${month}-${day}`;
            }
        }
        
        // Formato dd/mm/yyyy (ya manejado anteriormente)
        const ddmmyyyyMatch = excelDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (ddmmyyyyMatch) {
            const [day, month, year] = ddmmyyyyMatch.slice(1);
            const dayNum = parseInt(day, 10);
            const monthNum = parseInt(month, 10);
            
            if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12) {
                return `${year}-${month}-${day}`;
            }
        }
    }
    
    // Si es un número (fecha serial de Excel), la convertimos
    if (typeof excelDate === 'number') {
        // Excel cuenta los días desde el 1 de enero de 1900
        // Pero Excel tiene un bug: considera 1900 como año bisiesto cuando no lo es
        // Por eso restamos 2 días para corregir
        const excelEpoch = new Date(1900, 0, 1);
        const date = new Date(excelEpoch.getTime() + (excelDate - 2) * 24 * 60 * 60 * 1000);
        
        // Formatear a YYYY-MM-DD usando UTC para evitar problemas de zona horaria
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }
    
    // Si es un objeto Date, lo convertimos usando UTC
    if (excelDate instanceof Date) {
        const year = excelDate.getUTCFullYear();
        const month = String(excelDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(excelDate.getUTCDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }
    
    // Si no podemos convertir, devolvemos el valor original
    return excelDate;
}

function handleServicesImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            if (jsonData.length === 0) {
                showAlert('El archivo Excel está vacío o no contiene datos válidos.');
                event.target.value = '';
                return;
            }

            // Inicializar modal de progreso
            initProgressModal('import', jsonData.length);

            let importedCount = 0;
            let errors = [];
            let warnings = [];
            let processed = 0;

            // Función para procesar cada fila de forma asíncrona
            function processRow(index) {
                if (index >= jsonData.length) {
                    // Procesamiento completado
                    saveServices();
                    renderAdminServicesList();
                    updateServicesStatistics();
                    
                    let finalMessage = `Importación completada. ${importedCount} registro(s) importado(s) exitosamente.`;
                    if (warnings.length > 0) {
                        finalMessage += ` ${warnings.length} advertencia(s) encontrada(s).`;
                    }
                    if (errors.length > 0) {
                        finalMessage += ` ${errors.length} error(es) encontrado(s).`;
                    }
                    
                    completeProgress('import', importedCount, finalMessage, importedCount, warnings.length, errors.length);
                    event.target.value = '';
                    return;
                }

                const row = jsonData[index];
                try {
                    // Validar campos obligatorios (aceptar mayúsculas y minúsculas)
                    const fechaRaw = row['Fecha'] || row['FECHA'];
                    const nombreCliente = row['Nombre del Cliente'] || row['NOMBRE DEL CLIENTE'];
                    const codigoServicio = row['Código de Servicio'] || row['CODIGO DE SERVICIO'];
                    
                    if (!fechaRaw) {
                        errors.push(`Fila ${index + 2}: Falta campo obligatorio 'Fecha' o 'FECHA'`);
                    } else if (!nombreCliente) {
                        errors.push(`Fila ${index + 2}: Falta campo obligatorio 'Nombre del Cliente' o 'NOMBRE DEL CLIENTE'`);
                    } else if (!codigoServicio) {
                        errors.push(`Fila ${index + 2}: Falta campo obligatorio 'Código de Servicio' o 'CODIGO DE SERVICIO'`);
                    } else {
                        // Convertir la fecha de Excel a formato ISO
                        const fecha = convertExcelDateToISO(fechaRaw);
                        // Buscar el tipo de servicio y descripción basado en el código
                        const costoServicio = costoServicios.find(cs => cs.codigo === codigoServicio);
                        if (!costoServicio) {
                            warnings.push(`Fila ${index + 2}: Código de servicio '${codigoServicio}' no encontrado en Costo Servicios`);
                        }
                        
                        const safeType = costoServicio ? costoServicio.tipo : (row['Tipo de Servicio'] || row['TIPO DE SERVICIO'] || '');
                        const description = costoServicio ? costoServicio.descripcion : (row['Descripción'] || row['DESCRIPCION'] || '');

                        // Obtener el consecutivo del cliente para generar el ID
                        const clientConsecutive = getClientConsecutiveByName(nombreCliente);
                        
                        // Buscar el cliente por nombre para obtener su información
                        const client = clients.find(c => c.name.toLowerCase() === nombreCliente.toLowerCase());
                        
                        // Usar la dirección del cliente si existe, sino usar la del Excel, sino dejar vacío
                        const location = client && client.address 
                            ? client.address 
                            : (row['Ubicación'] || row['UBICACIÓN'] || row['Dirección'] || row['DIRECCIÓN'] || row['Dirección del Cliente'] || row['DIRECCIÓN DEL CLIENTE'] || row['Ubicación del Cliente'] || row['UBICACIÓN DEL CLIENTE'] || '');
                        
                        // Obtener hora de servicio del Excel
                        const horaRaw = row['Hora'] || row['HORA'] || row['Hora de Servicio'] || row['HORA DE SERVICIO'] || row['Hora Servicio'] || row['HORA SERVICIO'] || '';
                        // Convertir hora de Excel (puede ser decimal) a formato de hora de 12 horas
                        let horaServicio = convertExcelTimeToHourFormat(horaRaw);
                        // Si no se pudo convertir con convertExcelTimeToHourFormat, intentar con convertTo12HourFormat
                        if (!horaServicio && horaRaw) {
                            horaServicio = convertTo12HourFormat(horaRaw);
                        }
                        // Asegurar que sea string y esté en formato de 12 horas
                        horaServicio = String(horaServicio || '').trim();
                        
                        // Obtener NIT/CC del Excel o del cliente
                        const clientNit = row['NIT/CC'] || row['NIT'] || row['CC'] || row['NIT O CC'] || row['NIT O CC'] || (client ? client.nit : '') || '';
                        
                        // Obtener EMAIL del Excel o del cliente
                        const clientEmail = row['Email'] || row['EMAIL'] || row['email'] || row['Email del Cliente'] || row['EMAIL DEL CLIENTE'] || (client ? client.email : '') || '';
                        
                        const newService = {
                            id: generateServiceId(clientConsecutive),
                            date: fecha,
                            time: horaServicio,
                            clientName: nombreCliente,
                            serviceCode: codigoServicio,
                            safeType: safeType,
                            description: description,
                            location: location,
                            clientPhone: row['Teléfono del Cliente'] || row['TELEFONO DEL CLIENTE'] || (client ? client.phone : '') || '',
                            clientNit: clientNit,
                            clientEmail: clientEmail,
                            status: row['Estado'] || row['ESTADO'] || 'Pendiente',
                            technicianId: '',
                            startTime: '',
                            finalizationOrCancellationTime: '',
                            startLocation: null,
                            finalizationOrCancellationLocation: null,
                            photoData: '',
                            technicianSignature: '',
                            clientSignature: '',
                            cancellationReason: ''
                        };
                        
                        services.push(newService);
                        importedCount++;
                    }
                } catch (rowError) {
                    errors.push(`Fila ${index + 2}: Error al procesar - ${rowError.message}`);
                }

                processed++;
                updateProgress(processed, jsonData.length, 
                    `Procesando registro ${processed} de ${jsonData.length}...`, 
                    importedCount, warnings.length, errors.length);
                
                // Procesar siguiente fila con pequeño delay
                setTimeout(() => processRow(index + 1), 10);
            }

            // Iniciar procesamiento
            processRow(0);
            
        } catch (error) {
            closeProgressModal();
            showAlert(`Error al importar el archivo: ${error.message}\n\nEstructura esperada:\n- Fecha (o FECHA) [Obligatorio]\n- Nombre del Cliente (o NOMBRE DEL CLIENTE) [Obligatorio]\n- Código de Servicio (o CODIGO DE SERVICIO) [Obligatorio]\n- Hora (o HORA o Hora de Servicio) [Opcional]\n- Ubicación/Dirección (o UBICACIÓN/DIRECCIÓN o Dirección del Cliente) [Opcional]\n- Teléfono del Cliente (o TELEFONO DEL CLIENTE) [Opcional]\n- NIT/CC (o NIT o CC) [Opcional]\n- Email (o EMAIL o Email del Cliente) [Opcional]\n- Estado (o ESTADO) [Opcional, por defecto: Pendiente]\n\nEl sistema ahora acepta tanto mayúsculas como minúsculas.`);
            event.target.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
}

function handleCostoServiciosImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            if (jsonData.length === 0) {
                showAlert('El archivo Excel está vacío o no contiene datos válidos.');
                event.target.value = '';
                return;
            }

            // Inicializar modal de progreso
            initProgressModal('import', jsonData.length);

            let importedCount = 0;
            let errors = [];
            let warnings = [];
            let processed = 0;

            // Función para procesar cada fila de forma asíncrona
            function processRow(index) {
                if (index >= jsonData.length) {
                    // Procesamiento completado
                    saveCostoServicios();
                    renderCostoServiciosList(costoServicios, 1);
                    populateServiceCodes();

                    let finalMessage = `Importación completada. ${importedCount} registro(s) importado(s) exitosamente.`;
                    if (warnings.length > 0) {
                        finalMessage += ` ${warnings.length} advertencia(s) encontrada(s).`;
                    }
                    if (errors.length > 0) {
                        finalMessage += ` ${errors.length} error(es) encontrado(s).`;
                    }

                    completeProgress('import', importedCount, finalMessage, importedCount, warnings.length, errors.length);
                    event.target.value = '';
                    return;
                }

                const row = jsonData[index];
                try {
                    // Validar campos obligatorios (aceptar mayúsculas y minúsculas)
                    const codigo = row['Código'] || row['CODIGO'] || row['Código de Servicio'] || row['CODIGO DE SERVICIO'] || row['Código Servicio'] || row['CODIGO SERVICIO'];
                    const tipoServicio = row['Tipo de Servicio'] || row['TIPO DE SERVICIO'] || row['Tipo'] || row['TIPO'];
                    const descripcion = row['Descripción'] || row['DESCRIPCION'] || row['Descripcion'];
                    const precioRaw = row['Precio'] || row['PRECIO'];
                    const fechaRaw = row['Fecha'] || row['FECHA'] || row['Fecha de Creación'] || row['FECHA DE CREACIÓN'] || row['Fecha Creación'] || row['FECHA CREACIÓN'];
                    
                    if (!codigo) {
                        errors.push(`Fila ${index + 2}: Falta campo obligatorio 'Código'`);
                    } else if (!tipoServicio) {
                        errors.push(`Fila ${index + 2}: Falta campo obligatorio 'Tipo de Servicio'`);
                    } else if (!descripcion) {
                        errors.push(`Fila ${index + 2}: Falta campo obligatorio 'Descripción'`);
                    } else if (!precioRaw) {
                        errors.push(`Fila ${index + 2}: Falta campo obligatorio 'Precio'`);
                    } else {
                        // Convertir precio a número
                        const precio = parseFloat(precioRaw);
                        if (isNaN(precio) || precio < 0) {
                            errors.push(`Fila ${index + 2}: El precio debe ser un número válido mayor o igual a 0`);
                        } else {
                            // Usar código del Excel o generar uno si no viene
                            const codigoFinal = codigo ? codigo.toString().trim() : generateCostoServicioCode();
                            
                            // Procesar fecha: usar la del Excel si viene, sino usar la fecha actual
                            let fechaFinal;
                            if (fechaRaw) {
                                // Intentar convertir la fecha del Excel
                                fechaFinal = convertExcelDateToISO(fechaRaw);
                                if (!fechaFinal) {
                                    // Si no se puede convertir, usar la fecha actual
                                    fechaFinal = new Date().toISOString().split('T')[0];
                                }
                            } else {
                                // Si no viene fecha, usar la fecha actual
                                fechaFinal = new Date().toISOString().split('T')[0];
                            }

                            const newServicio = {
                                id: generateId(),
                                codigo: codigoFinal,
                                fecha: fechaFinal,
                                tipo: tipoServicio.toString().trim(),
                                descripcion: descripcion.toString().trim(),
                                precio: precio
                            };
                            
                            // Verificar si ya existe un servicio con el mismo código
                            const existingIndex = costoServicios.findIndex(s => s.codigo === newServicio.codigo);
                            if (existingIndex >= 0) {
                                costoServicios[existingIndex] = newServicio;
                                warnings.push(`Fila ${index + 2}: Servicio con código '${newServicio.codigo}' actualizado`);
                            } else {
                                costoServicios.push(newServicio);
                            }
                            importedCount++;
                        }
                    }
                } catch (rowError) {
                    errors.push(`Fila ${index + 2}: Error al procesar datos`);
                }

                processed++;
                updateProgress(processed, jsonData.length, 
                    `Procesando registro ${processed} de ${jsonData.length}...`, 
                    importedCount, warnings.length, errors.length);
                
                // Procesar siguiente fila con pequeño delay
                setTimeout(() => processRow(index + 1), 10);
            }

            // Iniciar procesamiento
            processRow(0);
            
        } catch (error) {
            closeProgressModal();
            showAlert('Error al importar el archivo. Verifica que el formato sea correcto y que el archivo no esté corrupto.');
            event.target.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
}

// Funciones para el módulo de Remisiones
function renderRemisionesList(filteredRemisiones = remisiones) {
    const remisionesList = document.getElementById('remisiones-list');
    const remisionesCards = document.getElementById('remisiones-cards');
    
    // Verificar que los elementos existan
    if (!remisionesList || !remisionesCards) {
        console.error('Elementos de tabla de remisiones no encontrados');
        return;
    }
    
    remisionesList.innerHTML = '';
    remisionesCards.innerHTML = '';
    
    if (filteredRemisiones.length === 0) {
        // Mensaje para tabla
        const noResultsRow = document.createElement('tr');
        noResultsRow.innerHTML = `
            <td colspan="11" class="text-center text-muted py-4" style="text-align: center !important; vertical-align: middle;">
                <i class="bi bi-file-earmark-text" style="font-size: 2rem;"></i>
                <br><br>
                <strong>No hay remisiones registradas</strong>
            </td>
        `;
        remisionesList.appendChild(noResultsRow);
        
        // Mensaje para tarjetas móviles
        const noResultsCard = document.createElement('div');
        noResultsCard.className = 'text-center text-muted py-4';
        noResultsCard.innerHTML = `
            <i class="bi bi-file-earmark-text" style="font-size: 2rem;"></i>
            <br><br>
            <strong>No hay remisiones registradas</strong>
        `;
        remisionesCards.appendChild(noResultsCard);
    } else {
        filteredRemisiones.forEach((remision, index) => {
            // Obtener el servicio asociado
            const service = remision.serviceId ? services.find(s => s.id === remision.serviceId) : null;
            
            // Formatear fecha de remisión
            let fechaRemision = remision.fechaRemision || remision.fecha || '';
            let horaRemision = remision.horaRemision || '';
            
            // Si no hay fecha de remisión, usar la fecha actual
            if (!fechaRemision) {
                const now = new Date();
                fechaRemision = now.toISOString().split('T')[0];
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                const seconds = String(now.getSeconds()).padStart(2, '0');
                const ampm = now.getHours() >= 12 ? 'p. m.' : 'a. m.';
                const hours12 = now.getHours() % 12 || 12;
                horaRemision = `${hours12}:${minutes}:${seconds} ${ampm}`;
            } else {
                // Formatear fecha como dd/mm/aaaa
                if (fechaRemision.includes('-')) {
                    const [year, month, day] = fechaRemision.split('-');
                    fechaRemision = `${day}/${month}/${year}`;
                }
                
                // Si no hay hora, intentar obtenerla del servicio o usar hora actual
                if (!horaRemision) {
                    if (service && service.startTime) {
                        horaRemision = service.startTime;
                    } else {
                        const now = new Date();
                        const hours = String(now.getHours()).padStart(2, '0');
                        const minutes = String(now.getMinutes()).padStart(2, '0');
                        const seconds = String(now.getSeconds()).padStart(2, '0');
                        const ampm = now.getHours() >= 12 ? 'p. m.' : 'a. m.';
                        const hours12 = now.getHours() % 12 || 12;
                        horaRemision = `${hours12}:${minutes}:${seconds} ${ampm}`;
                    }
                }
            }
            
            // Formatear fecha de servicio
            let fechaServicio = service ? service.date : remision.fecha || '';
            if (fechaServicio && fechaServicio.includes('-')) {
                const [year, month, day] = fechaServicio.split('-');
                fechaServicio = `${day}/${month}/${year}`;
            }
            
            // Calcular el precio total real (suma de todos los servicios)
            let precioTotal = 0;
            
            // Calcular precio del servicio principal
            if (service) {
                const codigoServicio = remision.codigoServicio || service.serviceCode || '';
                const costoServicio = costoServicios.find(cs => cs.codigo === codigoServicio);
                const precioUnitario = costoServicio ? costoServicio.precio : 0;
                const cantidad = service.quantity || 1;
                precioTotal += cantidad * precioUnitario;
                
                // Sumar servicios adicionales
                if (service.additionalServices && Array.isArray(service.additionalServices)) {
                    service.additionalServices.forEach(additionalService => {
                        // Los servicios adicionales se guardan con: code, type, description, quantity
                        // Pero también pueden tener: serviceCode (para compatibilidad)
                        const codigoAdicional = additionalService.code || additionalService.serviceCode || '';
                        const costoServicioAdicional = costoServicios.find(cs => cs.codigo === codigoAdicional);
                        const precioUnitarioAdicional = costoServicioAdicional ? costoServicioAdicional.precio : 0;
                        const cantidadAdicional = additionalService.quantity || 1;
                        precioTotal += cantidadAdicional * precioUnitarioAdicional;
                    });
                }
            } else {
                // Si no hay servicio asociado, usar el precio guardado en la remisión
                precioTotal = remision.precio || 0;
            }
            
            // Generar fila de tabla (vista desktop)
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="text-align: center;">${index + 1}</td>
                <td>${remision.id}</td>
                <td>${fechaRemision}</td>
                <td>${horaRemision}</td>
                <td>${remision.serviceId || '-'}</td>
                <td>${fechaServicio || '-'}</td>
                <td>${remision.codigoServicio || '-'}</td>
                <td>${remision.cliente || '-'}</td>
                <td>${getTechnicianNameById(remision.tecnicoId) || '-'}</td>
                <td>$${precioTotal.toLocaleString()}</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="downloadRemisionPDF('${remision.id}')" title="Ver/Descargar PDF" style="display: block; width: 100%; margin-bottom: 0.25rem;">
                        <i class="bi bi-file-earmark-pdf"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteRemision('${remision.id}')" title="Eliminar" style="display: block; width: 100%;">
                        <i class="bi bi-trash-fill"></i>
                    </button>
                </td>
            `;
            remisionesList.appendChild(row);
            
            // Generar tarjeta móvil (vista móvil)
            const serviceCard = document.createElement('div');
            serviceCard.className = 'service-card';
            serviceCard.innerHTML = `
                <div class="service-card-header">
                    <span class="service-card-id">#${remision.id}</span>
                    <span class="service-card-status">$${precioTotal.toLocaleString()}</span>
                </div>
                <div class="service-card-info">
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Fecha Remisión:</span>
                        <span class="service-card-info-value">${fechaRemision}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Hora Remisión:</span>
                        <span class="service-card-info-value">${horaRemision}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">ID Servicio:</span>
                        <span class="service-card-info-value">${remision.serviceId || '-'}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Fecha Servicio:</span>
                        <span class="service-card-info-value">${fechaServicio || '-'}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Cliente:</span>
                        <span class="service-card-info-value">${remision.cliente || '-'}</span>
                    </div>
                    <div class="service-card-info-item">
                        <span class="service-card-info-label">Técnico:</span>
                        <span class="service-card-info-value">${getTechnicianNameById(remision.tecnicoId) || '-'}</span>
                    </div>
                </div>
                <div class="service-card-actions">
                    <button class="btn btn-primary btn-sm me-1" onclick="downloadRemisionPDF('${remision.id}')" title="Ver/Descargar PDF">
                        <i class="bi bi-file-earmark-pdf"></i> Ver
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteRemision('${remision.id}')" title="Eliminar">
                        <i class="bi bi-trash-fill"></i> Eliminar
                    </button>
                </div>
            `;
            remisionesCards.appendChild(serviceCard);
        });
    }
}

function generateRemisionFromService() {
    const modal = new bootstrap.Modal(document.getElementById('generateRemisionModal'));
    
    // Cargar servicios disponibles
    loadRemisionServices();
    
    // Configurar búsqueda
    setupRemisionServiceSearch();
    
    modal.show();
}

function loadRemisionServices(filteredServices = null) {
    const remisionServiceSelect = document.getElementById('remision-service-id');
    remisionServiceSelect.innerHTML = '<option value="">Seleccionar servicio...</option>';
    
    const servicesToShow = filteredServices || services.filter(service => service.status === 'Finalizado');
    
    servicesToShow.forEach(service => {
        const option = document.createElement('option');
        option.value = service.id;
        option.textContent = `${service.id} - ${service.clientName} - ${service.safeType}`;
        remisionServiceSelect.appendChild(option);
    });
}

function setupRemisionServiceSearch() {
    const searchInput = document.getElementById('remision-service-search');
    const remisionServiceSelect = document.getElementById('remision-service-id');
    const resultsElement = document.getElementById('remision-search-results');
    
    // Limpiar búsqueda al abrir el modal
    searchInput.value = '';
    const allFinalizedServices = services.filter(service => service.status === 'Finalizado');
    resultsElement.innerHTML = `<span class="text-muted">${allFinalizedServices.length} servicios finalizados disponibles</span>`;
    
    // Limpiar búsqueda cuando se cierre el modal
    const modal = document.getElementById('generateRemisionModal');
    modal.addEventListener('hidden.bs.modal', function() {
        searchInput.value = '';
        const allFinalizedServices = services.filter(service => service.status === 'Finalizado');
        resultsElement.innerHTML = `<span class="text-muted">${allFinalizedServices.length} servicios finalizados disponibles</span>`;
        remisionServiceSelect.value = '';
        loadRemisionServices(); // Cargar todos los servicios finalizados
    });
    
    // Botón para limpiar búsqueda
    const clearButton = document.getElementById('clear-remision-search');
    clearButton.addEventListener('click', function() {
        searchInput.value = '';
        const allFinalizedServices = services.filter(service => service.status === 'Finalizado');
        resultsElement.innerHTML = `<span class="text-muted">${allFinalizedServices.length} servicios finalizados disponibles</span>`;
        remisionServiceSelect.value = '';
        loadRemisionServices(); // Cargar todos los servicios finalizados
        searchInput.focus();
    });
    
    // Event listener para búsqueda en tiempo real
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        const resultsElement = document.getElementById('remision-search-results');
        
        if (searchTerm === '') {
            // Si no hay término de búsqueda, mostrar todos los servicios finalizados
            const allFinalizedServices = services.filter(service => service.status === 'Finalizado');
            loadRemisionServices();
            resultsElement.innerHTML = `<span class="text-muted">${allFinalizedServices.length} servicios finalizados disponibles</span>`;
            return;
        }
        
        // Filtrar servicios que coincidan con el término de búsqueda
        const filteredServices = services.filter(service => {
            if (service.status !== 'Finalizado') return false;
            
            return service.id.toLowerCase().includes(searchTerm) ||
                   service.clientName.toLowerCase().includes(searchTerm) ||
                   service.safeType.toLowerCase().includes(searchTerm) ||
                   (service.description && service.description.toLowerCase().includes(searchTerm)) ||
                   (service.location && service.location.toLowerCase().includes(searchTerm)) ||
                   (service.serviceCode && service.serviceCode.toLowerCase().includes(searchTerm));
        });
        
        // Actualizar el dropdown con los servicios filtrados
        loadRemisionServices(filteredServices);
        
        // Actualizar contador de resultados
        if (filteredServices.length === 0) {
            resultsElement.innerHTML = '<span class="text-danger">No se encontraron servicios que coincidan con la búsqueda</span>';
        } else if (filteredServices.length === 1) {
            resultsElement.innerHTML = '<span class="text-success">1 servicio encontrado</span>';
            remisionServiceSelect.value = filteredServices[0].id;
        } else {
            resultsElement.innerHTML = `<span class="text-info">${filteredServices.length} servicios encontrados</span>`;
            remisionServiceSelect.value = '';
        }
    });
    
    // Event listener para búsqueda con Enter
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const options = remisionServiceSelect.options;
            
            // Si hay opciones disponibles, seleccionar la primera
            if (options.length > 1) {
                remisionServiceSelect.value = options[1].value;
                remisionServiceSelect.focus();
            }
        }
    });
}

function createRemisionFromService(serviceId) {
    const service = services.find(s => s.id === serviceId);
    if (!service) {
        showAlert('Servicio no encontrado');
        return;
    }

    // Buscar el precio del servicio
    const costoServicio = costoServicios.find(cs => cs.codigo === service.serviceCode);
    const precio = costoServicio ? costoServicio.precio : 0;

    // Obtener fecha y hora actual para la remisión
    const now = new Date();
    const fechaRemision = now.toISOString().split('T')[0];
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ampm = now.getHours() >= 12 ? 'p. m.' : 'a. m.';
    const hours12 = now.getHours() % 12 || 12;
    const horaRemision = `${hours12}:${minutes}:${seconds} ${ampm}`;

    const remision = {
        id: generateRemisionId(),
        fecha: service.date,
        fechaRemision: fechaRemision,
        horaRemision: horaRemision,
        codigoServicio: service.serviceCode || '',
        tipoServicio: service.safeType,
        descripcion: service.description || '',
        ubicacion: service.location,
        tecnicoId: service.technicianId,
        cliente: service.clientName,
        telefonoCliente: service.clientPhone,
        horaInicio: service.startTime || '',
        horaFinalizacion: service.finalizationOrCancellationTime || '',
        firmaTecnico: service.technicianSignature || '',
        firmaCliente: service.clientSignature || '',
        precio: precio,
        serviceId: serviceId
    };

    remisiones.push(remision);
    saveRemisiones();
    renderRemisionesList();
}

function deleteRemision(id) {
    showConfirm('¿Estás seguro de que deseas eliminar esta remisión?', (confirmed) => {
        if (confirmed) {
            remisiones = remisiones.filter(r => r.id !== id);
            saveRemisiones();
            renderRemisionesList();
        }
    });
}

function exportRemisionesToExcel() {
    const data = remisiones.map(remision => ({
        'ID Remisión': remision.id,
        'Fecha': remision.fecha,
        'Código Servicio': remision.codigoServicio,
        'Tipo Servicio': remision.tipoServicio,
        'Descripción': remision.descripcion,
        'Ubicación': remision.ubicacion,
        'Técnico': getTechnicianNameById(remision.tecnicoId),
        'Cliente': remision.cliente,
        'Teléfono Cliente': remision.telefonoCliente,
        'Hora Inicio': remision.horaInicio,
        'Hora Finalización': remision.horaFinalizacion,
        'Precio': remision.precio
    }));

    exportToExcel(data, 'remisiones_consegur');
}

function filterRemisiones() {
    const searchTerm = document.getElementById('search-remisiones').value.toLowerCase();
    const dateFromInput = document.getElementById('filter-remision-date-from');
    const dateToInput = document.getElementById('filter-remision-date-to');
    
    // Obtener valores y convertir formato de fecha si es necesario
    let dateFrom = dateFromInput.value;
    let dateTo = dateToInput.value;
    
    // Convertir formato dd/mm/aaaa a aaaa-mm-dd si es necesario
    if (dateFrom && dateFrom.includes('/')) {
        const parts = dateFrom.split('/');
        if (parts.length === 3) {
            dateFrom = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
    }
    if (dateTo && dateTo.includes('/')) {
        const parts = dateTo.split('/');
        if (parts.length === 3) {
            dateTo = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
    }

    let filteredRemisiones = remisiones;

    if (searchTerm) {
        filteredRemisiones = filteredRemisiones.filter(remision => {
            const serviceId = remision.serviceId || '';
            return remision.id.toLowerCase().includes(searchTerm) ||
                   remision.codigoServicio.toLowerCase().includes(searchTerm) ||
                   remision.cliente.toLowerCase().includes(searchTerm) ||
                   serviceId.toLowerCase().includes(searchTerm);
        });
    }

    if (dateFrom) {
        filteredRemisiones = filteredRemisiones.filter(remision => {
            const fechaRemision = remision.fechaRemision || remision.fecha || '';
            return fechaRemision >= dateFrom;
        });
    }

    if (dateTo) {
        filteredRemisiones = filteredRemisiones.filter(remision => {
            const fechaRemision = remision.fechaRemision || remision.fecha || '';
            return fechaRemision <= dateTo;
        });
    }

    renderRemisionesList(filteredRemisiones);
}

function clearRemisionesFilters() {
    document.getElementById('search-remisiones').value = '';
    document.getElementById('filter-remision-date-from').value = '';
    document.getElementById('filter-remision-date-to').value = '';
    filterRemisiones();
}

function openDeleteRemisionesModal() {
    const modal = new bootstrap.Modal(document.getElementById('deleteRemisionesModal'));
    const deleteRemisionesList = document.getElementById('delete-remisiones-list');
    const searchInput = document.getElementById('search-delete-remisiones');
    if (searchInput) searchInput.value = '';
    deleteRemisionesList.innerHTML = '';
    
    // Mostrar todas las remisiones con checkboxes
    remisiones.forEach(remision => {
        const service = remision.serviceId ? services.find(s => s.id === remision.serviceId) : null;
        
        // Formatear fecha de remisión
        let fechaRemision = remision.fechaRemision || remision.fecha || '';
        if (fechaRemision && fechaRemision.includes('-')) {
            const [year, month, day] = fechaRemision.split('-');
            fechaRemision = `${day}/${month}/${year}`;
        }
        
        const remisionCard = document.createElement('div');
        remisionCard.className = 'card mb-2';
        remisionCard.style.border = '1px solid #dee2e6';
        remisionCard.innerHTML = `
            <div class="card-body d-flex align-items-center">
                <input type="checkbox" class="form-check-input me-3" value="${remision.id}" id="remision-checkbox-${remision.id}" style="width: 20px; height: 20px;">
                <div class="flex-grow-1">
                    <strong>ID: ${remision.id}</strong>
                    <div class="text-muted">Cliente: ${remision.cliente || 'N/A'}</div>
                    <div class="text-muted">Fecha Remisión: ${fechaRemision || 'N/A'}</div>
                    <div class="text-muted">Código Servicio: ${remision.codigoServicio || 'N/A'}</div>
                    <div class="text-muted">Precio: $${(remision.precio || 0).toLocaleString()}</div>
                </div>
            </div>
        `;
        deleteRemisionesList.appendChild(remisionCard);
    });
    
    modal.show();
}

function selectAllRemisiones() {
    const checkboxes = document.querySelectorAll('#delete-remisiones-list input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
    });
}

function deselectAllRemisiones() {
    const checkboxes = document.querySelectorAll('#delete-remisiones-list input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
}

function confirmDeleteRemisiones() {
    const checkboxes = document.querySelectorAll('#delete-remisiones-list input[type="checkbox"]:checked');
    const selectedIds = Array.from(checkboxes).map(cb => cb.value);
    
    if (selectedIds.length === 0) {
        showAlert('Por favor, selecciona al menos una remisión para eliminar.');
        return;
    }
    
    showConfirm(`¿Estás seguro de que quieres eliminar ${selectedIds.length} remisión(es)? Esta acción no se puede deshacer.`, (result) => {
        if (result) {
            // Cerrar modal de selección
            const modal = bootstrap.Modal.getInstance(document.getElementById('deleteRemisionesModal'));
            modal.hide();
            
            // Inicializar modal de progreso
            initProgressModal('delete', selectedIds.length);
            
            let processed = 0;
            let successes = 0;
            let errors = 0;
            
            // Función para eliminar cada remisión de forma asíncrona
            function deleteRemision(index) {
                if (index >= selectedIds.length) {
                    // Eliminación completada
                    saveRemisiones();
                    renderRemisionesList();
                    
                    completeProgress('delete', successes, 
                        `Eliminación completada. ${successes} registro(s) eliminado(s).`, 
                        successes, 0, errors);
                    return;
                }
                
                const remisionId = selectedIds[index];
                const initialLength = remisiones.length;
                remisiones = remisiones.filter(r => r.id !== remisionId);
                
                if (remisiones.length < initialLength) {
                    successes++;
                } else {
                    errors++;
                }
                
                processed++;
                updateProgress(processed, selectedIds.length, 
                    `Eliminando registro ${processed} de ${selectedIds.length}...`, 
                    successes, 0, errors);
                
                // Procesar siguiente remisión con pequeño delay
                setTimeout(() => deleteRemision(index + 1), 10);
            }
            
            // Iniciar eliminación
            deleteRemision(0);
        }
    });
}

// ===== FUNCIONES DE BÚSQUEDA PARA MODALES DE ELIMINACIÓN MASIVA =====

// Función para filtrar usuarios en el modal de eliminación
function filterDeleteUsers() {
    const searchTerm = document.getElementById('search-delete-users').value.toLowerCase().trim();
    const cards = document.querySelectorAll('#delete-users-list .card');
    
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

// Función para limpiar la búsqueda de usuarios
function clearDeleteUsersSearch() {
    document.getElementById('search-delete-users').value = '';
    filterDeleteUsers();
}

// Función para filtrar clientes en el modal de eliminación
function filterDeleteClients() {
    const searchTerm = document.getElementById('search-delete-clients').value.toLowerCase().trim();
    const cards = document.querySelectorAll('#delete-clients-list .card');
    
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

// Función para limpiar la búsqueda de clientes
function clearDeleteClientsSearch() {
    document.getElementById('search-delete-clients').value = '';
    filterDeleteClients();
}

// Función para filtrar servicios en el modal de eliminación
function filterDeleteServices() {
    const searchTerm = document.getElementById('search-delete-services').value.toLowerCase().trim();
    const cards = document.querySelectorAll('#delete-services-list .card');
    
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

// Función para limpiar la búsqueda de servicios
function clearDeleteServicesSearch() {
    document.getElementById('search-delete-services').value = '';
    filterDeleteServices();
}

// Función para filtrar costos de servicios en el modal de eliminación
function filterDeleteCostoServicios() {
    const searchTerm = document.getElementById('search-delete-costo-servicios').value.toLowerCase().trim();
    const cards = document.querySelectorAll('#delete-costo-servicios-list .card');
    
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

// Función para limpiar la búsqueda de costos de servicios
function clearDeleteCostoServiciosSearch() {
    document.getElementById('search-delete-costo-servicios').value = '';
    filterDeleteCostoServicios();
}

// Función para filtrar remisiones en el modal de eliminación
function filterDeleteRemisiones() {
    const searchTerm = document.getElementById('search-delete-remisiones').value.toLowerCase().trim();
    const cards = document.querySelectorAll('#delete-remisiones-list .card');
    
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

// Función para limpiar la búsqueda de remisiones
function clearDeleteRemisionesSearch() {
    document.getElementById('search-delete-remisiones').value = '';
    filterDeleteRemisiones();
}

// Función para formatear hora en formato HH:MM:SS
function formatTime(timeString) {
    if (!timeString) return 'N/A';
    
    try {
        const date = new Date(timeString);
        if (isNaN(date.getTime())) return 'N/A';
        
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        
        return `${hours}:${minutes}:${seconds}`;
    } catch (error) {
        return 'N/A';
    }
}

function downloadRemisionPDF(remisionId) {
    const remision = remisiones.find(r => r.id === remisionId);
    if (!remision) {
        showAlert('Remisión no encontrada');
        return;
    }

    // Recargar servicios desde localStorage para asegurar que tenemos los datos más actualizados
    services = JSON.parse(localStorage.getItem('services')) || [];
    
    // Crear el PDF usando jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Configurar fuente y tamaño
    doc.setFont('helvetica');
    
    // Función para cargar el logo de manera más robusta
    function loadLogoAndGeneratePDF() {
        // URL del logo local de Consegur
        const logoUrl = 'assets/logoconsegur.png';
        
        // Método principal: carga directa con Image + Canvas
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
            try {
                // Crear canvas para convertir a base64
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                const logoBase64 = canvas.toDataURL('image/png');
                // Calcular dimensiones optimizadas para el PDF
                const maxWidth = 60; // Ancho máximo en mm
                const maxHeight = 30; // Alto máximo en mm
                
                let logoWidth = maxWidth;
                let logoHeight = (img.height * logoWidth) / img.width;
                
                // Si la altura es muy grande, ajustar proporcionalmente
                if (logoHeight > maxHeight) {
                    logoHeight = maxHeight;
                    logoWidth = (img.width * logoHeight) / img.height;
                }
                
                // Posición en la parte superior derecha (más a la izquierda y un poco hacia abajo)
                const logoX = 90; // Movido un poco a la derecha
                const logoY = 20; // Movido un poco hacia abajo
                
                doc.addImage(logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight);
                // Agregar texto "SEGURIDAD & CONFIANZA" debajo del logo
                doc.setFontSize(7);
                doc.setFont('helvetica', 'normal');
                doc.text('SEGURIDAD & CONFIANZA', logoX + logoWidth / 2, logoY + logoHeight + 5, { align: 'center' });
                
                // Continuar con el resto del PDF
                generatePDFContent(doc, remision);
            } catch (e) {
                generatePDFContent(doc, remision);
            }
        };
        
        img.onerror = () => {
            // Método alternativo: fetch desde la URL local
            fetch(logoUrl)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
                    }
                    return response.blob();
                })
                .then(blob => {
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            const base64 = reader.result;
                            resolve(base64);
                        };
                        reader.onerror = () => reject(new Error('Error al leer el archivo del logo local'));
                        reader.readAsDataURL(blob);
                    });
                })
                .then(logoBase64 => {
                    return new Promise((resolve, reject) => {
                        const img2 = new Image();
                        img2.onload = () => {
                            resolve({ img: img2, logoBase64 });
                        };
                        img2.onerror = () => reject(new Error('Error al cargar imagen desde base64'));
                        img2.src = logoBase64;
                    });
                })
                .then(({ img: img2, logoBase64 }) => {
                    try {
                        const logoWidth = 60;
                        const logoHeight = (img2.height * logoWidth) / img2.width;
                        
                        // Posición en la parte superior derecha (más a la izquierda y un poco hacia abajo)
                        const logoX = 90; // Movido un poco a la derecha
                        const logoY = 20; // Movido un poco hacia abajo
                        doc.addImage(logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight);
                        // Agregar texto "SEGURIDAD & CONFIANZA" debajo del logo
                        doc.setFontSize(7);
                        doc.setFont('helvetica', 'normal');
                        doc.text('SEGURIDAD & CONFIANZA', logoX + logoWidth / 2, logoY + logoHeight + 5, { align: 'center' });
                        
                        generatePDFContent(doc, remision);
                                    } catch (e) {
                    generatePDFContent(doc, remision);
                }
                })
                .catch(error => {
                    loadLogoEmbedded();
                });
        };
        
        // Intentar cargar la imagen desde la URL oficial
        img.src = logoUrl;
    }
    
    // Intentar cargar el logo desde el archivo primero
    loadLogoAndGeneratePDF();
    
    // Función para cargar SOLO el logo local de Consegur embebido (como último recurso)
    function loadLogoEmbedded() {
        // Logo real de Consegur embebido en base64 (convertido desde la URL oficial)
        const logoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAYAAABS3GwHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF0WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNy4yLWMwMDAgNzkuMWI2NWE3OWI0LCAyMDIyLzA2LzEzLTIyOjAxOjAxICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdEV2dD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlRXZlbnQjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjQuMCAoTWFjaW50b3NoKSIgeG1wOkNyZWF0ZURhdGU9IjIwMjQtMDEtMjBUMTU6NDc6NDctMDU6MDAiIHhtcDpNZXRhZGF0YURhdGU9IjIwMjQtMDEtMjBUMTU6NDc6NDctMDU6MDAiIHhtcDpNb2RpZnlEYXRlPSIyMDI0LTAxLTIwVDE1OjQ3OjQ3LTA1OjAwIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjY5ZDM4YmM1LTM4ZTAtNDI0Ny1hMzBkLTNmOWNhYzM3NzM0YyIgeG1wTU06RG9jdW1lbnRJRD0iYWRvYmU6ZG9jaWQ6cGhvdG9zaG9wOjIyYzRkOTZiLTM4ZTAtNDI0Ny1hMzBkLTNmOWNhYzM3NzM0YyIgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJ4bXAuZGlkOjY5ZDM4YmM1LTM4ZTAtNDI0Ny1hMzBkLTNmOWNhYzM3NzM0YyIgZGM6Zm9ybWF0PSJpbWFnZS9wbmciIHBob3Rvc2hvcDpDb2xvck1vZGU9IjMiPiA8eG1wTU06SGlzdG9yeT4gPHJkZjpTZXE+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJjcmVhdGVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjY5ZDM4YmM1LTM4ZTAtNDI0Ny1hMzBkLTNmOWNhYzM3NzM0YyIgc3RFdnQ6d2hlbj0iMjAyNC0wMS0yMFQxNTo0Nzo0Ny0wNTowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIDI0LjAgKE1hY2ludG9zaCkiLz4gPC9yZGY6U2VxPiA8L3htcE1NOkhpc3Rvcnk+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+';
        
        try {
            // Crear imagen para cargar el logo embebido
            const img = new Image();
            
            img.onload = () => {
                try {
                    // Calcular dimensiones optimizadas para el PDF
                    const maxWidth = 60; // Ancho máximo en mm
                    const maxHeight = 30; // Alto máximo en mm
                    
                    let logoWidth = maxWidth;
                    let logoHeight = (img.height * logoWidth) / img.width;
                    
                    // Si la altura es muy grande, ajustar proporcionalmente
                    if (logoHeight > maxHeight) {
                        logoHeight = maxHeight;
                        logoWidth = (img.width * logoHeight) / img.height;
                    }
                    
                    // Posición en la parte superior derecha (más a la izquierda y un poco hacia abajo)
                    const logoX = 90; // Movido un poco a la derecha
                    const logoY = 20; // Movido un poco hacia abajo
                    
                    doc.addImage(logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight);
                    
                    // Agregar texto "SEGURIDAD & CONFIANZA" debajo del logo
                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'normal');
                    doc.text('SEGURIDAD & CONFIANZA', logoX + logoWidth / 2, logoY + logoHeight + 5, { align: 'center' });
                    generatePDFContent(doc, remision);
                } catch (e) {
                    generatePDFContent(doc, remision);
                }
            };
            
            img.onerror = () => {
                generatePDFContent(doc, remision);
            };
            
            // Cargar la imagen desde el base64 embebido
            img.src = logoBase64;
            
        } catch (e) {
            generatePDFContent(doc, remision);
        }
    }
}

function generatePDFContent(doc, remision) {
    // Recargar servicios y costos de servicios desde localStorage para asegurar datos actualizados
    services = JSON.parse(localStorage.getItem('services')) || [];
    costoServicios = JSON.parse(localStorage.getItem('costoServicios')) || [];
    
    // Obtener el servicio asociado
    const service = remision.serviceId ? services.find(s => s.id === remision.serviceId) : null;
    
    // Información de la empresa en la parte superior izquierda
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('CONSEGUR S.A.S.', 20, 20);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('NIT: 900514502-7', 20, 26);
    doc.text('IVA RÉGIMEN COMÚN', 20, 32);
    doc.text('CLL 7 # 50-71', 20, 38);
    doc.text('TELÉFONO 448 86 00', 20, 44);
    doc.text('MEDELLÍN ANTIOQUIA', 20, 50);
    
    // Logo a la derecha (ya está agregado en la función loadLogoEmbedded)
    // El logo se posiciona en 20, 15 con dimensiones ajustadas
    
    // Título del documento centrado (reducido espacio arriba)
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('REMISIÓN DE SERVICIO', 105, 65, { align: 'center' });
    
    // Línea separadora debajo del título
    doc.line(20, 70, 190, 70);
    
    // Información de la remisión organizada en dos columnas
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    let yPos = 85; // Ajustado porque el título está más arriba
    
    // Columna izquierda - Información del servicio
    doc.text('ID Remisión:', 20, yPos);
    doc.text(remision.id || 'N/A', 60, yPos);
    yPos += 10;
    
    doc.text('ID Servicio:', 20, yPos);
    doc.text(remision.serviceId || 'N/A', 60, yPos);
    yPos += 10;
    
    // Formatear fecha de servicio
    let fechaServicio = service ? service.date : remision.fecha || '';
    if (fechaServicio && fechaServicio.includes('-')) {
        fechaServicio = fechaServicio; // Mantener formato YYYY-MM-DD
    }
    doc.text('Fecha de Servicio:', 20, yPos);
    doc.text(fechaServicio || 'N/A', 60, yPos);
    yPos += 10;
    
    // Hora de servicio
    let horaServicio = service ? service.startTime : '';
    if (horaServicio) {
        const horaDate = new Date(horaServicio);
        const hours = horaDate.getHours();
        const minutes = String(horaDate.getMinutes()).padStart(2, '0');
        const seconds = String(horaDate.getSeconds()).padStart(2, '0');
        const ampm = hours >= 12 ? 'p. m.' : 'a. m.';
        const hours12 = hours % 12 || 12;
        horaServicio = `${hours12}:${minutes}:${seconds} ${ampm}`;
    }
    doc.text('Hora Servicio:', 20, yPos);
    doc.text(horaServicio || 'N/A', 60, yPos);
    yPos += 10;
    
    // # de Aviso (si existe)
    if (service?.avisoNumber) {
        doc.text('# de Aviso:', 20, yPos);
        doc.text(service.avisoNumber, 60, yPos);
        yPos += 10;
    }
    
    // Total de Servicios - Título con tamaño original
    doc.text('Total de Servicios:', 20, yPos);
    yPos += 8;
    
    // Reducir tamaño de fuente solo para el contenido del servicio
    doc.setFontSize(8);
    
    // Obtener información del servicio principal
    const codigoServicio = remision.codigoServicio || service?.serviceCode || 'N/A';
    const tipoServicio = remision.tipoServicio || service?.safeType || 'N/A';
    
    // Obtener cantidad del servicio (si no existe, usar 1)
    const cantidad = service?.quantity || 1;
    
    // Buscar el precio unitario en costoServicios usando el código del servicio
    const costoServicio = costoServicios.find(cs => cs.codigo === codigoServicio);
    const precioUnitario = costoServicio ? costoServicio.precio : 0;
    
    // Calcular el total del servicio principal (cantidad * precio unitario)
    let totalServicio = cantidad * precioUnitario;
    
    // Formatear el texto del servicio con salto de línea si es necesario
    // Ancho máximo de 120mm para permitir que el texto se divida correctamente
    const servicioTexto = `${codigoServicio} - ${tipoServicio}`;
    const servicioLines = doc.splitTextToSize(servicioTexto, 120);
    
    // Mostrar el servicio principal en formato: 1. CODIGO - TIPO
    doc.text(`1. ${servicioLines[0]}`, 20, yPos);
    yPos += 5;
    
    // Si hay más líneas (texto largo), mostrarlas con indentación
    if (servicioLines.length > 1) {
        for (let i = 1; i < servicioLines.length; i++) {
            doc.text(servicioLines[i], 20, yPos);
            yPos += 5;
        }
    }
    
    // Mostrar cantidad, precio unitario y total en la misma línea
    doc.text(`x${cantidad} * $${precioUnitario.toLocaleString()} = $${totalServicio.toLocaleString()}`, 20, yPos);
    yPos += 8;
    
    // Mostrar servicios adicionales si existen
    if (service?.additionalServices && Array.isArray(service.additionalServices) && service.additionalServices.length > 0) {
        service.additionalServices.forEach((additionalService, index) => {
            // Los servicios adicionales se guardan con: code, type, description, quantity
            // Pero también pueden tener: serviceCode, safeType (para compatibilidad)
            const codigoAdicional = additionalService.code || additionalService.serviceCode || 'N/A';
            const tipoAdicional = additionalService.type || additionalService.safeType || 'N/A';
            const cantidadAdicional = additionalService.quantity || 1;
            const costoServicioAdicional = costoServicios.find(cs => cs.codigo === codigoAdicional);
            const precioUnitarioAdicional = costoServicioAdicional ? costoServicioAdicional.precio : 0;
            const totalAdicional = cantidadAdicional * precioUnitarioAdicional;
            totalServicio += totalAdicional;
            
            const servicioAdicionalTexto = `${codigoAdicional} - ${tipoAdicional}`;
            const servicioAdicionalLines = doc.splitTextToSize(servicioAdicionalTexto, 120);
            
            doc.text(`${index + 2}. ${servicioAdicionalLines[0]}`, 20, yPos);
            yPos += 5;
            
            if (servicioAdicionalLines.length > 1) {
                for (let i = 1; i < servicioAdicionalLines.length; i++) {
                    doc.text(servicioAdicionalLines[i], 20, yPos);
                    yPos += 5;
                }
            }
            
            doc.text(`x${cantidadAdicional} * $${precioUnitarioAdicional.toLocaleString()} = $${totalAdicional.toLocaleString()}`, 20, yPos);
            yPos += 8;
        });
    }
    
    // Restaurar tamaño de fuente original
    doc.setFontSize(10);
    
    // Columna derecha - Información del cliente y tiempos (alineada con la izquierda)
    let yPosRight = 85; // Mismo punto de inicio que la columna izquierda
    
    doc.text('Cliente:', 120, yPosRight);
    doc.text(remision.cliente || service?.clientName || 'N/A', 150, yPosRight);
    yPosRight += 10;
    
    doc.text('Teléfono:', 120, yPosRight);
    doc.text(remision.telefonoCliente || service?.clientPhone || 'N/A', 150, yPosRight);
    yPosRight += 10;
    
    doc.text('Email:', 120, yPosRight);
    // Obtener el email del cliente usando la función helper
    const clientEmail = remision.cliente ? getClientEmailByName(remision.cliente) : (service?.clientName ? getClientEmailByName(service.clientName) : 'N/A');
    doc.text(clientEmail !== '-' ? clientEmail : 'N/A', 150, yPosRight);
    yPosRight += 10;
    
    // Hora Inicio
    let horaInicio = service?.startTime || '';
    if (horaInicio) {
        const inicioDate = new Date(horaInicio);
        const hours = inicioDate.getHours();
        const minutes = String(inicioDate.getMinutes()).padStart(2, '0');
        const seconds = String(inicioDate.getSeconds()).padStart(2, '0');
        const ampm = hours >= 12 ? 'p. m.' : 'a. m.';
        const hours12 = hours % 12 || 12;
        horaInicio = `${hours12}:${minutes}:${seconds} ${ampm}`;
    }
    doc.text('Hora Inicio:', 120, yPosRight);
    doc.text(horaInicio || 'N/A', 150, yPosRight);
    yPosRight += 10;
    
    // Hora Finalización
    let horaFinalizacion = service?.finalizationOrCancellationTime || '';
    if (horaFinalizacion) {
        const finDate = new Date(horaFinalizacion);
        const hours = finDate.getHours();
        const minutes = String(finDate.getMinutes()).padStart(2, '0');
        const seconds = String(finDate.getSeconds()).padStart(2, '0');
        const ampm = hours >= 12 ? 'p. m.' : 'a. m.';
        const hours12 = hours % 12 || 12;
        horaFinalizacion = `${hours12}:${minutes}:${seconds} ${ampm}`;
    }
    doc.text('Hora Finalización:', 120, yPosRight);
    doc.text(horaFinalizacion || 'N/A', 150, yPosRight);
    yPosRight += 10;
    
    // Ubicación Inicio
    if (service?.startLocation) {
        doc.text('Ubicación Inicio:', 120, yPosRight);
        doc.text(`Lat: ${service.startLocation.latitude.toFixed(6)}, Lng: ${service.startLocation.longitude.toFixed(6)}`, 150, yPosRight);
        yPosRight += 10;
    }
    
    // Ubicación Fin
    if (service?.finalizationOrCancellationLocation) {
        doc.text('Ubicación Fin:', 120, yPosRight);
        doc.text(`Lat: ${service.finalizationOrCancellationLocation.latitude.toFixed(6)}, Lng: ${service.finalizationOrCancellationLocation.longitude.toFixed(6)}`, 150, yPosRight);
        yPosRight += 10;
    }
    
    // Ubicación Servicio (movido debajo de Ubicación Fin)
    const ubicacionServicio = service?.location || remision.ubicacion || 'N/A';
    doc.text('Ubicación Servicio:', 120, yPosRight);
    const ubicLines = doc.splitTextToSize(ubicacionServicio, 60);
    doc.text(ubicLines, 150, yPosRight);
    
    // Calcular el total de la remisión (usar el total calculado del servicio)
    const totalRemision = totalServicio || (remision.precio || 0);
    
    // Calcular la posición Y para el total (reducir espacio en blanco)
    // Usar el máximo entre yPos (columna izquierda) y yPosRight (columna derecha) + un pequeño margen
    const maxYPos = Math.max(yPos, yPosRight) + 5;
    
    // Precio centrado en negrilla (más grande)
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: $${totalRemision.toLocaleString()}`, 105, maxYPos, { align: 'center' });
    
    // Línea separadora después del total (igual que después del título)
    doc.line(20, maxYPos + 5, 190, maxYPos + 5);
    
    // Sección de Fotografía de Evidencia y Firmas
    const sectionY = maxYPos + 10;
    const sectionStartY = sectionY + 8; // Espacio después del título
    
    // Título de Fotografía de Evidencia
    doc.setFontSize(10);
    doc.text('FOTOGRAFÍA DE EVIDENCIA:', 20, sectionY);
    
    // Título de Firmas (alineado con Fotografía de Evidencia)
    doc.text('FIRMAS:', 105, sectionY);
    
    // Agregar foto de evidencia si existe
    if (service?.photo) {
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    const photoBase64 = canvas.toDataURL('image/png');
                    
                    // Calcular dimensiones para la imagen (reducido - máximo 50mm de ancho)
                    // Dividir el espacio disponible: mitad izquierda para foto (85mm de ancho disponible)
                    const maxWidth = 50;
                    const imgWidth = maxWidth;
                    const imgHeight = (img.height * imgWidth) / img.width;
                    
                    // Agregar foto de evidencia a la izquierda (mitad izquierda del espacio)
                    doc.addImage(photoBase64, 'PNG', 20, sectionStartY, imgWidth, imgHeight);
                    
                    // Texto descriptivo debajo de la imagen si existe
                    if (service.photoDescription) {
                        doc.setFontSize(8);
                        doc.text(service.photoDescription, 20, sectionStartY + imgHeight + 5);
                    }
                    
                    // Continuar con firmas al lado derecho (mitad derecha del espacio)
                    addSignaturesSection(doc, service, remision, sectionStartY, imgHeight);
                } catch (e) {
                    addSignaturesSection(doc, service, remision, sectionStartY, 0);
                }
            };
            img.onerror = () => {
                addSignaturesSection(doc, service, remision, sectionStartY, 0);
            };
            img.src = service.photo;
        } catch (e) {
            addSignaturesSection(doc, service, remision, sectionStartY, 0);
        }
    } else {
        addSignaturesSection(doc, service, remision, sectionStartY, 0);
    }
}

function addSignaturesSection(doc, service, remision, yStart, photoHeight = 0) {
    // Sección de firmas - posicionar en la mitad derecha del espacio
    // El espacio total es ~170mm (190-20), mitad izquierda para foto, mitad derecha para firmas
    const signaturesX = 105; // Posición X para las firmas (mitad derecha, empezando en 105mm)
    const signaturesY = yStart; // Posición Y alineada con el inicio de la foto
    
    // Firma del técnico (más pequeña)
    doc.setFontSize(8);
    doc.text('Firma Técnico:', signaturesX, signaturesY);
    doc.rect(signaturesX, signaturesY + 3, 60, 20); // Marco para firma (más pequeño)
    
    // Agregar firma del técnico si existe (más pequeña)
    if (service?.technicianSignature) {
        try {
            doc.addImage(service.technicianSignature, 'PNG', signaturesX + 2, signaturesY + 5, 56, 16);
        } catch (e) {
        }
    }
    
    // Firma del cliente (debajo de la firma del técnico, más pequeña)
    doc.text('Firma Cliente:', signaturesX, signaturesY + 30);
    doc.rect(signaturesX, signaturesY + 33, 60, 20); // Marco para firma (más pequeño)
    
    // Agregar firma del cliente si existe (más pequeña)
    if (service?.clientSignature) {
        try {
            doc.addImage(service.clientSignature, 'PNG', signaturesX + 2, signaturesY + 35, 56, 16);
        } catch (e) {
        }
    }
    
    // Guardar el PDF
    doc.save(`remision_${remision.id}.pdf`);
}



// --- Signature Pad Logic ---

function initializeSignaturePads() {
    const canvasClient = document.getElementById('signature-pad-client');
    const canvasTechnician = document.getElementById('signature-pad-technician');
    if (canvasClient && typeof SignaturePad !== 'undefined') {
        try {
            if (signaturePadClient) signaturePadClient.off(); // Detach existing event listeners
            signaturePadClient = new SignaturePad(canvasClient, {
                backgroundColor: 'rgb(255, 255, 255)'
            });
            resizeCanvas(canvasClient, signaturePadClient);
        } catch (error) {
        }
    } else {
    }

    if (canvasTechnician && typeof SignaturePad !== 'undefined') {
        try {
            if (signaturePadTechnician) signaturePadTechnician.off(); // Detach existing event listeners
            signaturePadTechnician = new SignaturePad(canvasTechnician, {
                backgroundColor: 'rgb(255, 255, 255)'
            });
            resizeCanvas(canvasTechnician, signaturePadTechnician);
        } catch (error) {
        }
    } else {
    }
}

function resizeCanvas(canvas, padInstance) {
    if (!canvas || !padInstance) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext('2d').scale(ratio, ratio);
    padInstance.clear(); // Clear the canvas after resizing to prevent distortions
}

function clearSignaturePad(type) {
    if (type === 'client' && signaturePadClient) {
        signaturePadClient.clear();
    } else if (type === 'technician' && signaturePadTechnician) {
        signaturePadTechnician.clear();
    }
}

// Photo preview for service registration
document.getElementById('service-photo').addEventListener('change', function(event) {
    const preview = document.getElementById('service-photo-preview');
    if (event.target.files && event.target.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.classList.remove('d-none');
        };
        reader.readAsDataURL(event.target.files[0]);
    } else {
        preview.classList.add('d-none');
        preview.src = ''; // Clear source if no file is selected
    }
});


// Initial setup on page load
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar tema
    initializeTheme();
    
    // Inicializar scroll to top
    initializeScrollToTop();
    
    // Inicializar protecciones de seguridad
    initializeSecurityProtections();
    
    // ELIMINAR la inicialización de navegación táctil personalizada
    // initializeTableNavigation();
    
    showLogin();

    const createUserModalElement = document.getElementById('createUserModal');
    if (createUserModalElement) {
        createUserModalElement.addEventListener('hidden.bs.modal', () => {
             // Reset form when modal is closed
            document.getElementById('user-form').reset();
            document.getElementById('edit-user-id').value = '';
            document.getElementById('user-username').value = '';
            document.getElementById('user-password').value = '';
            document.getElementById('user-role').value = 'employee';
            const passwordInput = document.getElementById('user-password');
            passwordInput.placeholder = 'Ingrese la contraseña';
            passwordInput.setAttribute('required', 'required');
            const passwordError = document.getElementById('password-error');
            if (passwordError) {
                passwordError.style.display = 'none';
                passwordError.textContent = '';
            }
            document.getElementById('createUserModalLabel').textContent = 'Crear/Editar Usuario';
        });
    }

    const registerServiceModalElement = document.getElementById('registerServiceModal');
    if (registerServiceModalElement) {
        registerServiceModalElement.addEventListener('shown.bs.modal', () => {
            // Asegurar que los inputs de fecha y hora siempre sean tipo text
            const serviceDateInput = document.getElementById('service-date');
            const serviceTimeInput = document.getElementById('service-time');
            if (serviceDateInput) {
                serviceDateInput.type = 'text';
            }
            if (serviceTimeInput) {
                serviceTimeInput.type = 'text';
            }
            
            initializeSignaturePads();
            populateTechnicianDropdowns();

            const serviceId = document.getElementById('edit-service-id').value;
            let currentStatus = 'Pendiente';
            if (serviceId) {
                const service = services.find(s => s.id === serviceId);
                if (service) {
                    currentStatus = service.status;
                }
            }
            // In case this is an admin editing a non-finalized service, still use toggle
            if (currentUser && currentUser.role === 'admin' && currentStatus !== 'Finalizado' && currentStatus !== 'Cancelado') {
                 togglePhotoAndSignatureSections(currentStatus, false);
            }
            // For employee finalization, openServiceFinalizationModal will handle visibility directly
        });

        // Agregar evento para limpiar el modal de alerta cuando se cierre
        const customAlertModalElement = document.getElementById('customAlertModal');
        if (customAlertModalElement) {
            customAlertModalElement.addEventListener('hidden.bs.modal', () => {
                // Limpiar el contenido del modal
                document.getElementById('customAlertModalBody').textContent = '';
                // Habilitar interacciones con la página
                document.body.style.pointerEvents = 'auto';
                document.body.style.overflow = 'auto';
            });
        }

        // Agregar event listener para el botón de guardar # de aviso
        const confirmAvisoBtn = document.getElementById('confirmAvisoNumberBtn');
        if (confirmAvisoBtn) {
            confirmAvisoBtn.addEventListener('click', saveAvisoNumber);
        }
        
        registerServiceModalElement.addEventListener('hidden.bs.modal', () => {
            // Resetear el formulario completamente
            document.getElementById('service-form').reset();
            document.getElementById('edit-service-id').value = '';
            document.getElementById('service-date').value = '';
            document.getElementById('service-time').value = '';
            document.getElementById('service-code').value = '';
            document.getElementById('service-type').value = '';
            document.getElementById('service-description').value = '';
            document.getElementById('service-quantity').value = '1';
            document.getElementById('service-client-name').value = '';
            document.getElementById('service-client-nit').value = '';
            document.getElementById('service-location').value = '';
            document.getElementById('service-client-phone').value = '';
            document.getElementById('service-client-email').value = '';
            const serviceAvisoNumberReset = document.getElementById('service-aviso-number');
            if (serviceAvisoNumberReset) serviceAvisoNumberReset.value = '';
            document.getElementById('service-status').value = 'Pendiente';
            document.getElementById('registerServiceModalLabel').textContent = 'Registrar Servicio';
            
            // Limpiar checkboxes de tipo de servicio
            setServiceTypes('');

            // Limpiar y ocultar previsualización de foto
            document.getElementById('service-photo-preview').src = '';
            document.getElementById('service-photo-preview').classList.add('d-none');
            document.getElementById('service-photo').value = '';

            // Limpiar servicios adicionales
            const additionalServicesContainer = document.getElementById('additional-services-container');
            if (additionalServicesContainer) {
                additionalServicesContainer.innerHTML = '';
            }

            // Limpiar y ocultar firmas
            clearSignaturePad('client');
            clearSignaturePad('technician');
            document.getElementById('photo-evidence-section').classList.add('d-none');
            document.getElementById('client-signature-section').classList.add('d-none');
            document.getElementById('technician-signature-section').classList.add('d-none');
            
            // Limpiar sugerencias
            const clientNameSuggestions = document.getElementById('client-name-suggestions');
            if (clientNameSuggestions) {
                clientNameSuggestions.innerHTML = '';
                clientNameSuggestions.style.display = 'none';
            }
            
            const serviceCodeSuggestions = document.getElementById('service-code-suggestions');
            if (serviceCodeSuggestions) {
                serviceCodeSuggestions.innerHTML = '';
                serviceCodeSuggestions.style.display = 'none';
            }
        });
    }
    
    // Agregar listener para limpiar formulario de cliente cuando se cierre el modal
    const createClientModalElement = document.getElementById('createClientModal');
    if (createClientModalElement) {
        createClientModalElement.addEventListener('hidden.bs.modal', () => {
            document.getElementById('client-form').reset();
            document.getElementById('edit-client-id').value = '';
            document.getElementById('client-name').value = '';
            document.getElementById('client-nit').value = '';
            document.getElementById('client-address').value = '';
            document.getElementById('client-phone').value = '';
            document.getElementById('client-email').value = '';
            document.getElementById('client-consecutive').value = '';
            document.getElementById('createClientModalLabel').textContent = 'Crear/Editar Cliente';
        });
    }
    
    // Agregar listener para limpiar formulario de costo servicio cuando se cierre el modal
    const createCostoServicioModalElement = document.getElementById('createCostoServicioModal');
    if (createCostoServicioModalElement) {
        createCostoServicioModalElement.addEventListener('hidden.bs.modal', () => {
            const form = document.getElementById('costo-servicio-form');
            if (form) form.reset();
            const editId = document.getElementById('edit-costo-servicio-id');
            if (editId) editId.value = '';
            const codigo = document.getElementById('costo-servicio-codigo');
            if (codigo) codigo.value = '';
            const tipo = document.getElementById('costo-servicio-tipo');
            if (tipo) tipo.value = '';
            const descripcion = document.getElementById('costo-servicio-descripcion');
            if (descripcion) descripcion.value = '';
            const precio = document.getElementById('costo-servicio-precio');
            if (precio) precio.value = '';
        });
    }

    // Initialize signature pads even if the modal is not shown yet, for resilience
    // The `resizeCanvas` call in `shown.bs.modal` will handle dimensions correctly when displayed.
    // Ensure signature_pad.umd.min.js is loaded before script.js
    if (typeof SignaturePad !== 'undefined') {
        initializeSignaturePads();
    } else {
        // Fallback or warning if SignaturePad is not loaded
    }


    window.addEventListener('resize', () => {
        // Debounce or throttle this if performance issues arise on resize
        resizeCanvas(document.getElementById('signature-pad-client'), signaturePadClient);
        resizeCanvas(document.getElementById('signature-pad-technician'), signaturePadTechnician);
    });
});

// Nota: Tendrás que encapsular tu lógica de guardado en una nueva función
// llamada `saveServiceLogic` para que se ejecute después del redimensionamiento.

function resizeImage(img, maxWidth, maxHeight) {
    const canvas = document.createElement('canvas');
    let width = img.width;
    let height = img.height;

    // Calcular el ratio para mantener las proporciones
    if (width > height) {
        if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
        }
        } else {
        if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
        }
    }
    
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    // Devolver la imagen redimensionada como data URL con calidad de compresión (0.7 por ejemplo)
    return canvas.toDataURL('image/jpeg', 'image/jpg', 'image/png', 0.7);
}

// Función para probar la geolocalización mejorada


function testGeolocation() {
    // Usar la instancia global de geolocalización
    if (!window.globalGeolocation) {
        window.globalGeolocation = new EnhancedGeolocation();
    }
    
    showAlert('🌍 Probando sistema de geolocalización mejorado...\n\nPor favor espera mientras obtenemos tu ubicación GPS.');
    
    window.globalGeolocation.getQuickLocation(
        (locationData) => {
            // Éxito: mostrar información detallada
            const displayInfo = window.globalGeolocation.formatLocationForDisplay(locationData);
            
            let message = `✅ Sistema de geolocalización funcionando correctamente!\n\n`;
            message += `📍 Ubicación obtenida:\n`;
            message += `Coordenadas: ${displayInfo.coordinates}\n`;
            message += `Precisión: ${displayInfo.accuracy}\n`;
            message += `Dirección: ${displayInfo.direction}\n`;
            message += `Velocidad: ${displayInfo.speed}\n`;
            message += `Altitud: ${displayInfo.altitude}\n`;
            message += `Navegador: ${displayInfo.browser}\n`;
            message += `Timestamp: ${displayInfo.timestamp}\n\n`;
            message += `🌐 Verificar en Google Maps:\n`;
            message += `https://www.google.com/maps?q=${locationData.latitude},${locationData.longitude}\n\n`;
            message += `🎯 El sistema de geolocalización mejorado está funcionando correctamente y es compatible con tu navegador.`;
            // Cerrar el modal actual y mostrar el resultado
            const currentModal = bootstrap.Modal.getInstance(document.getElementById('customAlertModal'));
            if (currentModal) {
                currentModal.hide();
            }
            
            // Mostrar el resultado después de un breve delay
            setTimeout(() => {
                showAlert(message);
            }, 300);
        },
        (error) => {
            // Error: mostrar mensaje específico
            let errorMessage = `❌ Error en sistema de geolocalización:\n\n`;
            errorMessage += `${error.message}\n\n`;
            errorMessage += `${error.details || ''}\n\n`;
            errorMessage += `🔧 Soluciones:\n`;
            errorMessage += `• Verifica que el GPS esté activado\n`;
            errorMessage += `• Permite el acceso a la ubicación en tu navegador\n`;
            errorMessage += `• Asegúrate de tener conexión a internet\n`;
            errorMessage += `• Intenta en un área con mejor señal GPS\n\n`;
            errorMessage += `Navegador detectado: ${navigator.userAgent}`;
            
            // Cerrar el modal actual y mostrar el error
            const currentModal = bootstrap.Modal.getInstance(document.getElementById('customAlertModal'));
            if (currentModal) {
                currentModal.hide();
            }
            
            setTimeout(() => {
                showAlert(errorMessage);
            }, 300);
                },
        'prueba_sistema'
    );
}

// --- Funciones de Tema ---
function toggleTheme() {
    const previousTheme = currentTheme;
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', currentTheme);
    applyTheme();
    updateThemeIcon();
    
    // Mostrar notificación del cambio de tema
    const themeName = currentTheme === 'dark' ? 'oscuro' : 'claro';
}

function applyTheme() {
    const html = document.documentElement;
    if (currentTheme === 'dark') {
        html.setAttribute('data-theme', 'dark');
    } else {
        html.removeAttribute('data-theme');
    }
}

function updateThemeIcon() {
    const themeIcon = document.getElementById('theme-icon');
    const themeToggle = document.getElementById('theme-toggle');
    
    if (currentTheme === 'dark') {
        themeIcon.className = 'bi bi-moon-fill';
        themeToggle.title = 'Cambiar a modo claro';
    } else {
        themeIcon.className = 'bi bi-sun-fill';
        themeToggle.title = 'Cambiar a modo oscuro';
    }
}

function initializeTheme() {
    // Detectar preferencia del sistema si no hay tema guardado
    if (!localStorage.getItem('theme')) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        currentTheme = prefersDark ? 'dark' : 'light';
        localStorage.setItem('theme', currentTheme);
    }
    
    applyTheme();
    updateThemeIcon();
    
    // Escuchar cambios en la preferencia del sistema
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            currentTheme = e.matches ? 'dark' : 'light';
            applyTheme();
            updateThemeIcon();
        }
    });
}

// Función para forzar el cierre de modales bloqueados
function forceCloseModals() {
    // Cerrar todos los modales abiertos
    const allModals = document.querySelectorAll('.modal');
    allModals.forEach(modal => {
        const modalInstance = bootstrap.Modal.getInstance(modal);
        if (modalInstance) {
            modalInstance.hide();
        }
    });
    
    // Remover clases de backdrop
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => backdrop.remove());
    
    // Restaurar scroll del body
    document.body.classList.remove('modal-open');
    document.body.style.overflow = 'auto';
    document.body.style.paddingRight = '';
    
    // Habilitar interacciones
    document.body.style.pointerEvents = 'auto';
}

// --- Funciones de Navegación Táctil para Tablas ---
// ELIMINAR ESTA FUNCIÓN COMPLETAMENTE - Usar comportamiento por defecto
// function initializeTableNavigation() {
//     // Esta función se elimina para usar el comportamiento por defecto de las tablas
// }

// --- Funcionalidad Scroll to Top ---
function initializeScrollToTop() {
    const scrollToTopBtn = document.getElementById('scroll-to-top');
    
    if (!scrollToTopBtn) return;
    
    // Función para mostrar/ocultar el botón
    function toggleScrollButton() {
        if (window.pageYOffset > 300) {
            scrollToTopBtn.classList.add('show');
        } else {
            scrollToTopBtn.classList.remove('show');
        }
    }
    
    // Función para hacer scroll hacia arriba
    function scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
    
    // Event listeners
    window.addEventListener('scroll', toggleScrollButton);
    scrollToTopBtn.addEventListener('click', scrollToTop);
    
    // También mostrar el botón si la página ya está scrolleada al cargar
    if (window.pageYOffset > 300) {
        scrollToTopBtn.classList.add('show');
    }
}

// Función para actualizar los contadores de filtros del técnico
function updateEmployeeFilterCounts() {
    if (!currentUser || currentUser.role !== 'employee') return;
    
    // Obtener servicios asignados al técnico actual
    const assignedToMe = services.filter(s => s.technicianId === currentUser.id);
    
    // Calcular cantidades por estado
    const counts = {
        todos: assignedToMe.length,
        pendiente: assignedToMe.filter(s => s.status === 'Pendiente').length,
        'en-proceso': assignedToMe.filter(s => s.status === 'En proceso').length,
        finalizado: assignedToMe.filter(s => s.status === 'Finalizado').length,
        cancelado: assignedToMe.filter(s => s.status === 'Cancelado').length
    };
    
    // Actualizar los badges
    const badgeIds = {
        'todos': 'filter-count-todos',
        'pendiente': 'filter-count-pendiente',
        'en-proceso': 'filter-count-en-proceso',
        'finalizado': 'filter-count-finalizado',
        'cancelado': 'filter-count-cancelado'
    };
    
    Object.keys(counts).forEach(key => {
        const badgeElement = document.getElementById(badgeIds[key]);
        if (badgeElement) {
            badgeElement.textContent = counts[key];
            
            // Agregar animación si hay servicios
            if (counts[key] > 0) {
                badgeElement.style.animation = 'badge-pulse-green 2s ease-in-out';
                setTimeout(() => {
                    badgeElement.style.animation = '';
                }, 2000);
            }
        }
    });
}

// Función para filtrar servicios del técnico por estado
function filterEmployeeServices(status) {
    currentEmployeeServicesFilter = status;
    
    // Actualizar botones activos
    const filterButtons = document.querySelectorAll('.employee-filters .btn');
    filterButtons.forEach(btn => {
        btn.classList.remove('active');
        const btnText = btn.textContent.trim().toUpperCase();
        if ((status === 'todos' && btnText.includes('TODOS')) ||
            (status === 'Pendiente' && btnText.includes('PENDIENTES')) ||
            (status === 'En proceso' && btnText.includes('EN PROCESO')) ||
            (status === 'Finalizado' && btnText.includes('FINALIZADOS')) ||
            (status === 'Cancelado' && btnText.includes('CANCELADOS'))) {
            btn.classList.add('active');
        }
    });
    
    // Re-renderizar la lista con el filtro aplicado
    renderEmployeeAssignedServices(1);
}

// ===== FUNCIONES DE BLOQUEO DE ACCESO =====

// Función para bloquear click derecho
function blockRightClick(e) {
    e.preventDefault();
    return false;
}

// Función para bloquear atajos de teclado
function blockKeyboardShortcuts(e) {
    // Bloquear Ctrl+U (ver código fuente)
    if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        return false;
    }
    
    // Bloquear Ctrl+Shift+I (herramientas de desarrollador)
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
    }
    
    // Bloquear F12
    if (e.key === 'F12') {
        e.preventDefault();
        return false;
    }
    
    // Bloquear Ctrl+Shift+C (inspeccionar elemento)
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        return false;
    }
    
    // Bloquear Ctrl+Shift+J (consola)
    if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        return false;
    }
    
    // Bloquear Ctrl+Shift+K (consola web)
    if (e.ctrlKey && e.shiftKey && e.key === 'K') {
        e.preventDefault();
        return false;
    }
}

// Función para bloquear Fn+F12 (específico para algunos teclados)
function blockFunctionKeys(e) {
    // Bloquear F12
    if (e.keyCode === 123) {
        e.preventDefault();
        return false;
    }
}

// Función para inicializar todas las protecciones
function initializeSecurityProtections() {
    // Bloquear click derecho
    document.addEventListener('contextmenu', blockRightClick);
    
    // Bloquear atajos de teclado
    document.addEventListener('keydown', blockKeyboardShortcuts);
    document.addEventListener('keydown', blockFunctionKeys);
    
    // Bloquear también en el body y html
    document.body.addEventListener('contextmenu', blockRightClick);
    document.body.addEventListener('keydown', blockKeyboardShortcuts);
    document.body.addEventListener('keydown', blockFunctionKeys);
    
    // Bloquear inspección de elementos
    document.addEventListener('selectstart', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Bloquear arrastrar elementos
    document.addEventListener('dragstart', function(e) {
        e.preventDefault();
        return false;
    });
}

// Event listeners para los nuevos módulos
document.addEventListener('DOMContentLoaded', function() {
    // Event listeners para importación de archivos
    document.getElementById('import-services-file').addEventListener('change', handleServicesImport);
    document.getElementById('import-costo-servicios-file').addEventListener('change', handleCostoServiciosImport);
    
    // Event listener para poblar automáticamente tipo y descripción cuando cambie el código de servicio
    // Event listener actualizado para el campo de código de servicio (ahora es input de texto)
    const serviceCodeField = document.getElementById('service-code');
    if (serviceCodeField) {
        serviceCodeField.addEventListener('change', loadServiceDetails);
        serviceCodeField.addEventListener('blur', loadServiceDetails);
    }
    
    // Event listener para el formulario de costo de servicios
    document.getElementById('costo-servicio-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const editId = document.getElementById('edit-costo-servicio-id').value;
        const codigo = document.getElementById('costo-servicio-codigo').value.trim();
        const tipo = document.getElementById('costo-servicio-tipo').value.trim();
        const descripcion = document.getElementById('costo-servicio-descripcion').value.trim();
        const precio = parseFloat(document.getElementById('costo-servicio-precio').value);
        
        // Validar campos obligatorios
        if (!codigo) {
            showAlert('Por favor ingresa el código de servicio');
            return;
        }
        if (!tipo) {
            showAlert('Por favor ingresa el tipo de servicio');
            return;
        }
        if (!descripcion) {
            showAlert('Por favor ingresa la descripción del servicio');
            return;
        }
        if (isNaN(precio) || precio < 0) {
            showAlert('Por favor ingresa un precio válido mayor o igual a 0');
            return;
        }
        
        if (editId) {
            // Editar servicio existente
            const index = costoServicios.findIndex(s => s.id === editId);
            if (index !== -1) {
                costoServicios[index] = {
                    ...costoServicios[index],
                    codigo: codigo,
                    tipo: tipo,
                    descripcion: descripcion,
                    precio: precio
                    // Mantener la fecha existente
                };
            }
        } else {
            // Crear nuevo servicio con código manual
            const fechaActual = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
            const newServicio = {
                id: generateId(),
                codigo: codigo,
                fecha: fechaActual,
                tipo: tipo,
                descripcion: descripcion,
                precio: precio
            };
            costoServicios.push(newServicio);
        }
        
        saveCostoServicios();
        renderCostoServiciosList(costoServicios, 1);
        populateServiceCodes();
        
        // Cerrar modal y limpiar formulario
        const modal = bootstrap.Modal.getInstance(document.getElementById('createCostoServicioModal'));
        modal.hide();
        
        // Limpiar completamente el formulario
        document.getElementById('costo-servicio-form').reset();
        document.getElementById('edit-costo-servicio-id').value = '';
        document.getElementById('costo-servicio-codigo').value = '';
        document.getElementById('costo-servicio-tipo').value = '';
        document.getElementById('costo-servicio-descripcion').value = '';
        document.getElementById('costo-servicio-precio').value = '';
        
        // showAlert('Servicio guardado exitosamente'); // Comentado para eliminar alerta al guardar
    });
    
    // Event listener para el formulario de generar remisión
    document.getElementById('generate-remision-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const serviceId = document.getElementById('remision-service-id').value;
        if (serviceId) {
            createRemisionFromService(serviceId);
            
            // Cerrar modal y limpiar formulario
            const modal = bootstrap.Modal.getInstance(document.getElementById('generateRemisionModal'));
            modal.hide();
            document.getElementById('generate-remision-form').reset();
        }
    });
    
    // Event listener para cargar códigos de servicio cuando se abre el modal
    // Event listeners para búsqueda de código de servicio
    const serviceCodeInput = document.getElementById('service-code');
    if (serviceCodeInput) {
        const suggestionsDiv = document.getElementById('service-code-suggestions');
        
        // Mostrar lista al hacer click
        serviceCodeInput.addEventListener('click', function() {
            if (costoServicios && costoServicios.length > 0) {
                showServiceCodeDropdown(serviceCodeInput, suggestionsDiv, false);
            }
        });
        
        // Mostrar lista al escribir
        serviceCodeInput.addEventListener('input', searchServiceCode);
        
        // Navegación con teclado
        serviceCodeInput.addEventListener('keydown', function(e) {
            handleServiceCodeKeyboard(e, serviceCodeInput);
        });
        
        // Ocultar al perder el foco
        serviceCodeInput.addEventListener('blur', function() {
            setTimeout(() => {
                if (suggestionsDiv) suggestionsDiv.style.display = 'none';
            }, 200);
        });
    }
    
    // Event listeners para búsqueda de nombre de cliente
    const clientNameInput = document.getElementById('service-client-name');
    if (clientNameInput) {
        clientNameInput.addEventListener('input', searchClientName);
        clientNameInput.addEventListener('blur', function() {
            setTimeout(() => {
                const suggestionsDiv = document.getElementById('client-name-suggestions');
                if (suggestionsDiv) suggestionsDiv.style.display = 'none';
                loadClientData();
            }, 200);
        });
    }
    
    // Inicializar campo de fecha con funcionalidad de selector
    const serviceDateInput = document.getElementById('service-date');
    if (serviceDateInput) {
        const dateIcon = serviceDateInput.parentElement.querySelector('.date-picker-icon');
        
        // Función para abrir el selector de fecha
        function openDatePicker() {
            serviceDateInput.type = 'date';
            // Usar showPicker si está disponible (navegadores modernos)
            if (serviceDateInput.showPicker && typeof serviceDateInput.showPicker === 'function') {
                try {
                    const pickerPromise = serviceDateInput.showPicker();
                    // Verificar si retorna una promesa antes de llamar a catch
                    if (pickerPromise && typeof pickerPromise.catch === 'function') {
                        pickerPromise.catch(() => {
                            // Si showPicker falla, usar focus
                            serviceDateInput.focus();
                        });
                    } else {
                        serviceDateInput.focus();
                    }
                } catch (error) {
                    // Si showPicker lanza un error, usar focus
                    serviceDateInput.focus();
                }
            } else {
                serviceDateInput.focus();
            }
        }
        
        // Al hacer clic en el input, abrir selector
        serviceDateInput.addEventListener('click', function(e) {
            e.preventDefault();
            openDatePicker();
        });
        
        // Al hacer clic en el icono, abrir selector
        if (dateIcon) {
            dateIcon.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                openDatePicker();
            });
        }
        
        // Al enfocar, cambiar a date para mostrar el selector
        serviceDateInput.addEventListener('focus', function() {
            if (this.type !== 'date') {
                this.type = 'date';
            }
        });
        
        // Al perder el foco, convertir a texto con formato
        serviceDateInput.addEventListener('blur', function() {
            if (this.value) {
                const date = new Date(this.value);
                if (!isNaN(date.getTime())) {
                    this.type = 'text';
                    // Formatear como dd/mm/aaaa
                    const day = String(date.getDate()).padStart(2, '0');
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const year = date.getFullYear();
                    this.value = `${day}/${month}/${year}`;
                } else {
                    this.type = 'text';
                }
            } else {
                this.type = 'text';
            }
        });
    }
    
    // Inicializar campo de hora con funcionalidad de selector
    const serviceTimeInput = document.getElementById('service-time');
    if (serviceTimeInput) {
        const timeIcon = serviceTimeInput.parentElement.querySelector('.time-picker-icon');
        
        // Función para abrir el selector de hora
        function openTimePicker() {
            serviceTimeInput.type = 'time';
            // Usar showPicker si está disponible (navegadores modernos)
            if (serviceTimeInput.showPicker && typeof serviceTimeInput.showPicker === 'function') {
                try {
                    const pickerPromise = serviceTimeInput.showPicker();
                    // Verificar si retorna una promesa antes de llamar a catch
                    if (pickerPromise && typeof pickerPromise.catch === 'function') {
                        pickerPromise.catch(() => {
                            // Si showPicker falla, usar focus
                            serviceTimeInput.focus();
                        });
                    } else {
                        serviceTimeInput.focus();
                    }
                } catch (error) {
                    // Si showPicker lanza un error, usar focus
                    serviceTimeInput.focus();
                }
            } else {
                serviceTimeInput.focus();
            }
        }
        
        // Al hacer clic en el input, abrir selector
        serviceTimeInput.addEventListener('click', function(e) {
            e.preventDefault();
            openTimePicker();
        });
        
        // Al hacer clic en el icono, abrir selector
        if (timeIcon) {
            timeIcon.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                openTimePicker();
            });
        }
        
        // Al enfocar, cambiar a time para mostrar el selector
        serviceTimeInput.addEventListener('focus', function() {
            if (this.type !== 'time') {
                this.type = 'time';
            }
        });
        
        // Al perder el foco, convertir a texto con formato de 12 horas
        serviceTimeInput.addEventListener('blur', function() {
            if (this.value) {
                this.type = 'text';
                // Convertir el valor de formato HH:mm (24 horas) a formato de 12 horas
                const convertedTime = convertTo12HourFormat(this.value);
                if (convertedTime) {
                    this.value = convertedTime;
                }
            } else {
                this.type = 'text';
            }
        });
    }
    
    // Inicializar campos de fecha en filtros de costo servicios
    function initializeCostoServiciosDatePickers() {
        const dateFromInput = document.getElementById('filter-costo-servicio-date-from');
        const dateToInput = document.getElementById('filter-costo-servicio-date-to');
        
        // Función para inicializar un date picker
        function setupDatePicker(input, icon) {
            if (!input) return;
            
            // Función para abrir el selector de fecha
            function openDatePicker() {
                input.type = 'date';
                // Usar showPicker si está disponible (navegadores modernos)
                if (input.showPicker) {
                    input.showPicker().catch(() => {
                        // Si showPicker falla, usar focus
                        input.focus();
                    });
                } else {
                    input.focus();
                }
            }
            
            // Al hacer clic en el input, abrir selector
            input.addEventListener('click', function(e) {
                e.preventDefault();
                openDatePicker();
            });
            
            // Al hacer clic en el icono, abrir selector
            if (icon) {
                icon.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    openDatePicker();
                });
            }
            
            // Al enfocar, cambiar a date para mostrar el selector
            input.addEventListener('focus', function() {
                if (this.type !== 'date') {
                    this.type = 'date';
                }
            });
            
            // Al perder el foco, convertir a texto con formato
            input.addEventListener('blur', function() {
                if (this.value) {
                    const date = new Date(this.value);
                    if (!isNaN(date.getTime())) {
                        this.type = 'text';
                        // Formatear como dd/mm/aaaa
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = date.getFullYear();
                        this.value = `${day}/${month}/${year}`;
                    } else {
                        this.type = 'text';
                    }
                } else {
                    this.type = 'text';
                }
            });
        }
        
        // Inicializar ambos campos
        if (dateFromInput) {
            const dateFromIcon = dateFromInput.parentElement.querySelector('.date-picker-icon');
            setupDatePicker(dateFromInput, dateFromIcon);
        }
        
        if (dateToInput) {
            const dateToIcon = dateToInput.parentElement.querySelector('.date-picker-icon');
            setupDatePicker(dateToInput, dateToIcon);
        }
    }
    
    // Inicializar date pickers cuando se carga la página
    initializeCostoServiciosDatePickers();
    
    // Reinicializar cuando se muestra el tab de costo servicios
    const costoServiciosTab = document.getElementById('costo-servicios-tab');
    if (costoServiciosTab) {
        costoServiciosTab.addEventListener('shown.bs.tab', function() {
            initializeCostoServiciosDatePickers();
            // Asegurar que la tabla se renderice cuando se muestra la pestaña
            renderCostoServiciosList(costoServicios, 1);
        });
    }
    
    // Inicializar campos de fecha en filtros de remisiones
    function initializeRemisionesDatePickers() {
        const dateFromInput = document.getElementById('filter-remision-date-from');
        const dateToInput = document.getElementById('filter-remision-date-to');
        
        // Función para inicializar un date picker
        function setupDatePicker(input, icon) {
            if (!input) return;
            
            // Función para abrir el selector de fecha
            function openDatePicker() {
                input.type = 'date';
                // Usar showPicker si está disponible (navegadores modernos)
                if (input.showPicker) {
                    input.showPicker().catch(() => {
                        // Si showPicker falla, usar focus
                        input.focus();
                    });
                } else {
                    input.focus();
                }
            }
            
            // Al hacer clic en el input, abrir selector
            input.addEventListener('click', function(e) {
                e.preventDefault();
                openDatePicker();
            });
            
            // Al hacer clic en el icono, abrir selector
            if (icon) {
                icon.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    openDatePicker();
                });
            }
            
            // Al enfocar, cambiar a date para mostrar el selector
            input.addEventListener('focus', function() {
                if (this.type !== 'date') {
                    this.type = 'date';
                }
            });
            
            // Al perder el foco, convertir a texto con formato
            input.addEventListener('blur', function() {
                if (this.value) {
                    const date = new Date(this.value);
                    if (!isNaN(date.getTime())) {
                        this.type = 'text';
                        // Formatear como dd/mm/aaaa
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = date.getFullYear();
                        this.value = `${day}/${month}/${year}`;
                    } else {
                        this.type = 'text';
                    }
                } else {
                    this.type = 'text';
                }
            });
        }
        
        // Inicializar ambos campos
        if (dateFromInput) {
            const dateFromIcon = dateFromInput.parentElement.querySelector('.date-picker-icon');
            setupDatePicker(dateFromInput, dateFromIcon);
        }
        
        if (dateToInput) {
            const dateToIcon = dateToInput.parentElement.querySelector('.date-picker-icon');
            setupDatePicker(dateToInput, dateToIcon);
        }
    }
    
    // Inicializar date pickers cuando se carga la página
    initializeRemisionesDatePickers();
    
    // Reinicializar cuando se muestra el tab de remisiones
    const remisionesTab = document.getElementById('remisiones-tab');
    if (remisionesTab) {
        remisionesTab.addEventListener('shown.bs.tab', function() {
            initializeRemisionesDatePickers();
            // Asegurar que la tabla se renderice cuando se muestra la pestaña
            renderRemisionesList(remisiones);
        });
    }
    
    document.getElementById('registerServiceModal').addEventListener('show.bs.modal', function() {
        // Asegurar que los inputs de fecha y hora siempre sean tipo text
        const serviceDateInput = document.getElementById('service-date');
        const serviceTimeInput = document.getElementById('service-time');
        if (serviceDateInput) {
            serviceDateInput.type = 'text';
        }
        if (serviceTimeInput) {
            serviceTimeInput.type = 'text';
        }
        
        // Solo poblar códigos si no estamos editando (no hay ID de edición)
        const editId = document.getElementById('edit-service-id').value;
        
        if (!editId) {
            // Es un nuevo servicio, poblar códigos
            populateServiceCodes();
        } else {
        }
    });
    
    // Event listener para el modal de crear costo servicio
    document.getElementById('createCostoServicioModal').addEventListener('show.bs.modal', function() {
        // Solo limpiar si no estamos editando (no hay ID de edición)
        const editId = document.getElementById('edit-costo-servicio-id').value;
        
        if (!editId) {
            // Es un nuevo servicio, limpiar formulario
            document.getElementById('costo-servicio-form').reset();
            
            // Limpiar campos
            document.getElementById('costo-servicio-codigo').value = '';
            document.getElementById('costo-servicio-tipo').value = '';
        } else {
        }
    });
    
    // Event listener para el formulario de servicios (modificado)
    document.getElementById('service-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Convertir fecha de formato dd/mm/yyyy a YYYY-MM-DD antes de guardar
        const dateInput = document.getElementById('service-date').value;
        const date = convertDateToISO(dateInput);
        if (!date && dateInput) {
            showAlert('Por favor ingresa una fecha válida en formato dd/mm/yyyy');
            return;
        }
        
        // Obtener hora y convertir a formato de 12 horas
        const timeInput = String(document.getElementById('service-time').value || '').trim();
        const time = convertTo12HourFormat(timeInput);
        const serviceCode = document.getElementById('service-code').value;
        let safeType = document.getElementById('service-type').value;
        let description = document.getElementById('service-description').value;
        const location = document.getElementById('service-location').value;
        const clientName = document.getElementById('service-client-name').value;
        const clientPhone = document.getElementById('service-client-phone').value;
        const clientNit = document.getElementById('service-client-nit').value;
        const clientEmail = document.getElementById('service-client-email').value;
        const status = document.getElementById('service-status').value;
        
        // Obtener siempre los datos del código de servicio seleccionado para garantizar sincronización
        // Validar que se haya seleccionado un código de servicio
        if (!serviceCode || serviceCode.trim() === '') {
            showAlert('Por favor selecciona un código de servicio');
            return;
        }
        
        const servicio = costoServicios.find(s => s.codigo === serviceCode);
        if (servicio) {
            safeType = servicio.tipo;
            description = servicio.descripcion;
        } else {
            showAlert('El código de servicio seleccionado no existe en la base de datos');
            return;
        }
        // Validar que se haya ingresado la ubicación
        if (!location.trim()) {
            showAlert('Por favor ingresa la ubicación del servicio');
            return;
        }

        // Handle required fields for Finalizado status for technician
        if (status === 'Finalizado' && currentUser.role === 'employee') {
            let missingFields = [];
            const photoInput = document.getElementById('service-photo');
            if (!photoInput.files.length && !document.getElementById('service-photo-preview').src) missingFields.push('foto de evidencia');
            if (signaturePadClient && signaturePadClient.isEmpty()) missingFields.push('firma del cliente');
            if (signaturePadTechnician && signaturePadTechnician.isEmpty()) missingFields.push('firma del técnico');

            if (missingFields.length > 0) {
                showAlert(`Para finalizar el servicio, por favor proporcione: ${missingFields.join(', ')}.`);
                return; // Prevent form submission
            }
        }
        
        // Obtener cantidad del servicio
        const quantity = parseInt(document.getElementById('service-quantity').value) || 1;
        
        // Obtener servicios adicionales
        const additionalServices = [];
        const additionalServicesContainer = document.getElementById('additional-services-container');
        if (additionalServicesContainer) {
            const additionalServiceDivs = additionalServicesContainer.querySelectorAll('.bg-light');
            additionalServiceDivs.forEach(div => {
                const codeInput = div.querySelector('.additional-service-code');
                const typeInput = div.querySelector('.additional-service-type');
                const descriptionInput = div.querySelector('.additional-service-description');
                const quantityInput = div.querySelector('.additional-service-quantity');
                
                if (codeInput && codeInput.value.trim() !== '') {
                    const serviceCode = codeInput.value.trim();
                    // Buscar el servicio en costoServicios para obtener tipo y descripción si no están llenos
                    let serviceType = typeInput ? typeInput.value.trim() : '';
                    let serviceDescription = descriptionInput ? descriptionInput.value.trim() : '';
                    
                    // Si no hay tipo o descripción, intentar obtenerlos del código
                    if ((!serviceType || !serviceDescription) && costoServicios) {
                        const servicio = costoServicios.find(s => s.codigo === serviceCode);
                        if (servicio) {
                            if (!serviceType) serviceType = servicio.tipo || '';
                            if (!serviceDescription) serviceDescription = servicio.descripcion || '';
                        }
                    }
                    
                    additionalServices.push({
                        code: serviceCode,
                        type: serviceType,
                        description: serviceDescription,
                        quantity: quantityInput ? parseInt(quantityInput.value) || 1 : 1
                    });
                }
            });
        }
        
        // Obtener datos de foto si existe
        const photoInput = document.getElementById('service-photo');
        let photoData = '';
        
        if (photoInput.files.length > 0) {
            const file = photoInput.files[0];
            const reader = new FileReader();
            reader.onload = function(e) {
                photoData = e.target.result;
                saveServiceData(document.getElementById('edit-service-id').value, date, time, safeType, description, location, clientName, clientPhone, clientNit, clientEmail, status, photoData, quantity, additionalServices);
            };
            reader.readAsDataURL(file);
        } else {
            saveServiceData(document.getElementById('edit-service-id').value, date, time, safeType, description, location, clientName, clientPhone, clientNit, clientEmail, status, photoData, quantity, additionalServices);
        }
    });
});

// Inicialización de los nuevos módulos cuando se muestra el dashboard de administrador
function initializeAdminModules() {
    renderCostoServiciosList(costoServicios, 1);
    renderRemisionesList();
    populateServiceCodes();
}

// Verificar compatibilidad de geolocalización al cargar la página
if (window.initializeGeolocation) {
    window.initializeGeolocation().then(result => {
        if (!result.supported) {
        }
    }).catch(error => {
    });
}