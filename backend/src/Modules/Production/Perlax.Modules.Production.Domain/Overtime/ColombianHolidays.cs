namespace Perlax.Modules.Production.Domain.Overtime;

public static class ColombianHolidays
{
    private static readonly HashSet<DateOnly> Dates =
    [
        // 2025
        new(2025, 1, 1), new(2025, 1, 6), new(2025, 3, 24), new(2025, 4, 17), new(2025, 4, 18),
        new(2025, 5, 1), new(2025, 6, 2), new(2025, 6, 23), new(2025, 6, 30), new(2025, 7, 20),
        new(2025, 8, 7), new(2025, 8, 18), new(2025, 10, 13), new(2025, 11, 3), new(2025, 11, 17),
        new(2025, 12, 8), new(2025, 12, 25),
        // 2026
        new(2026, 1, 1), new(2026, 1, 12), new(2026, 3, 23), new(2026, 4, 2), new(2026, 4, 3),
        new(2026, 5, 1), new(2026, 5, 18), new(2026, 6, 8), new(2026, 6, 15), new(2026, 6, 29),
        new(2026, 7, 20), new(2026, 8, 7), new(2026, 8, 17), new(2026, 10, 12), new(2026, 11, 2),
        new(2026, 11, 16), new(2026, 12, 8), new(2026, 12, 25),
    ];

    public static bool IsHoliday(DateOnly date) => Dates.Contains(date);

    public static bool IsSundayOrHoliday(DateOnly date) =>
        date.DayOfWeek == DayOfWeek.Sunday || IsHoliday(date);
}
