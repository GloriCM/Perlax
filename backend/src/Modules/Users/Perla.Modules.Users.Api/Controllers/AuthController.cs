using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Perla.Modules.Users.Application.Abstractions;
using Perla.Modules.Users.Domain.Entities;
using System.Threading.Tasks;

namespace Perla.Modules.Users.Api.Controllers;

[ApiController]
[Route("api/users/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IJwtProvider _jwtProvider;

    public AuthController(UserManager<ApplicationUser> userManager, IJwtProvider jwtProvider)
    {
        _userManager = userManager;
        _jwtProvider = jwtProvider;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var user = new ApplicationUser
        {
            UserName = request.UserName,
            Email = request.Email,
            FullName = request.FullName
        };

        var result = await _userManager.CreateAsync(user, request.Password);

        if (!result.Succeeded)
        {
            return BadRequest(result.Errors);
        }

        return Ok(new { Message = "User registered successfully" });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _userManager.FindByNameAsync(request.UserName);

        if (user == null || !await _userManager.CheckPasswordAsync(user, request.Password))
        {
            return Unauthorized("Invalid username or password");
        }

        var token = _jwtProvider.Generate(user);

        return Ok(new { Token = token, UserName = user.UserName });
    }
}

public record RegisterRequest(string UserName, string Email, string Password, string FullName);
public record LoginRequest(string UserName, string Password);
