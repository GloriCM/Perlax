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
        var username = (request.Username ?? string.Empty).Trim();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);

        if (user == null)
        {
            await _auditService.LogAsync(null, username, "Login Failed", "User not found", Request.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            return Unauthorized("Credenciales inválidas.");
        }

        if (user.LockoutEnd.HasValue && user.LockoutEnd.Value > DateTime.UtcNow)
        {
            var remainingTime = user.LockoutEnd.Value - DateTime.UtcNow;
            await _auditService.LogAsync(user.Id.ToString(), user.Username, "Login Blocked", "Account locked due to brute force protection", Request.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            return StatusCode(423, $"Cuenta bloqueada temporalmente. Intente de nuevo en {Math.Ceiling(remainingTime.TotalMinutes)} minutos.");
        }

        if (!user.IsActive)
        {
            await _auditService.LogAsync(user.Id.ToString(), user.Username, "Login Blocked", "User is inactive", Request.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            return Unauthorized("Usuario desactivado. Contacte al administrador.");
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
            await _auditService.LogAsync(user.Id.ToString(), username, "Login Failed", $"Invalid password. Attempt {user.AccessFailedCount}/5", Request.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            return Unauthorized("Credenciales inválidas.");
        }

        user.AccessFailedCount = 0;
        user.LockoutEnd = null;
        await _context.SaveChangesAsync();

        await _auditService.LogAsync(
            user.Id.ToString(),
            user.Username,
            "LoginSuccess",
            user.MustChangePassword
                ? "User logged in successfully (must change password)"
                : "User logged in successfully",
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

        var token = GenerateJwtToken(user);
        var allowedRoutes = AllowedRoutesPolicy.DeserializeForResponse(user.Role, user.AllowedRoutesJson);

        return Ok(new
        {
            user.Id,
            user.Username,
            user.Email,
            user.FirstName,
            user.LastName,
            user.Area,
            user.Role,
            user.MustChangePassword,
            AllowedRoutes = allowedRoutes,
            Token = token
        });
    }

    /// <summary>
    /// El usuario cambia su propia contraseña (obligatorio tras el primer login con cédula).
    /// </summary>
    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userIdRaw = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (!Guid.TryParse(userIdRaw, out var userId))
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.CurrentPassword) || string.IsNullOrWhiteSpace(request.NewPassword))
            return BadRequest("La contraseña actual y la nueva son obligatorias.");

        var newPassword = request.NewPassword.Trim();
        if (newPassword.Length < 6)
            return BadRequest("La nueva contraseña debe tener al menos 6 caracteres.");

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return Unauthorized();

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            return BadRequest("La contraseña actual no es correcta.");

        if (BCrypt.Net.BCrypt.Verify(newPassword, user.PasswordHash))
            return BadRequest("La nueva contraseña debe ser distinta a la actual.");

        // No permitir dejar la cédula como contraseña definitiva.
        if (!string.IsNullOrWhiteSpace(user.DocumentNumber)
            && string.Equals(newPassword, user.DocumentNumber, StringComparison.Ordinal))
            return BadRequest("La nueva contraseña no puede ser igual a la cédula.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        user.MustChangePassword = false;
        await _context.SaveChangesAsync();

        await _auditService.LogAsync(
            user.Id.ToString(),
            user.Username,
            "PASSWORD_CHANGED",
            "User changed their password",
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

        var token = GenerateJwtToken(user);
        var allowedRoutes = AllowedRoutesPolicy.DeserializeForResponse(user.Role, user.AllowedRoutesJson);

        return Ok(new
        {
            user.Id,
            user.Username,
            user.Email,
            user.FirstName,
            user.LastName,
            user.Area,
            user.Role,
            MustChangePassword = false,
            AllowedRoutes = allowedRoutes,
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
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.UniqueName, user.Username),
            new Claim(ClaimTypes.Name, user.Username),
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

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
