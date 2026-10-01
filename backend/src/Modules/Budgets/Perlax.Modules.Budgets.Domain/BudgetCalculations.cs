namespace Perlax.Modules.Budgets.Domain;

/// <summary>
/// Motor de cálculos presupuestales (anualización, nómina y estado de resultados).
/// El valor proyectado de una línea es el monto del período indicado por Frequency;
/// los totales y reportes siempre usan el equivalente anual.
/// </summary>
public static class BudgetCalculations
{
    public static int FrequencyFactor(string? frequency) =>
        (frequency ?? "Anual").Trim() switch
        {
            "Mensual" => 12,
            "Trimestral" => 4,
            "Semestral" => 2,
            "Anual" => 1,
            "Eventual" => 1,
            _ => 1
        };

    public static decimal AnnualAmount(decimal periodValue, string? frequency) =>
        Math.Round(periodValue * FrequencyFactor(frequency), 2);

    /// <summary>
    /// Prestaciones, auxilios, bonos y extras se capturan por persona/mes.
    /// </summary>
    public static decimal PersonnelMonthlyTotal(
        int headcount,
        decimal monthlySalary,
        decimal benefits,
        decimal allowances,
        decimal bonuses,
        decimal overtime) =>
        headcount * (monthlySalary + benefits + allowances + bonuses + overtime);

    public static decimal PersonnelAnnualTotal(
        int headcount,
        decimal monthlySalary,
        decimal benefits,
        decimal allowances,
        decimal bonuses,
        decimal overtime) =>
        Math.Round(PersonnelMonthlyTotal(headcount, monthlySalary, benefits, allowances, bonuses, overtime) * 12m, 2);

    /// <summary>
    /// Rubros de líneas que representan nómina y no deben sumarse junto con la pestaña Personal.
    /// </summary>
    public static bool IsLaborLineCategory(string? category)
    {
        var c = (category ?? string.Empty).Trim();
        if (c.Length == 0) return false;
        if (c.StartsWith("Personal", StringComparison.OrdinalIgnoreCase)) return true;
        if (c.Contains("Mano de Obra", StringComparison.OrdinalIgnoreCase)) return true;
        return false;
    }

    /// <summary>
    /// Clasifica personal en el estado de resultados: production | sales | admin.
    /// </summary>
    public static string ClassifyPersonnelBucket(string? category)
    {
        var c = (category ?? string.Empty).Trim().ToLowerInvariant();
        if (c.Contains("producc") || c.Contains("operativ") || c.Contains("logistic"))
            return "production";
        if (c.Contains("comercial") || c.Contains("ventas"))
            return "sales";
        return "admin";
    }
}
