/**
 * COTIZADOR ENTERPRISE V3.5 - MASTER VERSION
 */

const PRODUCTOS = [
    { id: 'web_lp', nombre: "Landing Page Corporativa", precio: 1200, permiteDescuento: true },
    { id: 'web_manto', nombre: "Soporte y Mantenimiento", precio: 300, permiteDescuento: false },
    { id: 'seo_audit', nombre: "Auditoría SEO Pro", precio: 850, permiteDescuento: true }
];

const state = {
    config: { iva: 0.16, maxCantidad: 100, maxDesc: 30, moneda: 'USD' },
    ui: { servicioId: '', cantidad: 1, descuento: 0 },
    errores: { servicio: '', cantidad: '', descuento: '' },
    ultimoCalculo: null
};

/**
 * 🔧 MEJORA: Formateador como función para reaccionar a cambios en config
 */
const formatCurrency = (n) => {
    return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: state.config.moneda 
    }).format(n);
};

const dom = {
    form: document.getElementById('form-cotizador'),
    selServicio: document.getElementById('servicio'),
    inCantidad: document.getElementById('cantidad'),
    inDescuento: document.getElementById('descuento'),
    btnPDF: document.getElementById('btn-pdf'),
    btnWS: document.getElementById('btn-ws'),
    resumen: document.getElementById('resumen-visual'),
    controles: document.getElementById('controles-finales')
};

/* =========================================
   INICIALIZACIÓN Y EVENTOS
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
    inicializarApp();
    
    // Listeners Reactivos
    dom.selServicio.addEventListener('change', e => {
        state.ui.servicioId = e.target.value;
        actualizarReglasNegocio();
        validarEstadoActual();
        guardarPersistencia();
    });

    dom.inCantidad.addEventListener('input', e => {
        state.ui.cantidad = parseInt(e.target.value) || 0;
        validarEstadoActual();
        guardarPersistencia();
    });

    dom.inDescuento.addEventListener('input', e => {
        state.ui.descuento = parseFloat(e.target.value) || 0;
        validarEstadoActual();
    });

    dom.form.addEventListener('submit', e => {
        e.preventDefault();
        if (validarEstadoActual()) ejecutarFlujoCalculo();
    });

    dom.btnPDF.addEventListener('click', exportarPDF);
    dom.btnWS.addEventListener('click', enviarWhatsApp);
});

function inicializarApp() {
    llenarSelect();
    cargarPersistencia();
    actualizarReglasNegocio();
    validarEstadoActual();
}

/* =========================================
   LÓGICA CORE
   ========================================= */
function llenarSelect() {
    // 🔧 MEJORA: Limpieza preventiva
    dom.selServicio.innerHTML = '<option value="" disabled selected>Selecciona una opción</option>';
    
    PRODUCTOS.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.text = `${p.nombre} (${formatCurrency(p.precio)})`;
        dom.selServicio.appendChild(opt);
    });
}

function actualizarReglasNegocio() {
    const producto = PRODUCTOS.find(p => p.id === state.ui.servicioId);
    if (producto && !producto.permiteDescuento) {
        state.ui.descuento = 0;
        dom.inDescuento.value = 0;
        dom.inDescuento.disabled = true;
    } else {
        dom.inDescuento.disabled = false;
    }
}

function validarEstadoActual() {
    state.errores = { servicio: '', cantidad: '', descuento: '' };
    let esValido = true;

    if (!state.ui.servicioId) {
        state.errores.servicio = "Selecciona un servicio comercial.";
        esValido = false;
    }

    if (state.ui.cantidad < 1 || state.ui.cantidad > state.config.maxCantidad) {
        state.errores.cantidad = `Cantidad inválida (Rango 1 - ${state.config.maxCantidad}).`;
        esValido = false;
    }

    if (state.ui.descuento < 0 || state.ui.descuento > state.config.maxDesc) {
        state.errores.descuento = `Máximo descuento permitido: ${state.config.maxDesc}%.`;
        esValido = false;
    }

    pintarFeedbackUI();
    return esValido;
}

/**
 * 🔧 MEJORA: Sincronización de clases .error con el estado
 */
function pintarFeedbackUI() {
    Object.keys(state.errores).forEach(key => {
        const input = dom[`in${key.charAt(0).toUpperCase() + key.slice(1)}`] || dom.selServicio;
        const msgEl = document.getElementById(`error-${key}`);
        
        if (state.errores[key]) {
            msgEl.innerText = state.errores[key];
            msgEl.style.display = 'block';
            input.classList.add('error');
        } else {
            msgEl.style.display = 'none';
            input.classList.remove('error');
        }
    });
}

function ejecutarFlujoCalculo() {
    const producto = PRODUCTOS.find(p => p.id === state.ui.servicioId);
    const subtotal = producto.precio * state.ui.cantidad;
    const ahorro = subtotal * (state.ui.descuento / 100);
    const totalConDesc = subtotal - ahorro;
    const iva = totalConDesc * state.config.iva;

    state.ultimoCalculo = {
        nombre: producto.nombre,
        subtotal, ahorro, iva,
        total: totalConDesc + iva
    };

    renderizarUIResultados();
}

function renderizarUIResultados() {
    const res = state.ultimoCalculo;
    document.getElementById('view-servicio').innerText = res.nombre;
    document.getElementById('view-cantidad').innerText = state.ui.cantidad;
    document.getElementById('res-subtotal').innerText = formatCurrency(res.subtotal);
    document.getElementById('res-descuento').innerText = `-${formatCurrency(res.ahorro)}`;
    document.getElementById('res-iva').innerText = formatCurrency(res.iva);
    document.getElementById('res-total').innerText = formatCurrency(res.total);
    document.getElementById('fecha-actual').innerText = `Fecha: ${new Date().toLocaleDateString()}`;

    dom.resumen.style.display = 'block';
    dom.controles.style.display = 'grid';
}

/* =========================================
   AUXILIARES (PERSISTENCIA Y EXPORTACIÓN)
   ========================================= */
function guardarPersistencia() {
    localStorage.setItem('cotizador_master_state', JSON.stringify(state.ui));
}

function cargarPersistencia() {
    const saved = JSON.parse(localStorage.getItem('cotizador_master_state'));
    if (saved) {
        state.ui = saved;
        dom.selServicio.value = saved.servicioId;
        dom.inCantidad.value = saved.cantidad;
        dom.inDescuento.value = saved.descuento;
    }
}

async function exportarPDF() {
    const el = document.getElementById('cotizacion-master');
    const inputs = document.querySelector('.ui-inputs');
    const controles = document.getElementById('controles-finales');

    inputs.style.display = 'none';
    controles.style.display = 'none';

    try {
        await html2pdf().set({ 
            margin: 10, filename: 'Cotizacion_Pro.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 3 }, // Ultra alta definición
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).from(el).save();
    } catch (e) {
        alert("Hubo un error al generar el PDF.");
    } finally {
        inputs.style.display = 'block';
        controles.style.display = 'grid';
    }
}

function enviarWhatsApp() {
    const res = state.ultimoCalculo;
    if (!res) return;
    const msg = `🚀 *Cotización Profesional*%0A*Concepto:* ${res.nombre}%0A*Cantidad:* ${state.ui.cantidad}%0A*Total:* ${formatCurrency(res.total)}%0A_Generado vía Cotizador Pro_`;
    window.open(`https://wa.me/?text=${msg}`, '_blank');
}