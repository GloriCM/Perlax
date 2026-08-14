import React from 'react';
import GraficasGastos from '../../produccion/gastos/GraficasGastos';

export default function GraficasMantenimiento() {
  return (
    <GraficasGastos
      titulo="Graficas de Mantenimiento"
      showTabs={true}
      pathPrefix="/mantenimiento/gastos"
    />
  );
}

