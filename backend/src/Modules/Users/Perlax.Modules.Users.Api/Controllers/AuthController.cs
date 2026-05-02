using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Users.Infrastructure.Persistence;
using Perlax.Modules.Audit.Application.Abstractions;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Perlax.Modules.Users.Domain.Entities;

namespace Perlax.Modules.Users.Api.Controllers;

[ApiController]
[Route("api/users/auth")]
public class AuthController : ControllerBase
{
    private readonly UsersDbContext _context;
    private readonly IAuditService _auditService;
    private readonly IConfiguration _configuration;

    public AuthController(UsersDbContext context, IAuditService auditService, IConfiguration configuration)
    {
        _context = context;
        _auditService = auditService;
        _configuration = configuration;
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == request.Username);

        if (user == null)
        {
            await _auditService.LogAsync(null, request.Username, "Login Failed", "User not found", Request.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            return Unauthorized("Credenciales inválidas.");
        }

        // Check for lockout
        if (user.LockoutEnd.HasValue && user.LockoutEnd.Value > DateTime.UtcNow)
        {
            var remainingTime = user.LockoutEnd.Value - DateTime.UtcNow;
            await _auditService.LogAsync(user.Id.ToString(), user.Username, "Login Blocked", "Account locked due to brute force protection", Request.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            return StatusCode(423, $"Cuenta bloqueada temporalmente. Intente de nuevo en {Math.Ceiling(remainingTime.TotalMinutes)} minutos.");
        }

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            user.AccessFailedCount++;
            if (user.AccessFailedCount >= 5)
            {
                user.LockoutEnd = DateTime.UtcNow.AddMinutes(20);
                await _auditService.LogAsync(user.Id.ToString(), user.Username, "Account Locked", "Maximum failed attempts reached", Request.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            }

            await _context.SaveChangesAsync();
            await _auditService.LogAsync(user.Id.ToString(), request.Username, "Login Failed", $"Invalid password. Attempt {user.AccessFailedCount}/5", Request.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            return Unauthorized("Credenciales inválidas.");
        }

        // Success: Reset security tracking
        user.AccessFailedCount = 0;
        user.LockoutEnd = null;
        await _context.SaveChangesAsync();

        await _auditService.LogAsync(
            user.Id.ToString(), 
            user.Username, 
            "LoginSuccess", 
            "User logged in successfully", 
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

        var token = GenerateJwtToken(user);

        return Ok(new
        {
            user.Id,
            user.Username,
            user.Email,
            user.Role,
            Token = token
        });
    }

    private string GenerateJwtToken(User user)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secretKey = jwtSettings["Secret"] ?? throw new InvalidOperationException("JWT Secret not found.");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.UniqueName, user.Username),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: jwtSettings["Issuer"],
            audience: jwtSettings["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(Convert.ToDouble(jwtSettings["ExpiryInMinutes"] ?? "480")),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var username = User.FindFirstValue(ClaimTypes.Name) ?? User.Identity?.Name ?? "unknown";

        await _auditService.LogAsync(
            userId,
            username,
            "Logout",
            "User logged out successfully",
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

        return Ok();
    }
}

public record LoginRequest(string Username, string Password);
