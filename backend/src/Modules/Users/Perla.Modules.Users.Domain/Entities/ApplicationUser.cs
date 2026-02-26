using Microsoft.AspNetCore.Identity;

namespace Perla.Modules.Users.Domain.Entities;

public class ApplicationUser : IdentityUser
{
    public string? FullName { get; set; }
}
