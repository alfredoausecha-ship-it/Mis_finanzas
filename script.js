let datos = JSON.parse(localStorage.getItem('finanzas_v6')) || { ingresos: [], gastos: [], ahorros: [] };
let chartTorta, chartBarras;

document.addEventListener('DOMContentLoaded', () => {
    inicializarGraficos();
    actualizarTodo();
});

// Control de ventanas
function mostrarVentana(id) {
    document.querySelectorAll('.ventana').forEach(v => v.style.display = 'none');
    document.getElementById('ventana-' + id).style.display = 'block';
    actualizarTodo();
}

function toggleDiaVencimiento() {
    const tipo = document.getElementById('gasto-tipo').value;
    const inputDia = document.getElementById('gasto-dia');
    if(tipo === 'Fijo') {
        inputDia.style.display = 'block';
    } else {
        inputDia.style.display = 'none';
        inputDia.value = '';
    }
}

// LÓGICA DE GUARDAR / EDITAR
function guardarDato(tipo) {
    const idEdit = document.getElementById(`edit-${tipo}-id`).value;
    const nombre = document.getElementById(`${tipo}-nombre`).value.trim();
    const monto = parseFloat(document.getElementById(`${tipo}-monto`).value);
    
    if (!nombre || isNaN(monto) || monto <= 0) {
        return alert("Ingresa un nombre y un monto válido.");
    }

    const nuevoItem = {
        id: idEdit ? parseInt(idEdit) : Date.now(),
        nombre: nombre,
        monto: monto,
        tipoGasto: tipo === 'gasto' ? document.getElementById('gasto-tipo').value : null,
        diaPago: tipo === 'gasto' ? parseInt(document.getElementById('gasto-dia').value) : null,
        pagado: false
    };

    if(tipo === 'gasto' && nuevoItem.tipoGasto === 'Fijo') {
        if(!nuevoItem.diaPago || nuevoItem.diaPago < 1 || nuevoItem.diaPago > 31) {
            return alert("Para gastos fijos, ingresa un día de pago válido (1-31).");
        }
    }

    if(idEdit) {
        const index = datos[tipo+'s'].findIndex(x => x.id === parseInt(idEdit));
        nuevoItem.pagado = datos[tipo+'s'][index].pagado;
        datos[tipo+'s'][index] = nuevoItem;
    } else {
        datos[tipo + "s"].push(nuevoItem);
    }
    
    cancelarEdicion(tipo);
    guardarEnMemoria();
}

function editarItem(tipo, id) {
    mostrarVentana(tipo + 's');
    const item = datos[tipo+'s'].find(x => x.id === id);
    
    document.getElementById(`${tipo}-nombre`).value = item.nombre;
    document.getElementById(`${tipo}-monto`).value = item.monto;
    document.getElementById(`edit-${tipo}-id`).value = item.id;
    
    if(tipo === 'gasto') {
        document.getElementById('gasto-tipo').value = item.tipoGasto;
        toggleDiaVencimiento();
        if(item.tipoGasto === 'Fijo') document.getElementById('gasto-dia').value = item.diaPago;
    }

    document.getElementById(`btn-submit-${tipo}`).innerText = "Actualizar";
    document.getElementById(`btn-cancelar-${tipo}`).style.display = 'block';
}

function cancelarEdicion(tipo) {
    document.getElementById(`${tipo}-nombre`).value = '';
    document.getElementById(`${tipo}-monto`).value = '';
    document.getElementById(`edit-${tipo}-id`).value = '';
    if(tipo === 'gasto') {
        document.getElementById('gasto-tipo').value = 'Variable';
        toggleDiaVencimiento();
    }
    document.getElementById(`btn-submit-${tipo}`).innerText = tipo === 'ingreso' ? 'Añadir Ingreso' : (tipo === 'gasto' ? 'Registrar Gasto' : 'Apartar Ahorro');
    document.getElementById(`btn-cancelar-${tipo}`).style.display = 'none';
}

function eliminarItem(tipo, id) {
    if(confirm("¿Seguro que quieres eliminar este registro?")) {
        datos[tipo + "s"] = datos[tipo + "s"].filter(i => i.id !== id);
        guardarEnMemoria();
    }
}

function togglePago(id) {
    const gasto = datos.gastos.find(g => g.id === id);
    gasto.pagado = !gasto.pagado;
    guardarEnMemoria();
}

function guardarEnMemoria() {
    localStorage.setItem('finanzas_v6', JSON.stringify(datos));
    actualizarTodo();
}

