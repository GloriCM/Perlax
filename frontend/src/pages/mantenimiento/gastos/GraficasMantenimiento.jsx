import React from 'react';
import GraficasGastos from '../../produccion/GraficasGastos';

export default function GraficasMantenimiento() {
  return (
    <GraficasGastos
      titulo="Graficas de Mantenimiento"
      showTabs={true}
      pathPrefix="/mantenimiento/gastos"
    />
  );
}

