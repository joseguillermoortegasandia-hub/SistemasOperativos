const fs = require('fs'); // Importamos el módulo de sistema de archivos de Node.js

/**
 * GENERADOR DE IDs PERSONALIZADO
 * Crea una secuencia: A, B, C... Z, A1, B1... Z1, A2...
 * @param {number} index - Posición del proceso en la lista (0, 1, 2...)
 */
function generarID(index) {
    const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const letra = alfabeto[index % 26]; // El residuo nos da la letra (del 0 al 25)
    const ciclo = Math.floor(index / 26); // El cociente nos dice cuántas vueltas lleva el alfabeto
    
    // Si es la primera vuelta (ciclo 0), solo devuelve la letra. 
    // Si no, concatena la letra con el número del ciclo.
    return ciclo === 0 ? letra : `${letra}${ciclo}`;
}

/**
 * CLASE PROCESO
 * Estructura para almacenar los datos de cada proceso y sus cálculos.
 */
class Proceso {
    constructor(id, ti, t) {
        this.id = id;               // Nombre del proceso (ID)
        this.ti = parseFloat(ti);    // Tiempo de llegada (Tiempo inicial)
        this.t = parseFloat(t);      // Tiempo de ráfaga (Lo que dura el proceso)
        this.t_restante = this.t;    // Variable auxiliar para algoritmos que interrumpen (LIFO/RR)
        this.tf = 0;                 // Tiempo de finalización
        this.T = 0;                  // Tiempo de retorno (Tf - Ti)
        this.E = 0;                  // Tiempo de espera (T - t)
        this.I = 0;                  // Índice de servicio (t / T)
    }
}

/**
 * CÁLCULO DE MÉTRICAS ESTÁNDAR
 * Se ejecuta cuando un proceso termina su ejecución.
 */
function calcularMetricas(p) {
    p.T = p.tf - p.ti;   // Tiempo de estancia total en el sistema
    p.E = p.T - p.t;     // Tiempo que estuvo esperando sin ejecutar
    p.I = p.t / p.T;     // Eficiencia del proceso (proporción de tiempo útil)
}

/**
 * FORMATEADOR DE TEXTO PARA EL ARCHIVO
 * Crea la representación visual de la tabla y calcula promedios.
 */
function formatearResultados(nombre, procesos) {
    let sT = 0, sE = 0, sI = 0, n = procesos.length;

    // Ordenar para el reporte: 1ero por longitud (A antes que A1), 2do alfabéticamente
    procesos.sort((a, b) => a.id.length - b.id.length || a.id.localeCompare(b.id));

    let salida = `\n=== ALGORITMO: ${nombre} ===\n`;
    salida += `ID\tTi\tt\tTf\tT\tE\tI\n`; // Encabezados con tabulación
    salida += `----------------------------------------------------------\n`;

    procesos.forEach(p => {
        sT += p.T; sE += p.E; sI += p.I; // Sumatorias para los promedios
        salida += `${p.id}\t${p.ti}\t${p.t}\t${p.tf}\t${p.T}\t${p.E}\t${p.I.toFixed(4)}\n`;
    });

    salida += `----------------------------------------------------------\n`;
    // Cálculo de promedios finales
    salida += `PROMEDIOS -> T: ${(sT/n).toFixed(2)} | E: ${(sE/n).toFixed(2)} | I: ${(sI/n).toFixed(4)} (${((sI/n)*100).toFixed(2)}%)\n`;
    
    return salida;
}

// ==========================================
// LÓGICA DE ALGORITMOS DE PLANIFICACIÓN
// ==========================================

/**
 * FIFO (First In, First Out)
 * El primero que llega es el primero que se atiende hasta que termine.
 */
function solveFIFO(data) {
    // Creamos copias de los procesos para no afectar los otros algoritmos
    let lista = data.map(p => new Proceso(p.id, p.ti, p.t));
    lista.sort((a, b) => a.ti - b.ti); // Ordenamos estrictamente por tiempo de llegada
    
    let reloj = 0;
    lista.forEach(p => {
        if (reloj < p.ti) reloj = p.ti; // Si el CPU está libre y no ha llegado nadie, espera
        reloj += p.t;                  // El proceso ocupa el CPU todo su tiempo t
        p.tf = reloj;                  // Marcamos cuándo terminó
        calcularMetricas(p);
    });
    return formatearResultados("FIFO", lista);
}

