using Microsoft.AspNetCore.Mvc;

namespace Perlax.Modules.Production.Api.Controllers;

[ApiController]
[Route("api/production")]
public class ProductionController : ControllerBase
{
    [HttpGet("status")]
    public IActionResult GetStatus()
    {
        return Ok(new { 
            Module = "Production", 
            Status = "Active", 
            Timestamp = DateTime.UtcNow 
        });
    }
}
