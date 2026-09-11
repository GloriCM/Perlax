const fs = require('fs');

function patch(file, fn) {
  let c = fs.readFileSync(file, 'utf8');
  const crlf = c.includes('\r\n');
  c = c.replace(/\r\n/g, '\n');
  const next = fn(c);
  if (next === c) console.log('NO CHANGE', file);
  fs.writeFileSync(file, crlf ? next.replace(/\n/g, '\r\n') : next);
}

patch('E:/Semillas/Perlax/backend/src/Modules/Production/Perlax.Modules.Production.Infrastructure/Services/DesignPlannerService.cs', (c) => {
  c = c.replace(
    `        if (string.IsNullOrWhiteSpace(command.Cliente) || string.IsNullOrWhiteSpace(command.Vendedor)
            || string.IsNullOrWhiteSpace(command.Trabajo) || string.IsNullOrWhiteSpace(command.Responsable))
            throw new InvalidOperationException("Cliente, vendedor, trabajo y responsable son obligatorios.");`,
    `        if (string.IsNullOrWhiteSpace(command.Cliente) || string.IsNullOrWhiteSpace(command.Vendedor)
            || string.IsNullOrWhiteSpace(command.Trabajo) || string.IsNullOrWhiteSpace(command.Accion)
            || string.IsNullOrWhiteSpace(command.Responsable))
            throw new InvalidOperationException("Cliente, vendedor, trabajo, acción y responsable son obligatorios.");`
  );
  c = c.replace(
    `            Trabajo = command.Trabajo.Trim(),
            Responsable = command.Responsable.Trim(),`,
    `            Trabajo = command.Trabajo.Trim(),
            Accion = command.Accion.Trim(),
            Responsable = command.Responsable.Trim(),`
  );
  c = c.replace(
    `        job.Trabajo,
        job.Responsable,`,
    `        job.Trabajo,
        job.Accion,
        job.Responsable,`
  );
  return c;
});

console.log('service patched');
