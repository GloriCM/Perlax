namespace Perlax.Modules.Production.Application.Common;

public sealed class ResourceConflictException : Exception
{
    public ResourceConflictException(string message) : base(message) { }
}