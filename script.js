// 1. IMPORTAR LIBRERÍAS DE FIREBASE (Desde la nube)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 2. TUS LLAVES (REEMPLAZA ESTO CON LO QUE COPIASTE)
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
let db = {}; // Ahora vive en la nube
let currentInput = "0";
let cantidad = 1;
let ivaActivo = false;
let ganancia = 0; 

const nameInput = document.getElementById('product-name');
const formulaDisplay = document.getElementById('formula-display');
const resultDisplay = document.getElementById('result-display');

// --- ESCUCHAR CAMBIOS EN TIEMPO REAL ---
// Esto hace que si grabas en el Celular 1, el Celular 2 se actualice solo
onValue(dbRef, (snapshot) => {
    const data = snapshot.val();
    db = data || {};
    console.log("Inventario actualizado desde la nube");
});

// --- FUNCIONES DE TECLADO ---
window.addNumber = function(num) {
    if (num === ',') num = '.';
    if (num === '.' && currentInput.includes('.')) return;
    if (currentInput === "0" && num !== '.') currentInput = num;
    else currentInput += num;
    renderScreens(currentInput);
};

function renderScreens(textoMostrar) {
    let precio = parseFloat(textoMostrar) || 0;
    let unitario = precio / cantidad;
    let valorIVA = ivaActivo ? unitario * 0.16 : 0;
    let pvp = (unitario + valorIVA) * (1 + ganancia / 100);
    formulaDisplay.innerText = `${textoMostrar} / ${cantidad} + IVA(${ivaActivo ? '16%' : '0%'}) + G(${ganancia}%)`;
    resultDisplay.innerText = `PVP: ${pvp.toFixed(2)}`;
}

window.calculatePVP = () => renderScreens(currentInput);

window.backspace = function() {
    currentInput = currentInput.length > 1 ? currentInput.slice(0, -1) : "0";
    renderScreens(currentInput);
};

window.toggleIVA = function() {
    ivaActivo = !ivaActivo;
    document.getElementById('btn-iva').classList.toggle('active', ivaActivo);
    renderScreens(currentInput);
};

window.setGain = function(val) {
    ganancia = val;
    document.querySelectorAll('.btn-perc').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-${val}`).classList.add('active');
    renderScreens(currentInput);
};

// --- GUARDAR EN LA NUBE (FIREBASE) ---
window.saveProduct = function() {
    const name = nameInput.value.trim();
    if (!name) return alert("Escribe un nombre");

    const newProduct = {
        precio: currentInput,
        cantidad: cantidad,
        iva: ivaActivo,
        ganancia: ganancia,
        fecha: new Date().toLocaleString()
    };

    // Esto lo envía a internet para todos los celulares
    set(ref(database, 'productos/' + name), newProduct)
        .then(() => alert("¡Guardado en la Nube!"))
        .catch(() => alert("Error al sincronizar"));
};

window.deleteProduct = function() {
    const name = nameInput.value.trim();
    if (db[name] && confirm(`¿Eliminar "${name}" de todos los celulares?`)) {
        remove(ref(database, 'productos/' + name));
        resetCalc();
    }
};

// --- AUTOCOMPLETADO (USA LA DATA DE LA NUBE) ---
nameInput.addEventListener('input', function() {
    const query = this.value.toLowerCase().trim();
    const suggestionsContainer = document.getElementById('suggestions-list');
    suggestionsContainer.innerHTML = ""; 
    
    if (query === "") return suggestionsContainer.style.display = "none";

    const matches = Object.keys(db).filter(name => name.toLowerCase().includes(query));
    if (matches.length > 0) {
        suggestionsContainer.style.display = "block";
        matches.forEach(name => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.textContent = name;
            div.onclick = () => {
                nameInput.value = name;
                loadProductData(name);
                suggestionsContainer.style.display = "none";
            };
            suggestionsContainer.appendChild(div);
        });
    }
});

function loadProductData(name) {
    const p = db[name];
    currentInput = p.precio;
    cantidad = p.cantidad;
    ivaActivo = p.iva;
    ganancia = p.ganancia;
    renderScreens(currentInput);
}

window.resetCalc = function() {
    currentInput = "0";
    cantidad = 1;
    ivaActivo = false;
    ganancia = 0;
    nameInput.value = "";
    renderScreens(currentInput);
};

// --- EXCEL ---
window.exportExcel = function() {
    let csv = "\ufeffName;Cost;Cant;IVA;Gain;PVP;Date\n";
    Object.keys(db).forEach(name => {
        const p = db[name];
        let pvp = (parseFloat(p.precio)/p.cantidad + (p.iva?p.precio/p.cantidad*0.16:0))*(1+p.ganancia/100);
        csv += `${name};${p.precio};${p.cantidad};${p.iva?'16%':'0%'};${p.ganancia}%;${pvp.toFixed(2)};${p.fecha}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Inventario_Nube.csv';
    a.click();
};