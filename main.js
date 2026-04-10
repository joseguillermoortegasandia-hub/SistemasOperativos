const fs = require('fs');

// Clase para representar cada proceso
class Proceso {
    constructor(id, ti, t) {
        this.id = id;
        this.ti = parseFloat(ti);
        this.t = parseFloat(t);
        this.tf = 0; // Tiempo de Finalización
        this.T = 0;  // Tiempo de Estancia
        this.E = 0;  // Tiempo de Espera
        this.I = 0;  // Índice de Servicio (Eficiencia)
        this.t_restante = this.t; // Útil para Round Robin
    }
}

// Función para calcular las métricas estándar de SO
function calcularMetricas(p) {
    p.T = p.tf - p.ti; // Estancia = Final - Llegada
    p.E = p.T - p.t;  // Espera = Estancia - Ráfaga
    // Índice de servicio expresado en porcentaje
    p.I = p.T !== 0 ? (p.t / p.T) * 100 : 0;
}

// Genera el archivo .txt y retorna promedios para la consola
function generarReporte(nombre, procesos, q = null) {
    let titulo = q ? `${nombre} (Q=${q})` : nombre;
    let contenido = `REPORTE DE METODO: ${titulo}\n`;
    contenido += `ID\tTi\tt\tTf\tT\tE\tI(%)\n`;
    
    let sT = 0, sE = 0, sI = 0;
    
    procesos.forEach(p => {
        contenido += `${p.id}\t${p.ti}\t${p.t}\t${p.tf.toFixed(2)}\t${p.T.toFixed(2)}\t${p.E.toFixed(2)}\t${p.I.toFixed(2)}%\n`;
        sT += p.T; sE += p.E; sI += p.I;
    });

    const n = procesos.length;
    let promE = sE / n;
    let promI = sI / n;

    contenido += `\nPROMEDIOS:\nT_prom: ${(sT/n).toFixed(2)}\nE_prom: ${promE.toFixed(2)}\nI_prom (Eficiencia): ${promI.toFixed(2)}%\n`;
    
    fs.writeFileSync(`resultado_${nombre}.txt`, contenido);
    return { e: promE, i: promI };
}

// --- ALGORITMOS DE PLANIFICACIÓN ---

function solveFIFO(data) {
    let lista = data.map(p => new Proceso(p.id, p.ti, p.t)).sort((a, b) => a.ti - b.ti);
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
    let lista = data.map(p => new Proceso(p.id, p.ti, p.t)).sort((a, b) => a.ti - b.ti);
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
    let lista = data.map(p => new Proceso(p.id, p.ti, p.t)).sort((a, b) => a.ti - b.ti);
    let cola = [], term = [], n = lista.length;
    let reloj = lista[0].ti;
    
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
    return generarReporte("RoundRobin", term, q);
}

// --- LOGICA DE EJECUCIÓN ---

const ARCHIVO_DATOS = 'datos.txt';
const Q_ROUND_ROBIN = 4;

console.log(`--- SISTEMAS OPERATIVOS: PLANIFICACIÓN (Q=${Q_ROUND_ROBIN}) ---`);

try {
    const raw = fs.readFileSync(ARCHIVO_DATOS, 'utf8');
    
    const procesos = raw.trim().split('\n')
        .filter(linea => linea.trim() !== "") 
        .map((l, index) => {
            const parts = l.trim().split(/\s+/);
            
            // Si el primer elemento no es un número, es el ID (P1, P2...)
            // Si es un número, el ID se genera automáticamente
            const isFirstANumber = !isNaN(parseFloat(parts[0])) && isFinite(parts[0]);
            
            const id = isFirstANumber ? `P${index + 1}` : parts[0];
            const ti = isFirstANumber ? parts[0] : parts[1];
            const t = isFirstANumber ? parts[1] : parts[2];
            
            return new Proceso(id, ti, t);
        });

    const f = solveFIFO(procesos);
    const l = solveLIFO(procesos);
    const r = solveRR(procesos, Q_ROUND_ROBIN);

    console.log("\nRESULTADOS FINALES (PROMEDIOS):");
    console.table([
        { Algoritmo: "FIFO", "Espera (E)": f.e.toFixed(2), "Eficiencia (I)": f.i.toFixed(2) + "%" },
        { Algoritmo: "LIFO", "Espera (E)": l.e.toFixed(2), "Eficiencia (I)": l.i.toFixed(2) + "%" },
        { Algoritmo: "Round Robin", "Espera (E)": r.e.toFixed(2), "Eficiencia (I)": r.i.toFixed(2) + "%" }
    ]);

    console.log("\n¡Archivos .txt generados exitosamente!");

} catch (err) {
    console.error("Error crítico:", err.message);
    console.log("Asegúrate de que 'datos.txt' existe y tiene el formato: [ID] Ti T");
}