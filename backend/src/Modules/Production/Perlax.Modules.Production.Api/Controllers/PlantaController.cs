using System.Net;
using System.Net.Sockets;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace Perlax.Modules.Production.Api.Controllers;

public sealed class PlantaOptions
{
    public const string SectionName = "Planta";

    /// <summary>Si false, /planta y /api/planta/* no operan (host público).</summary>
    public bool Enabled { get; set; }

    /// <summary>CIDRs LAN permitidos (ej. 192.168.0.0/16).</summary>
    public string[] AllowedCidrs { get; set; } =
    [
        "127.0.0.1/32",
        "::1/128",
        "10.0.0.0/8",
        "172.16.0.0/12",
        "192.168.0.0/16",
    ];
}

[ApiController]
[Route("api/planta")]
public sealed class PlantaController : ControllerBase
{
    private readonly PlantaOptions _options;
    private readonly IWebHostEnvironment _environment;

    public PlantaController(IOptions<PlantaOptions> options, IWebHostEnvironment environment)
    {
        _options = options.Value;
        _environment = environment;
    }

    [HttpGet("access")]
    [AllowAnonymous]
    public IActionResult CheckAccess()
    {
        if (!IsRequestAllowed(HttpContext, _options, _environment, out var errorBody))
        {
            return StatusCode(StatusCodes.Status403Forbidden, errorBody);
        }

        var clientIp = ResolveClientIp(HttpContext);
        return Ok(new
        {
            ok = true,
            clientIp = clientIp?.ToString(),
            development = _environment.IsDevelopment(),
        });
    }

    internal static bool IsRequestAllowed(HttpContext context, PlantaOptions options, IWebHostEnvironment environment, out object? errorBody)
    {
        errorBody = null;
        if (!options.Enabled)
        {
            errorBody = new
            {
                ok = false,
                reason = "disabled",
                message = "La vista de planta no está habilitada en este entorno.",
            };
            return false;
        }

        var clientIp = ResolveClientIp(context);
        if (!environment.IsDevelopment())
        {
            if (clientIp is null || !IsIpAllowed(clientIp, options.AllowedCidrs))
            {
                errorBody = new
                {
                    ok = false,
                    reason = "network",
                    message = "Acceso solo desde la red interna de la empresa.",
                    clientIp = clientIp?.ToString(),
                };
                return false;
            }
        }

        return true;
    }

    internal static IPAddress? ResolveClientIp(HttpContext context)
    {
        var forwarded = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(forwarded))
        {
            var first = forwarded.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .FirstOrDefault();
            if (first is not null && IPAddress.TryParse(first, out var forwardedIp))
            {
                return Normalize(forwardedIp);
            }
        }

        return Normalize(context.Connection.RemoteIpAddress);
    }

    private static IPAddress? Normalize(IPAddress? ip)
    {
        if (ip is null) return null;
        if (ip.IsIPv4MappedToIPv6) return ip.MapToIPv4();
        return ip;
    }

    internal static bool IsIpAllowed(IPAddress ip, IEnumerable<string> cidrs)
    {
        foreach (var raw in cidrs)
        {
            if (string.IsNullOrWhiteSpace(raw)) continue;
            if (TryParseCidr(raw.Trim(), out var network, out var prefixLength)
                && IsInNetwork(ip, network, prefixLength))
            {
                return true;
            }
        }

        return false;
    }

    private static bool TryParseCidr(string cidr, out IPAddress network, out int prefixLength)
    {
        network = IPAddress.None;
        prefixLength = 0;

        var parts = cidr.Split('/', 2, StringSplitOptions.TrimEntries);
        if (!IPAddress.TryParse(parts[0], out var parsed)) return false;
        network = parsed.IsIPv4MappedToIPv6 ? parsed.MapToIPv4() : parsed;

        if (parts.Length == 1)
        {
            prefixLength = network.AddressFamily == AddressFamily.InterNetwork ? 32 : 128;
            return true;
        }

        if (!int.TryParse(parts[1], out prefixLength)) return false;
        var max = network.AddressFamily == AddressFamily.InterNetwork ? 32 : 128;
        return prefixLength >= 0 && prefixLength <= max;
    }

    private static bool IsInNetwork(IPAddress address, IPAddress network, int prefixLength)
    {
        var addr = address.IsIPv4MappedToIPv6 ? address.MapToIPv4() : address;
        if (addr.AddressFamily != network.AddressFamily) return false;

        var addrBytes = addr.GetAddressBytes();
        var netBytes = network.GetAddressBytes();
        if (addrBytes.Length != netBytes.Length) return false;

        var fullBytes = prefixLength / 8;
        var remainingBits = prefixLength % 8;

        for (var i = 0; i < fullBytes; i++)
        {
            if (addrBytes[i] != netBytes[i]) return false;
        }

        if (remainingBits == 0) return true;

        var mask = (byte)(0xFF << (8 - remainingBits));
        return (addrBytes[fullBytes] & mask) == (netBytes[fullBytes] & mask);
    }
}
