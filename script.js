// 1. IMPORTAR LIBRERÍAS DE FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// 3. INICIALIZAR FIREBASE
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
const resultDisplay = document.getElementById('result-display');

// Contenedor de sugerencias dinámico
let suggestionsContainer = document.getElementById('suggestions-list');
if (!suggestionsContainer) {
    suggestionsContainer = document.createElement('div');
    suggestionsContainer.id = 'suggestions-list';
    suggestionsContainer.className = 'suggestions-list';
    nameInput.parentNode.appendChild(suggestionsContainer);
}

// --- ESCUCHAR CAMBIOS EN TIEMPO REAL ---
onValue(dbRef, (snapshot) => {
    const data = snapshot.val();
    db = data || {};
    console.log("Inventario sincronizado");
});

// --- FUNCIONES DE PANTALLA ---
function renderScreens(textoMostrar) {
    let precio = parseFloat(textoMostrar) || 0;
    let unitario = precio / cantidad;
    let valorIVA = ivaActivo ? unitario * 0.16 : 0;
    let pvp = (unitario + valorIVA) * (1 + ganancia / 100);
    
    formulaDisplay.innerText = `${textoMostrar} / ${cantidad} + IVA(${ivaActivo ? '16%' : '0%'}) + G(${ganancia}%)`;
    resultDisplay.innerText = `PVP: ${pvp.toFixed(2)}`;
}

// --- BOTONES (Conectados al HTML mediante window) ---

window.addNumber = function(num) {
    if (num === ',') num = '.';
    if (num === '.' && currentInput.includes('.')) return;
    if (currentInput === "0" && num !== '.') currentInput = num;
    else currentInput += num;
    renderScreens(currentInput);
};

window.backspace = function() {
    currentInput = currentInput.length > 1 ? currentInput.slice(0, -1) : "0";
    renderScreens(currentInput);
};

window.changeCant = function() {
    let val = prompt("Cantidad de productos:", cantidad);
    if (val !== null && !isNaN(val) && val > 0) {
        cantidad = parseFloat(val);
        renderScreens(currentInput);
    }
};

window.toggleIVA = function() {
    ivaActivo = !ivaActivo;
    document.getElementById('btn-iva').classList.toggle('active', ivaActivo);
    renderScreens(currentInput);
};

window.setGain = function(val) {
    ganancia = val;
    document.querySelectorAll('.btn-perc').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`btn-${val}`);
    if(btn) btn.classList.add('active');
    renderScreens(currentInput);
