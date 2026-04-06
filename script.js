// --- ESTADO INICIAL ---
let db = JSON.parse(localStorage.getItem('productsDB')) || {};
let currentInput = "0";
let cantidad = 1;
let ivaActivo = false;
let ganancia = 0; 

const nameInput = document.getElementById('product-name');
const formulaDisplay = document.getElementById('formula-display');
const resultDisplay = document.getElementById('result-display');
const syncModal = document.getElementById('sync-modal');
const syncArea = document.getElementById('sync-area');

let suggestionsContainer = document.getElementById('suggestions-list');
if (!suggestionsContainer) {
    suggestionsContainer = document.createElement('div');
    suggestionsContainer.id = 'suggestions-list';
    suggestionsContainer.className = 'suggestions-list';
    nameInput.parentNode.appendChild(suggestionsContainer);
}

// --- LÓGICA DE TECLADO (CORREGIDA PARA EL PUNTO VISUAL) ---

function addNumber(num) {
    // Si presionan coma, la tratamos como punto
    if (num === ',') num = '.';

    // 1. Validar que no haya doble punto
    if (num === '.' && currentInput.includes('.')) return;

    // 2. Actualizar el valor de texto
    if (currentInput === "0" && num !== '.') {
        currentInput = num;
    } else {
        currentInput += num;
    }
    
    // 3. ACTUALIZACIÓN VISUAL INMEDIATA
    // Mostramos el texto tal cual (con el punto al final si existe)
    renderScreens(currentInput);
}

function renderScreens(textoMostrar) {
    let precio = parseFloat(textoMostrar) || 0;
    let unitario = precio / cantidad;
    let valorIVA = ivaActivo ? unitario * 0.16 : 0;
    let pvp = (unitario + valorIVA) * (1 + ganancia / 100);
    
    // Aquí está el truco: usamos 'textoMostrar' para la fórmula, así el punto se queda
    formulaDisplay.innerText = `${textoMostrar} / ${cantidad} + IVA(${ivaActivo ? '16%' : '0%'}) + G(${ganancia}%)`;
    resultDisplay.innerText = `PVP: ${pvp.toFixed(2)}`;
}

// Re-calcula cuando cambian otros valores (IVA, Cantidad, etc.)
function calculatePVP() {
    renderScreens(currentInput);
}

function backspace() {
    currentInput = currentInput.length > 1 ? currentInput.slice(0, -1) : "0";
    calculatePVP();
}

function changeCant() {
    let val = prompt("Cantidad de productos:", cantidad);
    if (val !== null && !isNaN(val) && val > 0) {
        cantidad = parseFloat(val);
        calculatePVP();
    }
}

function toggleIVA() {
    ivaActivo = !ivaActivo;
    const btnIva = document.getElementById('btn-iva');
    if(btnIva) btnIva.classList.toggle('active', ivaActivo);
    calculatePVP();
}

function setGain(val) {
    ganancia = val;
    document.querySelectorAll('.btn-perc').forEach(b => b.classList.remove('active'));
    const btnGain = document.getElementById(`btn-${val}`);
    if(btnGain) btnGain.classList.add('active');
    calculatePVP();
}

// --- PERSISTENCIA Y AUTOCOMPLETADO ---

function saveProduct() {
    const name = nameInput.value.trim();
    if (!name) return alert("Escribe un nombre de producto");

    db[name] = {
        precio: currentInput,
        cantidad: cantidad,
        iva: ivaActivo,
        ganancia: ganancia,
        fecha: new Date().toLocaleString()
    };
    
    localStorage.setItem('productsDB', JSON.stringify(db));
    alert("¡Producto guardado!");
}

function deleteProduct() {
    const name = nameInput.value.trim();
    if (db[name] && confirm(`¿Eliminar "${name}"?`)) {
        delete db[name];
        localStorage.setItem('productsDB', JSON.stringify(db));
        resetCalc();
    }
}

nameInput.addEventListener('input', function() {
    const query = this.value.toLowerCase().trim();
    suggestionsContainer.innerHTML = ""; 
    if (query === "") {
        suggestionsContainer.style.display = "none";
        return;
    }
    const matches = Object.keys(db).filter(name => name.toLowerCase().includes(query));
    if (matches.length === 0) {
        suggestionsContainer.style.display = "none";
        return;
    }
    suggestionsContainer.style.display = "block";
    matches.forEach(name => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.textContent = name;
        div.onclick = () => {
            nameInput.value = name;
            loadProductData(name);
            suggestionsContainer.innerHTML = "";
            suggestionsContainer.style.display = "none";
        };
        suggestionsContainer.appendChild(div);
    });
});

function loadProductData(name) {
    const p = db[name];
    currentInput = p.precio.toString(); // Aseguramos que sea texto
    cantidad = p.cantidad;
    ivaActivo = p.iva;
    ganancia = p.ganancia;
    
    const btnIva = document.getElementById('btn-iva');
    if(btnIva) btnIva.classList.toggle('active', ivaActivo);
    
    document.querySelectorAll('.btn-perc').forEach(b => b.classList.remove('active'));
    if (ganancia > 0) {
        const btn = document.getElementById(`btn-${ganancia}`);
        if(btn) btn.classList.add('active');
    }
    calculatePVP();
}

function resetCalc() {
    currentInput = "0";
    cantidad = 1;
    ivaActivo = false;
    ganancia = 0;
    nameInput.value = "";
    const btnIva = document.getElementById('btn-iva');
    if(btnIva) btnIva.classList.remove('active');
    document.querySelectorAll('.btn-perc').forEach(b => b.classList.remove('active'));
    calculatePVP();
}

// --- SINCRONIZACIÓN (MODAL) ---

function exportJSON() {
    const data = JSON.stringify(db);
    syncArea.value = data;
    syncModal.style.display = 'flex';
    setTimeout(() => { syncArea.focus(); syncArea.select(); }, 100);
}

function importJSON() {
    syncArea.value = "";
    syncModal.style.display = 'flex';
}

function procesarImportacion() {
    const data = syncArea.value.trim();
    try {
        const parsed = JSON.parse(data);
        db = { ...db, ...parsed };
        localStorage.setItem('productsDB', JSON.stringify(db));
        alert("¡Importación exitosa!");
        location.reload();
    } catch (e) {
        alert("Error en el código.");
    }
}

function cerrarModal() {
    syncModal.style.display = 'none';
}

// --- EXCEL ---

function exportExcel() {
    let csv = "\ufeff"; 
    csv += "Nombre;Precio Compra;Cantidad;IVA;Ganancia %;PVP Final;Fecha\n";
    Object.keys(db).forEach(name => {
        const p = db[name];
        let precio = parseFloat(p.precio) || 0;
        let unitario = precio / p.cantidad;
        let valorIVA = p.iva ? unitario * 0.16 : 0;
        let pvp = (unitario + valorIVA) * (1 + p.ganancia / 100);
        csv += `${name.replace(/;/g, ",")};${p.precio};${p.cantidad};${p.iva?'16%':'0%'};${p.ganancia}%;${pvp.toFixed(2)};${p.fecha}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Bodega_Inventario.csv`;
    a.click();
}