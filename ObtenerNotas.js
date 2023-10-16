// ==UserScript==
// @name         Mostrar Notas
// @namespace    http://tampermonkey.net/
// @license      MIT
// @version      0.1.51
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

    // Define los valores de suma correspondientes a cada categoría para el promedio ponderado
    //const cantidad_dificultades = 3; (SIN USO)
    const valorEasy = 4;
    const valorMedium = 3;
    const valorHard = 3;

    const valoresTotales = await obtenerValoresTotales(); //Obtiene los totales para calcular el promedio

    // Categorias que no se van a tener en cuenta para el calculo de la nota
    const categoriasExcluidas = [
        "Extras-(no-suman-nota)",
        "Practica-0_Scripting"
    ]

    //Funciones para el promedio
    function calcularPromedioPonderado(cantidadEasy, cantidadMedium, cantidadHard, categoria) {
        // Calcula la suma ponderada
        const promedioEasy = calcularPromedio(cantidadEasy, valoresTotales[categoria]["Easy"] || 1);
        const promedioMedium = calcularPromedio(cantidadMedium, valoresTotales[categoria]["Medium"] || 1);
        const promedioHard = calcularPromedio(cantidadHard, valoresTotales[categoria]["Hard"] || 1);

        const sumaPonderada = (promedioEasy * valorEasy + promedioMedium * valorMedium + promedioHard * valorHard);
      
        // Calcula el promedio ponderado
        cantidadEasy = valoresTotales[categoria]["Easy"];
        cantidadMedium = valoresTotales[categoria]["Medium"];
        cantidadHard = valoresTotales[categoria]["Hard"];

        const promedioPonderado = sumaPonderada;
        return promedioPonderado;
    }

    function calcularPromedio(retos_resueltos, total) {
        return (retos_resueltos / total);
    }

    //Funciones para filtrar los desafíos

    function filtrarDesafiosPorCategoria(data, category) {
        return data.filter(item => item.challenge.category.includes(category));
    }
    
    function filtrarDesafiosPorCategoriaYPractica(data, category, practice) {
        return data.filter(item => item.challenge.category.includes(practice + " - " + category));
    }

    function filtrarDesafios(data, total = false) {
        const result = {};
        data.forEach(item => {
            let categoria, dificultad;

            if(total){
                categoria  = item.category.split(" - ")[0];
                dificultad = item.category.split(" - ")[1];
            }else{
                categoria  = item.challenge.category.split(" - ")[0];
                dificultad = item.challenge.category.split(" - ")[1];
            }  

            result[categoria] = result[categoria] || {};

            result[categoria][dificultad] = result[categoria][dificultad] || 0;

            result[categoria][dificultad]++;

        });
        return result;
    }
    
    // Funcion para eliminar las categorias que no cuentan hacia la nota
    function excluirCategorias(categorias){
        return categorias.filter(categoria => !categoriasExcluidas.includes(categoria));
    }

    // Obtener la cantidad de retos resueltos por el usuario

    async function obtenerRetosResueltos(user) {
        const req = ENDPOINT.replace("USER_ID", user);
        const response = await fetch(req);
        const dataJSON = await response.json();
        
        return dataJSON;
    }

    // Obtener nota para cada practica
    function obtenerNotas(data) {
        const retos_resueltos = filtrarDesafios(data)
        const notas = [];

        const categorias = excluirCategorias(Object.keys(retos_resueltos))

        categorias.forEach(categoria => {
            const dificultades = Object.keys(retos_resueltos[categoria]);

            if(dificultades.length >= 1){
                const cantidadEasy = retos_resueltos[categoria]["Easy"] || 0;
                const cantidadMedium = retos_resueltos[categoria]["Medium"] || 0;
                const cantidadHard = retos_resueltos[categoria]["Hard"] || 0;

                const promedioPonderado = calcularPromedioPonderado(cantidadEasy, cantidadMedium, cantidadHard, categoria);
                notas.push(categoria +": " + parseFloat(promedioPonderado).toPrecision(3) +"\n");
            }
        });
        return notas.reverse().join("<br>"); // Reverse para seguir el orden de mayor > menor. Y el join para los newline en html
    }

    // Obtener el total de retos por categoría
    async function obtenerValoresTotales(){
        const response = await fetch(RETOS_ENDPOINT);
        const retosJSON = await response.json();
        const retos_total = filtrarDesafios(retosJSON.data, true);
        return retos_total;
    }

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
        const notas = obtenerNotas(userNotes[i - 1].data);

        elementoNota.innerHTML = notas || "No resolvió ningún reto";

        filas[i].appendChild(elementoNota);
    }
})();
