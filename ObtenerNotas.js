// ==UserScript==
// @name         Mostrar Notas
// @namespace    http://tampermonkey.net/
// @license MIT
// @version      0.1.4
// @description  Script para mostrar las notas actuales de todos los usuarios en el scoreboard del CTFd.
// @author       Neftalí Toledo
// @match        https://ic.catedras.linti.unlp.edu.ar/scoreboard
// @icon         https://www.google.com/s2/favicons?sz=64&domain=edu.ar
// @grant        none
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/neftalito/NotasCiberseguridadTampermonkey/main/ObtenerNotas.js
// @downloadURL  https://raw.githubusercontent.com/neftalito/NotasCiberseguridadTampermonkey/main/ObtenerNotas.js
// ==/UserScript==

(async function() {
    'use strict';
    const ENDPOINT = "https://ic.catedras.linti.unlp.edu.ar/api/v1/users/USER_ID/solves";
    const RETOS_ENDPOINT = "https://ic.catedras.linti.unlp.edu.ar/api/v1/challenges"

    async function obtenerRetosResueltos(user) {
        const req = ENDPOINT.replace("USER_ID", user);
        const response = await fetch(req);
        const data = await response.json();
        return data;
    }

    function obtenerPromedio(retos_resueltos, totalRetos) {
        return (retos_resueltos / totalRetos) * 10;
    }

    // Obtener el total de retos
    const response = await fetch(RETOS_ENDPOINT);
    const retosData = await response.json();
    const cantRetos = retosData.data.length;

    // Obtenemos la tabla de usuarios y sus filas
    const tablaUsuarios = document.querySelector(".table-striped");
    const filas = tablaUsuarios.querySelectorAll("tr");

    // Añadir columna de notas
    const columnaNotas = document.createElement("td");
    columnaNotas.setAttribute("scope", "col");
    columnaNotas.innerHTML = "<b>Notas</b>";
    filas[0].appendChild(columnaNotas);

    // Obtener las notas de cada usuario
    const userPromises = [];
    for (let i = 1; i < filas.length; i++) {
        //A veces este link cambia a "https://ic.catedras.linti.unlp.edu.ar/teams/" en vez de "https://ic.catedras.linti.unlp.edu.ar/users/"
        // No se por qué pasa
        const userID = parseInt(filas[i].querySelector("td a").href.replace("https://ic.catedras.linti.unlp.edu.ar/users/", ""));
        userPromises.push(obtenerRetosResueltos(userID));
    }

    // Esperar a que se resuelvan todas las promesas
    const userNotes = await Promise.all(userPromises);

    // Añadir notas a cada fila
    for (let i = 1; i < filas.length; i++) {
        const elementoNota = document.createElement("td");
        const promedio = obtenerPromedio(userNotes[i - 1].data.length, cantRetos);
        elementoNota.innerHTML = parseFloat(promedio).toPrecision(3);
        filas[i].appendChild(elementoNota);
    }
})();
