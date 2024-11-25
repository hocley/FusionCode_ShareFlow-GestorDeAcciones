import { attemptPurchase } from './integration/stockPurchases.js';
import { updateTable, deletePurchase} from './integration/updateTables.js';
import { fetchAndDisplaySearchResults } from './integration/updatePanel.js';

// Selecciona el botón de alternar menú y el panel de búsqueda
const menuToggle = document.querySelector('.menu-toggle');
const searchPanel = document.querySelector('.search-panel');
const validateBtn = document.querySelector('.trading__validate-btn');
const validationList = document.querySelector('.trading__validation-list');
const validationItem = document.querySelector('.trading__validation-item');
const buyBtn = document.querySelector('.trading__buy-btn');
const refreshBtn = document.querySelector('.transactions__refresh-btn');
const searchBtn = document.querySelector('.search-panel__btn');

// Variable para almacenar el símbolo actual
let symbolTemp = '';
let validated = false;

function isValidated() {
    const sharesItem = document.createElement('li');
    sharesItem.classList.add('trading__validation-item');
    if (!validated) {
        sharesItem.textContent = 'Debe validar el símbolo';
        validationList.appendChild(sharesItem);    
        return false;
    }
    return true;
}

function validateSymbolChange(tradingSymbol) {
    
    const sharesItem = document.createElement('li');
    
    sharesItem.classList.add('trading__validation-item');
    
    if (tradingSymbol.toUpperCase() !== symbolTemp.toUpperCase()) {
        sharesItem.textContent = 'Debe validar el símbolo';
        validationList.appendChild(sharesItem);
        return false;
    }
    return true;
}

function validatePricePerShare(pricePerShare) {
    const sharesItem = document.createElement('li');
    sharesItem.classList.add('trading__validation-item');

    if (pricePerShare < 0.01 || isNaN(pricePerShare)) {
        sharesItem.textContent = 'El precio debe ser mayor o igual a $0.01';
        validationList.appendChild(sharesItem);
        return false;
    }
    return true;
}

function validateNumberOfShares(numberOfShares) {
    const sharesItem = document.createElement('li');
    sharesItem.classList.add('trading__validation-item');

    if (numberOfShares < 1 || isNaN(numberOfShares)) {
        sharesItem.textContent = 'Debe comprar al menos una acción';
        validationList.appendChild(sharesItem);
        return false;
    }
    return true;
}


// Define the isSymbolEmpty function
function isSymbolEmpty(symbol) {
    return symbol === '';
}

async function validateSymbol(symbol) {
    const url = `http://localhost:3000/api/search-name/${symbol}`;
    const sharesItem = document.createElement('li');
    const error = 'Error en la búsqueda';

    sharesItem.classList.add('trading__validation-item');

    if (!isSymbolEmpty(symbol)) {
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.error === error) {
                sharesItem.textContent = 'El símbolo no existe';
                validationList.appendChild(sharesItem);
                return 0;
            } else {
                symbolTemp = symbol;
                return data.name;
            }
        } catch (error) {
            sharesItem.textContent = 'El símbolo no existe';
            validationList.appendChild(sharesItem);
            return -1;
        }
    } else {
        sharesItem.textContent = 'Debe insertar un símbolo';
        validationList.appendChild(sharesItem);
        return -1;
    }
}

// Agrega un evento de clic al botón de alternar menú para mostrar/ocultar el panel de búsqueda
menuToggle.addEventListener('click', () => {
    searchPanel.classList.toggle('search-panel--active');
});

// Agrega un evento de clic al botón de validar
validateBtn.addEventListener('click', async () => {
    const tradingSymbol = document.querySelector('.trading-symbol').value;
    const companyName = document.querySelector('.company-name');
    
    // Limpiar todos los items de la lista de validación
    validationList.innerHTML = '';
    
    // Cambiar el texto del botón de validar
    validateBtn.textContent = 'Validando...';
    
    let data = await validateSymbol(tradingSymbol.toUpperCase());
    
    if (data === 0 || data === -1) {
        validationList.style.display = 'flex';
        validationItem.style.display = 'flex';
    } else {
        companyName.value = data;
        validationList.style.display = 'none';
        validationItem.style.display = 'none';
        validated = true;
    }

    validateBtn.textContent = 'Validar';
});

// Agrega un evento de clic al botón de comprar
buyBtn.addEventListener('click', async (event) => {

    const tradingSymbol = document.querySelector('.trading-symbol').value;
    const companyName = document.querySelector('.company-name').value;
    const pricePerShare = parseFloat(document.querySelector('.price-share').value);
    const numberOfShares = parseInt(document.querySelector('.number-shares').value);

    event.preventDefault(); // Evita el envío del formulario por defecto

    // Limpiar todos los items de la lista de validación
    validationList.innerHTML = '';

    if (!isValidated() || !validateSymbolChange(tradingSymbol)) {
        validationList.style.display = 'flex';
        validationItem.style.display = 'flex';
    } else if (!validatePricePerShare(pricePerShare) || !validateNumberOfShares(numberOfShares)) {
        validationList.style.display = 'flex';
        validationItem.style.display = 'flex';
    } else {
        const result = await attemptPurchase(tradingSymbol.toUpperCase(), companyName, pricePerShare, numberOfShares);
        console.log(result.success);
        if (result.success) {
            
            document.querySelector('.trading-symbol').value = '';
            document.querySelector('.company-name').value = '';
            document.querySelector('.price-share').value = '';
            document.querySelector('.number-shares').value = '';

            symbolTemp = '';
            validated = false;
            
            const tableUpdated = await updateTable();
            
            if (!tableUpdated.success) {
                const sharesItem = document.createElement('li');
                sharesItem.classList.add('trading__validation-item');
                sharesItem.textContent = tableUpdated.message;
                validationList.appendChild(sharesItem);
            }
            
        } else {
            const sharesItem = document.createElement('li');
            sharesItem.classList.add('trading__validation-item');
            sharesItem.textContent = result.message;
            validationList.appendChild(sharesItem);
        }
    }
});

refreshBtn.addEventListener('click', async () => {
    const tableUpdated = await updateTable();
    if (!tableUpdated.success) {
        const sharesItem = document.createElement('li');
        sharesItem.classList.add('trading__validation-item');
        sharesItem.textContent = tableUpdated.message;
        validationList.appendChild(sharesItem);
    }
});

searchBtn.addEventListener('click', async () => {
    const searchQuery = document.querySelector('.search-panel__input').value;

    if (!searchQuery.trim()) {
        console.error('Search query is empty');
        return;
    }
    console.log(searchQuery);
    const result = await fetchAndDisplaySearchResults(searchQuery);
    console.log(result);
    if (!result.success) {
        //TODO MOSTRAR VENTANA MODAL
        console.error(result.message);
    }
});

// Agrega un evento de clic al botón de actualizar tabla
document.addEventListener('DOMContentLoaded', () => {

    // Agregar la delegación de eventos para los botones de eliminar
    document.querySelector('.transactions__table').addEventListener('click', async (event) => {
        const deleteBtn = event.target.closest('.transactions__delete-btn');
        if (deleteBtn) {
            const id = deleteBtn.id;
            await deletePurchase(id);
            await updateTable();
        }
    });
});

// Llamar a la función updateTable al cargar la página
window.addEventListener('load', updateTable);