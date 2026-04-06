// 1. IMPORTAR LIBRERÍAS DE FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 2. TUS LLAVES (VERIFICADAS)
const firebaseConfig = {
  apiKey: "AIzaSyAfFUdqMlbXW4hEA0yMAyxdvIFndFR5u2M",
  authDomain: "calculadora-pvp-3c085.firebaseapp.com",
  projectId: "calculadora-pvp-3c085",
  storageBucket: "calculadora-pvp-3c085.firebasestorage.app",
  messagingSenderId: "920731742944",
  appId: "1:920731742944:web:5c1f2ec7db5c81f9909685",
  measurementId: "G-LCTM06T7EF"
};

// 3. INICIALIZAR
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const dbRef = ref(database, 'productos');

// --- ESTADO INICIAL ---
let db = {}; 
let currentInput = "0";
let cantidad = 1;
let ivaActivo = false;
let ganancia = 0; 

const nameInput = document.getElementById('product-name');
const formulaDisplay = document.getElementById('formula-display');
const result_display = document.getElementById('result-display');
const syncModal = document.getElementById('sync-modal');
const syncArea = document.getElementById('sync-area');

// Contenedor de sugerencias
let suggestionsContainer = document.getElementById('suggestions-list');
if (!suggestionsContainer) {
    suggestionsContainer = document.createElement('div');
    suggestionsContainer.id = 'suggestions-list';
    suggestionsContainer.className = 'suggestions-list';
    nameInput.parentNode.appendChild(suggestionsContainer);
}

// --- ESCUCHAR NUBE ---
onValue(dbRef, (snapshot) => {
    db = snapshot.val() || {};
    console.log("Datos sincronizados");
});

// --- LÓGICA VISUAL ---
function renderScreens(texto) {
    let p = parseFloat(texto) || 0;
    let u = p / cantidad;
    let vI = ivaActivo ? u * 0.16 : 0;
    let pvp = (u + vI) * (1 + ganancia / 100);
    formulaDisplay.innerText = `${texto} / ${cantidad} + IVA(${ivaActivo ? '16%' : '0%'}) + G(${ganancia}%)`;
    result_display.innerText = `PVP: ${pvp.toFixed(2)}`;
}

// --- BOTONES (Asignar a window para que el HTML los vea) ---

window.addNumber = (n) => {
    if (n === ',' || n === '.') {
        if (currentInput.includes('.')) return;
        currentInput += '.';
    } else {
        currentInput = (currentInput === "0") ? n : currentInput + n;
    }
    renderScreens(currentInput);
};

window.backspace = () => {
    currentInput = currentInput.length > 1 ? currentInput.slice(0, -1) : "0";
    renderScreens(currentInput);
};

window.changeCant = () => {
    let v = prompt("Cantidad:", cantidad);
    if (v && !isNaN(v)) { cantidad = parseFloat(v); renderScreens(currentInput); }
};

window.toggleIVA = () => {
    ivaActivo = !ivaActivo;
    document.getElementById('btn-iva').classList.toggle('active', ivaActivo);
    renderScreens(currentInput);
};

window.setGain = (g) => {
    ganancia = g;
    document.querySelectorAll('.btn-perc').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-${g}`).classList.add('active');
    renderScreens(currentInput);
};

window.resetCalc = () => {
    currentInput = "0"; cantidad = 1; ivaActivo = false; ganancia = 0;
    nameInput.value = "";
    document.getElementById('btn-iva').classList.remove('active');
    document.querySelectorAll('.btn-perc').forEach(b => b.classList.remove('active'));
    renderScreens(currentInput);
};

// --- ACCIONES FIREBASE ---

window.saveProduct = () => {
    const name = nameInput.value.trim();
    if (!name) return alert("Falta nombre");
    const data = { precio: currentInput, cantidad, iva: ivaActivo, ganancia, fecha: new Date().toLocaleString() };
    set(ref(database, 'productos/' + name), data)
        .then(() => alert("¡Sincronizado!"))
        .catch(e => alert("Error: " + e.message));
};

window.deleteProduct = () => {
    const name = nameInput.value.trim();
    if (db[name] && confirm(`¿Eliminar ${name}?`)) {
        remove(ref(database, 'productos/' + name)).then(() => window.resetCalc());
    }
};

// --- MODAL (JSON / IMPORT) ---

window.exportJSON = () => {
    syncArea.value = JSON.stringify(db, null, 2);
    syncModal.style.display = 'flex';
    syncArea.select();
};

window.importJSON = () => {
    syncArea.value = "";
    syncModal.style.display = 'flex';
    syncArea.placeholder = "Pega el JSON aquí...";
};

window.procesarImportacion = () => {
    try {
        const data = JSON.parse(syncArea.value);
        update(ref(database, 'productos'), data)
            .then(() => { alert("Importación exitosa"); window.cerrarModal(); });
    } catch (e) { alert("Error en formato JSON"); }
};

window.cerrarModal = () => { syncModal.style.display = 'none'; };

// --- EXCEL ---
window.exportExcel = () => {
    let csv = "\ufeffNombre;Costo;Cant;IVA;Ganancia;PVP;Fecha\n";
    Object.keys(db).forEach(n => {
        const p = db[n];
        let u = parseFloat(p.precio)/p.cantidad;
        let pvp = (u + (p.iva ? u*0.16 : 0)) * (1 + p.ganancia/100);
        csv += `${n};${p.precio};${p.cantidad};${p.iva?'16%':'0%'};${p.ganancia}%;${pvp.toFixed(2)};${p.fecha}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Inventario_Bodega.csv';
    a.click();
};

// --- SUGERENCIAS ---
nameInput.addEventListener('input', () => {
    const q = nameInput.value.toLowerCase().trim();
    suggestionsContainer.innerHTML = "";
    if (!q) return suggestionsContainer.style.display = "none";
    const m = Object.keys(db).filter(n => n.toLowerCase().includes(q));
    if (m.length > 0) {
        suggestionsContainer.style.display = "block";
        m.forEach(n => {
            const d = document.createElement('div'); d.className = 'suggestion-item'; d.textContent = n;
            d.onclick = () => {
                nameInput.value = n;
                const p = db[n];
                currentInput = p.precio; cantidad = p.cantidad; ivaActivo = p.iva; ganancia = p.ganancia;
                document.getElementById('btn-iva').classList.toggle('active', ivaActivo);
                document.querySelectorAll('.btn-perc').forEach(b => b.classList.remove('active'));
                if(document.getElementById(`btn-${ganancia}`)) document.getElementById(`btn-${ganancia}`).classList.add('active');
                renderScreens(currentInput);
                suggestionsContainer.style.display = "none";
            };
            suggestionsContainer.appendChild(d);
        });
    }
});
