namespace Perlax.Modules.Budgets.Domain.Elliot;

/// <summary>
/// Datos de Presupuesto.xlsx (año 2026), hojas PRESUPUESTO, COSTOS FIJOS,
/// COSTOS VARIABLES y MAPA DE COSTOS. Sin flujo de caja.
/// </summary>
public static class ElliotGraficaElliot2026
{
    public const string Company = "GRAFICAS ELLIOT LTDA";
    public const int Year = 2026;

    public static ElliotBudgetInput CreateInput()
    {
        var people = new List<ElliotPayrollPersonInput>();
        var items = new List<ElliotFixedItemInput>();
        var order = 0;

        void Person(string section, string name, string role, decimal salary, decimal transport, string? center = null)
        {
            people.Add(new ElliotPayrollPersonInput(section, name, role, salary, transport, center, ++order));
        }

        var itemOrder = 0;
        void Item(string group, string concept, decimal amount)
        {
            items.Add(new ElliotFixedItemInput(group, concept, amount, ++itemOrder));
        }

        Person(ElliotPayrollSections.Admin, "Claude Levy", "Gerente", 11_000_000, 4_000_000);
        Person(ElliotPayrollSections.Admin, "Nohora Ortiz", "Gerente administrativo", 6_000_000, 3_000_000);
        Person(ElliotPayrollSections.Admin, "Faiber", "Auxiliar contable", 2_500_000, 250_000);
        Person(ElliotPayrollSections.Admin, "Consuelo Benitez", "Recepción", 1_900_000, 550_000);
        Person(ElliotPayrollSections.Admin, "Edison Martinez", "Mensajero", 1_750_000, 586_000);
        Person(ElliotPayrollSections.Admin, "Cano Rosa", "Recursos humanos", 2_000_000, 250_000);
        Person(ElliotPayrollSections.Admin, "Karen Castillo", "Diseño", 2_200_000, 250_000);
        Person(ElliotPayrollSections.Admin, "Juan Mendez", "Diseño", 2_200_000, 250_000);
        Person(ElliotPayrollSections.Admin, "Camilo", "Administración", 2_000_000, 250_000);

        Person(ElliotPayrollSections.Sales, "Rosana Lucumi", "Servicio al cliente", 1_750_000, 250_000);

        Person(ElliotPayrollSections.Production, "Alexander Gutierres", "Líder planeación", 5_000_000, 0);
        Person(ElliotPayrollSections.Production, "Gloria Castillo", "Asesoría", 5_000_000, 0);
        Person(ElliotPayrollSections.Production, "Supervisor turno 1", "Supervisor turno 1", 3_500_000, 250_000);
        Person(ElliotPayrollSections.Production, "Supervisor turno 2", "Supervisor turno 2", 3_000_000, 250_000);
        Person(ElliotPayrollSections.Production, "Tatiana", "Salud ocupacional", 2_000_000, 250_000);
        Person(ElliotPayrollSections.Production, "Leidy", "Líder talleres", 3_500_000, 250_000);
        Person(ElliotPayrollSections.Production, "Rojas Joan Mauricio", "Almacenista", 1_750_000, 250_000);
        Person(ElliotPayrollSections.Production, "Almacenista", "Almacenista", 1_750_000, 250_000);

        Person(ElliotPayrollSections.Production, "Robert Velez", "Convertidora", 1_900_000, 550_000, "CORTE");
        Person(ElliotPayrollSections.Production, "Hilder", "Guillotina", 2_000_000, 250_000, "CORTE");
        Person(ElliotPayrollSections.Production, "William Hernan", "Guillotina", 2_000_000, 250_000, "CORTE");

        Person(ElliotPayrollSections.Production, "Escobar Jhn Freddy", "Impresor M7 turno 1", 2_500_000, 550_000, "IMPRESION");
        Person(ElliotPayrollSections.Production, "Perdomo Gustavo Adolfo", "Ayudante M7 turno 1", 1_750_000, 250_000, "IMPRESION");
        Person(ElliotPayrollSections.Production, "Hector Enriquez", "Impresor M6 turno 1", 2_500_000, 550_000, "IMPRESION");
        Person(ElliotPayrollSections.Production, "Ayudante M6 turno 1", "Ayudante M6 turno 1", 1_750_000, 250_000, "IMPRESION");
        Person(ElliotPayrollSections.Production, "Ramirez Romero Andres Mauricio", "Impresión M6 turno 2", 2_200_000, 250_000, "IMPRESION");
        Person(ElliotPayrollSections.Production, "Ayudante M6 turno 2", "Ayudante M6 turno 2", 1_750_000, 250_000, "IMPRESION");
        Person(ElliotPayrollSections.Production, "Obando Higuita Jose Luis", "Impresor M4", 2_200_000, 250_000, "IMPRESION");
        Person(ElliotPayrollSections.Production, "Impresor M5", "Impresor M5", 1_800_000, 250_000, "IMPRESION");

        Person(ElliotPayrollSections.Production, "Operario troquelado M8A turno 1", "Operario troquelado M8A turno 1", 2_100_000, 250_000, "TROQUEL");
        Person(ElliotPayrollSections.Production, "Operario troquelado M8A turno 2", "Operario troquelado M8A turno 2", 2_100_000, 250_000, "TROQUEL");
        Person(ElliotPayrollSections.Production, "Operario troquelado M8B turno 1", "Operario troquelado M8B turno 1", 2_100_000, 250_000, "TROQUEL");
        Person(ElliotPayrollSections.Production, "Operario troquelado M8B turno 2", "Operario troquelado M8B turno 2", 2_100_000, 250_000, "TROQUEL");
        Person(ElliotPayrollSections.Production, "Sarmiento Yhan Otoniel", "Operario estampado M8C", 2_100_000, 250_000, "TROQUEL");
        Person(ElliotPayrollSections.Production, "Blandon Jose Lisandro", "Operario troquelado M9 turno 1", 2_200_000, 250_000, "TROQUEL");
        Person(ElliotPayrollSections.Production, "Operario troquelado M9", "Operario troquelado M9 turno 1", 2_200_000, 0, "TROQUEL");

        Person(ElliotPayrollSections.Production, "Bedoya Maria Fernanda", "Operario laminadora M10 A", 2_000_000, 250_000, "LAMINADO");
        Person(ElliotPayrollSections.Production, "Ayudante M10", "Ayudante M10", 1_750_000, 250_000, "LAMINADO");
        Person(ElliotPayrollSections.Production, "Motta Leidy Johanna", "Operario laminadora M10 B", 1_900_000, 250_000, "LAMINADO");
        Person(ElliotPayrollSections.Production, "Ayudante M10B", "Ayudante M10B", 1_750_000, 250_000, "LAMINADO");
        Person(ElliotPayrollSections.Production, "Ayudante M10B 2", "Ayudante M10B", 1_750_000, 250_000, "LAMINADO");

        Person(ElliotPayrollSections.Production, "Riascos Andres Felipe", "Operario plastificadora M11", 2_100_000, 250_000, "UV");

        Person(ElliotPayrollSections.Production, "Moreno Angel Julio", "Operario corrugado M13A", 1_900_000, 250_000, "CORRUGADO");
        Person(ElliotPayrollSections.Production, "Operario corrugado M13B", "Operario corrugado M13B", 1_800_000, 250_000, "CORRUGADO");

        Person(ElliotPayrollSections.Production, "Cruz Pinto Alberto", "Operario pegadora M14", 2_000_000, 550_000, "PEGA");
        Person(ElliotPayrollSections.Production, "Martinez Osorno Karen Lizeth", "Ayudante pegadora M14", 1_750_000, 250_000, "PEGA");
        Person(ElliotPayrollSections.Production, "Magally Millan", "Ayudante pegadora M14", 1_750_000, 250_000, "PEGA");
        Person(ElliotPayrollSections.Production, "Ayudante pegadora M14", "Ayudante pegadora M14", 1_750_000, 250_000, "PEGA");

        Person(ElliotPayrollSections.Production, "Rodriguez Maria Alejandra", "Operario tejedora", 1_750_000, 250_000);
        Person(ElliotPayrollSections.Production, "Mirquez Eleonora", "Oficios varios despachos", 1_750_000, 250_000);
        Person(ElliotPayrollSections.Production, "Oficios varios despachos", "Oficios varios despachos", 1_750_000, 250_000);
        Person(ElliotPayrollSections.Production, "Oficios varios camión", "Oficios varios camión", 1_750_000, 250_000);
        Person(ElliotPayrollSections.Production, "Moriano Yurley", "Despicador", 1_750_000, 250_000);
        Person(ElliotPayrollSections.Production, "Prealistador", "Prealistador", 1_750_000, 250_000);

        Item(ElliotFixedGroups.AuxiliosAdmin, "Atención y recreación", 100_000);

        Item(ElliotFixedGroups.Honorarios, "Asesoría contable", 4_000_000);
        Item(ElliotFixedGroups.Honorarios, "Revisor fiscal", 1_900_000);
        Item(ElliotFixedGroups.Honorarios, "Asesoría jurídica", 1_750_000);
        Item(ElliotFixedGroups.Honorarios, "Asesoría dev IVA", 1_500_000);
        Item(ElliotFixedGroups.Honorarios, "Asesoría SST", 1_750_000);

        Item(ElliotFixedGroups.Impuestos, "Industria y comercio", 1_000_000);
        Item(ElliotFixedGroups.Impuestos, "4x1000", 2_700_000);
        Item(ElliotFixedGroups.Impuestos, "Propiedad raíz", 2_500_000);
        Item(ElliotFixedGroups.Impuestos, "Otros", 1_000_000);

        Item(ElliotFixedGroups.Arrendamientos, "Fotocopiadora", 250_000);
        Item(ElliotFixedGroups.Contribuciones, "Contribuciones super", 180_000);

        Item(ElliotFixedGroups.ServiciosAdmin, "Servicio digitación", 500_000);
        Item(ElliotFixedGroups.ServiciosAdmin, "Aseo/bomberos", 100_000);
        Item(ElliotFixedGroups.ServiciosAdmin, "Teléfono", 1_000_000);
        Item(ElliotFixedGroups.ServiciosAdmin, "Correo, portes", 50_000);
        Item(ElliotFixedGroups.ServiciosAdmin, "Siigo facturación electrónica", 120_000);
        Item(ElliotFixedGroups.ServiciosAdmin, "Soporte sistemas", 700_000);
        Item(ElliotFixedGroups.ServiciosAdmin, "Soporte Expertis", 400_000);
        Item(ElliotFixedGroups.ServiciosAdmin, "Servicio vigilancia", 200_000);

        Item(ElliotFixedGroups.GastosLegales, "Notariales", 200_000);
        Item(ElliotFixedGroups.GastosLegales, "Registro mercantil", 250_000);
        Item(ElliotFixedGroups.GastosLegales, "Certificados cámara", 20_000);
        Item(ElliotFixedGroups.GastosLegales, "Otros", 50_000);

        Item(ElliotFixedGroups.MantenimientoAdmin, "Edificio", 100_000);
        Item(ElliotFixedGroups.MantenimientoAdmin, "Equipo oficina", 150_000);
        Item(ElliotFixedGroups.MantenimientoAdmin, "Equipo cómputo", 250_000);

        Item(ElliotFixedGroups.Adecuacion, "Instalación eléctrica", 200_000);
        Item(ElliotFixedGroups.ViajesAdmin, "Pasajes gerentes", 100_000);
        Item(ElliotFixedGroups.DepreciacionAdmin, "Depreciación bodega", 1_000_000);
        Item(ElliotFixedGroups.Diferidos, "Software producción", 350_000);
        Item(ElliotFixedGroups.Diferidos, "Adecuación oficinas", 150_000);
        Item(ElliotFixedGroups.DiversosAdmin, "Diversos", 600_000);

        Item(ElliotFixedGroups.ServiciosVentas, "Comisiones ventas", 2_000_000);
        Item(ElliotFixedGroups.ViajesVentas, "Pasajes", 1_000_000);
        Item(ElliotFixedGroups.ViajesVentas, "Viáticos", 300_000);

        Item(ElliotFixedGroups.Financieros, "Gastos bancarios - chequera", 100_000);
        Item(ElliotFixedGroups.Financieros, "Comisiones", 100_000);
        Item(ElliotFixedGroups.Financieros, "Intereses (leasing)", 1_500_000);
        Item(ElliotFixedGroups.Financieros, "Descuentos clientes", 200_000);
        Item(ElliotFixedGroups.Financieros, "Diferencia en cambio", 10_000_000);
        Item(ElliotFixedGroups.Financieros, "Otros", 1_000_000);

        Item(ElliotFixedGroups.AuxiliosProduccion, "Auxilios", 250_000);
        Item(ElliotFixedGroups.AuxiliosProduccion, "Atención y recreación", 100_000);
        Item(ElliotFixedGroups.AuxiliosProduccion, "Dotación", 400_000);

        Item(ElliotFixedGroups.CostosIndirectos, "M#01 convertidora", 600_000);
        Item(ElliotFixedGroups.CostosIndirectos, "M#02 guillotina", 600_000);
        Item(ElliotFixedGroups.CostosIndirectos, "M#03 Sordz 72", 600_000);
        Item(ElliotFixedGroups.CostosIndirectos, "M#04 Sordz 76", 600_000);
        Item(ElliotFixedGroups.CostosIndirectos, "M#05 Sordz 71", 400_000);
        Item(ElliotFixedGroups.CostosIndirectos, "M#06 Speedmaster", 2_000_000);
        Item(ElliotFixedGroups.CostosIndirectos, "M#07 Speedmaster", 2_000_000);
        Item(ElliotFixedGroups.CostosIndirectos, "M#09 Royo", 1_000_000);
        Item(ElliotFixedGroups.CostosIndirectos, "M#10 laminadora 1", 600_000);
        Item(ElliotFixedGroups.CostosIndirectos, "M#11 laminadora 2", 500_000);
        Item(ElliotFixedGroups.CostosIndirectos, "M#12 Poligraph", 500_000);
        Item(ElliotFixedGroups.CostosIndirectos, "M#14 Soac", 600_000);
        Item(ElliotFixedGroups.CostosIndirectos, "M#15 y 16 corrugadora", 600_000);
        Item(ElliotFixedGroups.CostosIndirectos, "Estibadora", 50_000);
        Item(ElliotFixedGroups.CostosIndirectos, "Montacargas", 300_000);
        Item(ElliotFixedGroups.CostosIndirectos, "Quemador Derjor", 50_000);
        Item(ElliotFixedGroups.CostosIndirectos, "Herramienta", 50_000);
        Item(ElliotFixedGroups.CostosIndirectos, "Fletes locales y materia prima", 3_500_000);
        Item(ElliotFixedGroups.CostosIndirectos, "Fletes nacionales", 5_000_000);
        Item(ElliotFixedGroups.CostosIndirectos, "Fletes internacionales", 100_000_000);
        Item(ElliotFixedGroups.CostosIndirectos, "Depreciación maquinaria y equipo", 6_000_000);
        Item(ElliotFixedGroups.CostosIndirectos, "Energía", 12_000_000);
        Item(ElliotFixedGroups.CostosIndirectos, "Agua", 2_500_000);
        Item(ElliotFixedGroups.CostosIndirectos, "Emsirva", 400_000);
        Item(ElliotFixedGroups.CostosIndirectos, "Cafetería", 1_000_000);
        Item(ElliotFixedGroups.CostosIndirectos, "Aseo", 1_000_000);
        Item(ElliotFixedGroups.CostosIndirectos, "Combustible máquinas / disolventes / aceites", 600_000);
        Item(ElliotFixedGroups.CostosIndirectos, "Droga", 250_000);
        Item(ElliotFixedGroups.CostosIndirectos, "Peajes", 200_000);
        Item(ElliotFixedGroups.CostosIndirectos, "Servicio montacarga", 500_000);
        Item(ElliotFixedGroups.CostosIndirectos, "Compra gas", 1_200_000);
        Item(ElliotFixedGroups.CostosIndirectos, "Taxis y buses", 500_000);
        Item(ElliotFixedGroups.CostosIndirectos, "Otros", 1_000_000);

        Item(ElliotFixedGroups.ContratosServicios, "Pega, armado de cajas (6% de la venta)", 54_000_000);
        Item(ElliotFixedGroups.ContratosServicios, "Rebobinado", 800_000);
        Item(ElliotFixedGroups.ContratosServicios, "Aduanero", 500_000);
        Item(ElliotFixedGroups.ContratosServicios, "Despique", 2_400_000);
        Item(ElliotFixedGroups.ContratosServicios, "Otros", 2_000_000);

        return new ElliotBudgetInput
        {
            Incomes =
            [
                new ElliotIncomeLineInput("ELLIOT", "División Gráficas Elliot", 400_000_000, 0.45m),
                new ElliotIncomeLineInput("SVBAGS", "División SV Bags Colombia", 400_000_000, 0.45m),
                new ElliotIncomeLineInput("FEDEX", "Fletes FedEx", 100_000_000, 0m)
            ],
            People = people,
            FixedItems = items,
            Commissions =
            [
                new ElliotCommissionInput("Olga Lucia Riaño", 0.03m, 100_000_000m, "Cooperativa", 1),
                new ElliotCommissionInput("Claudia Velasco", 0.025m, 100_000_000m, "Agentes", 2)
            ],
            CostCenters =
            [
                new("CORTE", "Corte", 600, 1, 0.50m, 550_000),
                new("IMPRESION", "Impresión", 1000, 2, 0.50m, 800_000),
                new("TROQUEL", "Troquelado", 1400, 3, 0.50m, 0),
                new("LAMINADO", "Laminado", 400, 4, 0.50m, 0),
                new("CORRUGADO", "Corrugado", 400, 5, 0.50m, 250_000),
                new("PEGA", "Pega", 200, 6, 0.50m, 550_000),
                new("UV", "UV", 400, 7, 0.55m, 0),
                new("TALLER", "Taller", 1, 8, 0.55m, 0)
            ],
            MapParams = new ElliotMapParamsInput(1.065143m, 0.415641m, 0.042380m, 0.70m)
        };
    }
}
