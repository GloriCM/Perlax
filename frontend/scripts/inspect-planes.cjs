const fs = require('fs');
const c = fs.readFileSync('E:/Semillas/Perlax/frontend/src/pages/ordenes/PlanesDiseno.jsx', 'utf8');
const i = c.indexOf('const [orders, setOrders]');
console.log('orders', JSON.stringify(c.slice(i, i + 200)));
const j = c.indexOf("api.get('/production/orders')");
console.log('fetch', JSON.stringify(c.slice(j, j + 180)));
const k = c.indexOf('const searchTerms');
console.log('search', JSON.stringify(c.slice(k, k + 220)));
console.log('crlf', c.includes('\r\n'));