/**
 * LIFO (Last In, First Out) - Preentivo
 * Si llega un proceso nuevo mientras otro corre, el nuevo "empuja" al anterior y toma el CPU.
 */
function solveLIFO(data) {
    let lista = data.map(p => new Proceso(p.id, p.ti, p.t));
    let pila = [], term = [], reloj = 0;

    // El ciclo sigue hasta que todos los procesos se hayan terminado
    while (term.length < lista.length) {
        // Buscamos si alguien llega en este segundo exacto y lo metemos a la pila
        lista.filter(p => p.ti === reloj).forEach(p => pila.push(p));

        if (pila.length > 0) {
            let p = pila[pila.length - 1]; // Tomamos al ÚLTIMO que entró (Tope de pila)
            p.t_restante--;
            reloj++;
            if (p.t_restante === 0) { // Si terminó de ejecutarse
                p.tf = reloj;
                calcularMetricas(p);
                term.push(pila.pop()); // Lo sacamos de la pila y lo llevamos a terminados
            }
        } else {
            reloj++; // Si no hay nadie en pila, el reloj sigue avanzando
        }
    }
    return formatearResultados("LIFO", term);
}

/**
 * ROUND ROBIN (RR)
 * Cada proceso tiene un tiempo máximo de uso de CPU (Quantum). Si no termina, va al final de la cola.
 */
function solveRR(data, q) {
    let lista = data.map(p => new Proceso(p.id, p.ti, p.t));
    let cola = [], term = [], reloj = 0, q_cnt = 0, actual = null;

    while (term.length < lista.length) {
        // 1. Ver si alguien llega justo ahora y meterlo a la cola
        lista.filter(p => p.ti === reloj).forEach(p => cola.push(p));

        // 2. Si el CPU está libre, tomar al primero de la cola
        if (!actual && cola.length > 0) {
            actual = cola.shift();
            q_cnt = 0; // Reiniciar contador de Quantum
        }

        if (actual) {
            actual.t_restante--;
            reloj++;
            q_cnt++;
            
            // 3. Importante: Ver si alguien llegó mientras el proceso actual usaba su segundo de CPU
            lista.filter(p => p.ti === reloj && !cola.includes(p) && p !== actual && !term.includes(p))
                 .forEach(p => cola.push(p));

            if (actual.t_restante === 0) { // Si el proceso terminó
                actual.tf = reloj; 
                calcularMetricas(actual);
                term.push(actual); 
                actual = null;
            } else if (q_cnt === q) { // Si se le acabó el tiempo (Quantum)
                cola.push(actual); // Va de vuelta al final de la cola
                actual = null;
            }
        } else {
            reloj++;
        }
    }
    return formatearResultados(`RR (Q=${q})`, term);
}

// ==========================================
// BLOQUE PRINCIPAL DE EJECUCIÓN
// ==========================================
try {
    // 1. Leer el archivo de entrada
    const contenido = fs.readFileSync('datos.txt', 'utf8');
    const lineas = contenido.trim().split('\n').filter(l => l.trim() !== "");
    
    // 2. Convertir las líneas de texto en objetos de datos y asignar IDs cíclicos
    const procesosCargados = lineas.map((linea, i) => {
        const [ti, t] = linea.trim().split(/\s+/);
        return { id: generarID(i), ti: parseFloat(ti), t: parseFloat(t) };
    });

    // 3. Ejecutar los algoritmos y guardar sus reportes en una variable
    let reporteFinal = "REPORTE DE PLANIFICACIÓN DE PROCESOS\n";
    reporteFinal += "====================================\n";
    reporteFinal += solveFIFO(procesosCargados);
    reporteFinal += solveLIFO(procesosCargados);
    reporteFinal += solveRR(procesosCargados, 4);

    // 4. Escribir todo el reporte en el archivo resultados.txt
    fs.writeFileSync('resultados.txt', reporteFinal);
    
    console.log("¡Archivo 'resultados.txt' generado con éxito!");

} catch (err) {
    // Manejo de errores en caso de que el archivo no exista o el formato sea incorrecto
    console.error("ERROR CRÍTICO:");
    console.error("- Asegúrate de que 'datos.txt' exista en la misma carpeta.");
    console.error("- El formato debe ser: TiempoLlegada TiempoRafaga (ej: 0 5)");
}