// LÓGICA DE DIBUJADO Y CÁLCULOS
function actualizarTodo() {
    let tIng = 0, tGas = 0, tAho = 0;
    const listaIng = document.getElementById('lista-ingresos');
    const listaGas = document.getElementById('lista-gastos');
    const listaAho = document.getElementById('lista-ahorros');
    const alertaPend = document.getElementById('alerta-pendientes');
    
    const diaActual = new Date().getDate();

    listaIng.innerHTML = ''; listaGas.innerHTML = ''; listaAho.innerHTML = ''; alertaPend.innerHTML = '';

    datos.ingresos.forEach(i => {
        tIng += i.monto;
        listaIng.innerHTML += `
            <div class="item-dato">
                <div class="item-info"><b>${i.nombre}</b></div>
                <div class="item-acciones">
                    <b style="color:var(--verde)">$ ${i.monto}</b>
                    <button class="btn-icon" onclick="editarItem('ingreso', ${i.id})">✏️</button>
                    <button class="btn-icon" onclick="eliminarItem('ingreso', ${i.id})">❌</button>
                </div>
            </div>`;
    });

    datos.gastos.sort((a,b) => (a.diaPago || 99) - (b.diaPago || 99)).forEach(g => {
        tGas += g.monto;
        
        let badgeHTML = '';
        if(g.tipoGasto === 'Fijo') {
            badgeHTML = `<span class="badge ${g.pagado ? 'ok' : 'pendiente'}">${g.pagado ? 'PAGADO' : 'DÍA ' + g.diaPago}</span>`;
            
            if(!g.pagado) {
                let diff = g.diaPago - diaActual;
                if(diff < 0) {
                    alertaPend.innerHTML += `<div class="alerta-item alerta-roja">⚠️ Atrasado: ${g.nombre} ($${g.monto}) <button class="btn-pagar-alerta" onclick="togglePago(${g.id})">Pagar</button></div>`;
                } else if (diff >= 0 && diff <= 5) {
                    let textoDia = diff === 0 ? "¡Vence HOY!" : `Vence en ${diff} días`;
                    alertaPend.innerHTML += `<div class="alerta-item alerta-amarilla">🔔 ${textoDia}: ${g.nombre} <button class="btn-pagar-alerta" onclick="togglePago(${g.id})">Pagar</button></div>`;
                }
            }
        }

        listaGas.innerHTML += `
            <div class="item-dato ${g.pagado ? 'pagado' : ''}">
                <div class="item-info"><b>${g.nombre}</b> ${badgeHTML}</div>
                <div class="item-acciones">
                    <b style="color:var(--rojo)">$ ${g.monto}</b>
                    ${g.tipoGasto === 'Fijo' ? `<button class="btn-icon" title="Marcar Pagado" onclick="togglePago(${g.id})">${g.pagado ? '✅' : '🟩'}</button>` : ''}
                    <button class="btn-icon" onclick="editarItem('gasto', ${g.id})">✏️</button>
                    <button class="btn-icon" onclick="eliminarItem('gasto', ${g.id})">❌</button>
                </div>
            </div>`;
    });

    datos.ahorros.forEach(a => {
        tAho += a.monto;
        listaAho.innerHTML += `
            <div class="item-dato">
                <div class="item-info"><b>${a.nombre}</b></div>
                <div class="item-acciones">
                    <b style="color:var(--azul)">$ ${a.monto}</b>
                    <button class="btn-icon" onclick="editarItem('ahorro', ${a.id})">✏️</button>
                    <button class="btn-icon" onclick="eliminarItem('ahorro', ${a.id})">❌</button>
                </div>
            </div>`;
    });

    const libre = tIng - tGas - tAho;
    document.getElementById('home-libre').innerText = `$ ${libre.toLocaleString()}`;
    document.getElementById('home-ingresos').innerText = `$ ${tIng.toLocaleString()}`;
    document.getElementById('home-fijos').innerText = `$ ${tGas.toLocaleString()}`;
    document.getElementById('home-ahorros').innerText = `$ ${tAho.toLocaleString()}`;

    actualizarGraficos(tIng, tGas, libre, tAho);
    document.getElementById('fecha-actual').innerText = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

// INICIALIZACIÓN DE GRÁFICOS (Chart.js)
function inicializarGraficos() {
    const ctxTorta = document.getElementById('graficoTorta').getContext('2d');
    chartTorta = new Chart(ctxTorta, {
        type: 'doughnut',
        data: {
            labels: ['Gastos + Ahorro', 'Libre'],
            datasets: [{ data: [0, 1], backgroundColor: ['#F44336', '#1A237E'], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: {boxWidth: 10, font: {size: 11}} } } }
    });

    const ctxBarras = document.getElementById('graficoBarras').getContext('2d');
    chartBarras = new Chart(ctxBarras, {
        type: 'bar',
        data: {
            labels: ['Ingresos', 'Gastos'],
            datasets: [{ data: [0, 0], backgroundColor: ['#4CAF50', '#F44336'], borderRadius: 5 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { display: false } } }
    });
}

function actualizarGraficos(tIng, tGas, libre, tAho) {
    if(!chartTorta || !chartBarras) return;
    
    chartTorta.data.datasets[0].data = [tGas + tAho, libre > 0 ? libre : 0];
    chartTorta.update();

    chartBarras.data.datasets[0].data = [tIng, tGas];
    chartBarras.update();
}