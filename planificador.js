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