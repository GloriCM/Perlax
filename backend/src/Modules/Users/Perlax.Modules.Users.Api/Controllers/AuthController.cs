using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Users.Infrastructure.Persistence;
using Perlax.Modules.Audit.Application.Abstractions;

namespace Perlax.Modules.Users.Api.Controllers;

[ApiController]
[Route("api/users/auth")]
public class AuthController : ControllerBase
{
    private readonly UsersDbContext _context;
    private readonly IAuditService _auditService;

    public AuthController(UsersDbContext context, IAuditService auditService)
    {
        _context = context;
        _auditService = auditService;
    }

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

        return Ok(new
        {
            user.Id,
            user.Username,
            user.Email,
            user.Role
        });
    }

    // Endpoint to test deletion protection for admin
    [HttpDelete("test-delete/{id}")]
    public async Task<IActionResult> DeleteUser(Guid id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound();

        try
        {
            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
            
            await _auditService.LogAsync(
                null, 
                "system", 
                "UserDeleted", 
                $"User {user.Username} deleted", 
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            await _auditService.LogAsync(
                null, 
                "system", 
                "UserDeletionFailed", 
                $"Failed to delete user {user.Username}: {ex.Message}", 
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] LogoutRequest request)
    {
        await _auditService.LogAsync(
            request.UserId, 
            request.Username, 
            "Logout", 
            "User logged out successfully", 
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

        return Ok();
    }
}

public record LoginRequest(string Username, string Password);
public record LogoutRequest(string UserId, string Username);
