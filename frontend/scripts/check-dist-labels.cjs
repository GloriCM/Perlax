const fs = require('fs');
const p = 'E:/Semillas/Perlax/frontend/dist/assets/index-CpjyyM5u.js';
const c = fs.readFileSync(p, 'utf8');
const needles = [
  'Fecha de entrega esperada',
  'Fecha de Recepción',
  'Nombre del trabajo',
  'Describe lo que necesita',
  'label:"Trabajo"',
  'label:"Acción"',
];
for (const n of needles) console.log(n, c.includes(n));
