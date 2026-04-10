const fs = require('fs');

class Proceso {
    constructor(id, ti, t) {
        this.id = id;
        this.ti = parseFloat(ti);
        this.t = parseFloat(t);
        this.tf = 0; this.T = 0; this.E = 0; this.I = 0;
        this.t_restante = this.t;
    }
}

function calcularMetricas(p) {
    p.T = p.tf - p.ti;
    p.E = p.T - p.t;
    p.I = p.T !== 0 ? p.t / p.T : 0;
}

function generarReporte(nombre, procesos) {
    let contenido = `REPORTE DE METODO: ${nombre} (Q=4)\n`;
    contenido += `ID\tTi\tt\tTf\tT\tE\tI\n`;
    let sT = 0, sE = 0, sI = 0;
    
    procesos.forEach(p => {
        contenido += `${p.id}\t${p.ti}\t${p.t}\t${p.tf.toFixed(2)}\t${p.T.toFixed(2)}\t${p.E.toFixed(2)}\t${p.I.toFixed(2)}\n`;
        sT += p.T; sE += p.E; sI += p.I;
    });

    const n = procesos.length;
    contenido += `\nPROMEDIOS:\nT_prom: ${(sT/n).toFixed(2)}\nE_prom: ${(sE/n).toFixed(2)}\nI_prom: ${(sI/n).toFixed(2)}\n`;
    
    fs.writeFileSync(`resultado_${nombre}.txt`, contenido);
    return sE / n;
}

function solveFIFO(data) {
    let lista = data.map(p => ({...p})).sort((a, b) => a.ti - b.ti);
    let reloj = 0;
    lista.forEach(p => {
        if (reloj < p.ti) reloj = p.ti;
        p.tf = reloj + p.t;
        reloj = p.tf;
        calcularMetricas(p);
    });
    return generarReporte("FIFO", lista);
}

function solveLIFO(data) {
    let lista = data.map(p => ({...p})).sort((a, b) => a.ti - b.ti);
    let term = [], pila = [], reloj = lista[0].ti;
    while (lista.length > 0 || pila.length > 0) {
        while (lista.length > 0 && lista[0].ti <= reloj) pila.push(lista.shift());
        if (pila.length === 0) { reloj = lista[0].ti; continue; }
        let p = pila.pop();
        p.tf = reloj + p.t;
        reloj = p.tf;
        calcularMetricas(p);
        term.push(p);
    }
    return generarReporte("LIFO", term);
}

function solveRR(data, q) {
    let lista = data.map(p => ({...p})).sort((a, b) => a.ti - b.ti);
    let cola = [], term = [], n = lista.length, reloj = lista[0].ti;
    
    cola.push(lista.shift());

    while (term.length < n) {
        if (cola.length === 0 && lista.length > 0) {
            reloj = Math.max(reloj, lista[0].ti);
            cola.push(lista.shift());
        }

        let p = cola.shift();
        let chunk = Math.min(p.t_restante, q);
        p.t_restante -= chunk;
        reloj += chunk;

        while (lista.length > 0 && lista[0].ti <= reloj) {
            cola.push(lista.shift());
        }

        if (p.t_restante > 0) {
            cola.push(p);
        } else {
            p.tf = reloj;
            calcularMetricas(p);
            term.push(p);
        }
    }
    return generarReporte("RoundRobin", term);
}

// EJECUCIÓN FINAL
console.log("--- PROCESANDO ALGORITMOS (Q=4) ---");
try {
    const raw = fs.readFileSync('datos.txt', 'utf8');
    const procesos = raw.trim().split('\n')
    .filter(linea => linea.trim() !== "") 
    .map(l => {
        const parts = l.trim().split(/\s+/);
        return new Proceso(parts[0], parts[1], parts[2]);
    });

    const eF = solveFIFO(procesos);
    const eL = solveLIFO(procesos);
    const eR = solveRR(procesos, 4);

    console.log(`\n¡Cálculos completados con Q=4!`);
    console.log(`---------------------------------`);
    console.log(`Espera Promedio FIFO: ${eF.toFixed(2)}`);
    console.log(`Espera Promedio LIFO: ${eL.toFixed(2)}`);
    console.log(`Espera Promedio RR (Q=4): ${eR.toFixed(2)}`);
    console.log(`---------------------------------`);
} catch (e) {
    console.log("Error: Asegúrate de que 'datos.txt' esté presente.");
}