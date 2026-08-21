using Microsoft.Extensions.Configuration;
using Perlax.Modules.Almacen.Domain.Entities;

namespace Perlax.Modules.Almacen.Infrastructure.Services;

public class AlmacenEmailService
{
    private readonly IReadOnlyList<string> _destinos;

    public AlmacenEmailService(IConfiguration configuration)
    {
        _destinos = configuration.GetSection("AlmacenNotificaciones:CorreosDestino").Get<string[]>()
            ?? Array.Empty<string>();
    }

    public void NotifyNuevaRequisicion(AlmacenRequisicion requisicion)
    {
        _ = Task.Run(() =>
        {
            Console.WriteLine(
                $"[AlmacenEmail] Nueva requisición {requisicion.Codigo} — producto: {requisicion.ProductoNombre}, " +
                $"cantidad: {requisicion.Cantidad} {requisicion.Unidad}. Destinos: {string.Join(", ", _destinos)}");
        });
    }

    public void NotifyPedido(AlmacenRequisicion requisicion, AlmacenPedido pedido, bool parcialRestante)
    {
        _ = Task.Run(() =>
        {
            var tipo = parcialRestante ? "pedido con saldo pendiente" : "pedido registrado";
            Console.WriteLine(
                $"[AlmacenEmail] {tipo} — requisición {requisicion.Codigo}, proveedores: {pedido.Proveedores.Count}. " +
                $"Destinos: {string.Join(", ", _destinos)}");
        });
    }

    public void NotifyRecepcion(AlmacenRequisicion requisicion, AlmacenRecepcionLinea recepcion, bool completa)
    {
        _ = Task.Run(() =>
        {
            var tipo = completa ? "recepción completa" : "recepción parcial";
            Console.WriteLine(
                $"[AlmacenEmail] {tipo} — requisición {requisicion.Codigo}, proveedor: {recepcion.NombreProveedor}, " +
                $"cantidad: {recepcion.CantidadRecibida}. Destinos: {string.Join(", ", _destinos)}");
        });
    }
}
