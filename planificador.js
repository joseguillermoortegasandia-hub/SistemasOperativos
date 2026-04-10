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