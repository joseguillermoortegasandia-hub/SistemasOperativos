const fs = require('fs');

/**
 * GENERADOR DE IDs (A-Z, A1-Z1, A2-Z2...)
 */
function generarID(index) {
    const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const letra = alfabeto[index % 26];
    const ciclo = Math.floor(index / 26);
    return ciclo === 0 ? letra : `${letra}${ciclo}`;
}

class Proceso {
    constructor(id, ti, t) {
        this.id = id;
        this.ti = parseFloat(ti);
        this.t = parseFloat(t);
        this.t_restante = this.t;
        this.tf = 0; this.T = 0; this.E = 0; this.I = 0;
    }
}

/**
 * Calcula T (Retorno), E (Espera) e I (Servicio)
 */
function calcularMetricas(p) {
    p.T = p.tf - p.ti;
    p.E = p.T - p.t;
    p.I = p.t / p.T;
}

/**
 * Prepara el string con los resultados para guardarlos en el archivo .txt
 */
function formatearResultados(nombre, procesos) {
    let sT = 0, sE = 0, sI = 0, n = procesos.length;
    
    // Ordenar para el reporte: Primero por largo del ID, luego alfabeticamente
    procesos.sort((a, b) => a.id.length - b.id.length || a.id.localeCompare(b.id));

    let salida = `\n=== ALGORITMO: ${nombre} ===\n`;
    salida += `ID\tTi\tt\tTf\tT\tE\tI\n`;
    salida += `----------------------------------------------------------\n`;

    procesos.forEach(p => {
        sT += p.T; sE += p.E; sI += p.I;
        // Construccion de la fila sin usar índices numericos
        salida += `${p.id}\t${p.ti}\t${p.t}\t${p.tf}\t${p.T}\t${p.E}\t${p.I.toFixed(4)}\n`;
    });

    salida += `----------------------------------------------------------\n`;
    salida += `PROMEDIOS -> T: ${(sT/n).toFixed(2)} | E: ${(sE/n).toFixed(2)} | I: ${(sI/n).toFixed(4)} (${((sI/n)*100).toFixed(2)}%)\n`;
    
    return salida;
}

// ALGORITMOS DE PLANIFICACION

function solveFIFO(data) {
    let lista = data.map(p => new Proceso(p.id, p.ti, p.t));
    lista.sort((a, b) => a.ti - b.ti); // FIFO se basa en el tiempo de llegada 
    
    let reloj = 0;
    lista.forEach(p => {
        if (reloj < p.ti) reloj = p.ti; 
        reloj += p.t;
        p.tf = reloj;
        calcularMetricas(p);
    });
    return formatearResultados("FIFO", lista);
}

function solveLIFO(data) {
    let lista = data.map(p => new Proceso(p.id, p.ti, p.t));
    let pila = [], term = [], reloj = 0;

    while (term.length < lista.length) {
        lista.filter(p => p.ti === reloj).forEach(p => pila.push(p));

        if (pila.length > 0) {
            let p = pila[pila.length - 1]; // LIFO: Ultimo en entrar, primero en salir
            p.t_restante--;
            reloj++;
            if (p.t_restante === 0) {
                p.tf = reloj;
                calcularMetricas(p);
                term.push(pila.pop());
            }
        } else { reloj++; }
    }
    return formatearResultados("LIFO", term);
}

function solveRR(data, q) {
    let lista = data.map(p => new Proceso(p.id, p.ti, p.t));
    let cola = [], term = [], reloj = 0, q_cnt = 0, actual = null;

    while (term.length < lista.length) {
        lista.filter(p => p.ti === reloj).forEach(p => cola.push(p));

        if (!actual && cola.length > 0) {
            actual = cola.shift();
            q_cnt = 0;
        }

        if (actual) {
            actual.t_restante--;
            reloj++;
            q_cnt++;
            
            // Ver si llega alguien mientras se procesa el quantum
            lista.filter(p => p.ti === reloj && !cola.includes(p) && p !== actual && !term.includes(p))
                 .forEach(p => cola.push(p));

            if (actual.t_restante === 0) {
                actual.tf = reloj; calcularMetricas(actual);
                term.push(actual); actual = null;
            } else if (q_cnt === q) {
                cola.push(actual); actual = null;
            }
        } else { reloj++; }
    }
    return formatearResultados(`RR (Q=${q})`, term);
}

//  EJECUCION Y SALIDA A ARCHIVO 
try {
    const contenido = fs.readFileSync('datos.txt', 'utf8');
    const lineas = contenido.trim().split('\n').filter(l => l.trim() !== "");
    
    const procesosCargados = lineas.map((linea, i) => {
        const [ti, t] = linea.trim().split(/\s+/);
        // El ID se genera automaticamente, eliminando cualquier rastro de indices locos
        return { id: generarID(i), ti: parseFloat(ti), t: parseFloat(t) };
    });

    let reporteFinal = "SISTEMA DE PLANIFICACIÓN DE PROCESOS\n";
    reporteFinal += "====================================\n";
    reporteFinal += solveFIFO(procesosCargados);
    reporteFinal += solveLIFO(procesosCargados);
    reporteFinal += solveRR(procesosCargados, 4);

    // Escribir resultados finales en el archivo de texto
    fs.writeFileSync('resultados.txt', reporteFinal);
    
    console.log("Resultados generados exitosamente en 'resultados.txt'");

} catch (err) {
    console.error("Error: Revisa que 'datos.txt' tenga el formato correcto.");
}