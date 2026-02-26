using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Perla.Modules.Users.Application.Abstractions;

public interface IJwtProvider
{
    string Generate(Domain.Entities.ApplicationUser user);
}
