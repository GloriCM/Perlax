using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Almacen.Domain.Entities;

namespace Perlax.Modules.Almacen.Infrastructure.Persistence;

public class AlmacenDbContext : DbContext
{
    public AlmacenDbContext(DbContextOptions<AlmacenDbContext> options) : base(options) { }

    public DbSet<AlmacenProducto> Productos => Set<AlmacenProducto>();
    public DbSet<AlmacenProveedor> Proveedores => Set<AlmacenProveedor>();
    public DbSet<AlmacenRequisicion> Requisiciones => Set<AlmacenRequisicion>();
    public DbSet<AlmacenPedido> Pedidos => Set<AlmacenPedido>();
    public DbSet<AlmacenPedidoProveedor> PedidoProveedores => Set<AlmacenPedidoProveedor>();
    public DbSet<AlmacenOrdenCompra> OrdenesCompra => Set<AlmacenOrdenCompra>();
    public DbSet<AlmacenOrdenCompraLinea> OrdenCompraLineas => Set<AlmacenOrdenCompraLinea>();
    public DbSet<AlmacenRecepcionLinea> RecepcionLineas => Set<AlmacenRecepcionLinea>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("almacen");

        modelBuilder.Entity<AlmacenProducto>(e =>
        {
            e.ToTable("Productos");
            e.HasKey(x => x.Id);
            e.Property(x => x.Nombre).HasMaxLength(300);
            e.Property(x => x.TipoRequisicionId).HasMaxLength(50);
            e.Property(x => x.UnidadSugerida).HasMaxLength(30);
            e.Property(x => x.CostoEstandar).HasPrecision(18, 2);
        });

        modelBuilder.Entity<AlmacenProveedor>(e =>
        {
            e.ToTable("Proveedores");
            e.HasKey(x => x.Id);
            e.Property(x => x.Nombre).HasMaxLength(300);
            e.Property(x => x.Nit).HasMaxLength(30);
        });

        modelBuilder.Entity<AlmacenRequisicion>(e =>
        {
            e.ToTable("Requisiciones");
            e.HasKey(x => x.Id);
            e.Property(x => x.Codigo).HasMaxLength(20);
            e.Property(x => x.Estado).HasMaxLength(30);
            e.Property(x => x.Cantidad).HasPrecision(18, 4);
            e.HasIndex(x => new { x.AnioCodigo, x.SecuenciaCodigo }).IsUnique();
            e.HasIndex(x => x.Codigo).IsUnique();
        });

        modelBuilder.Entity<AlmacenPedido>(e =>
        {
            e.ToTable("Pedidos");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.RequisicionId).IsUnique();
            e.HasOne(x => x.Requisicion).WithOne(x => x.Pedido).HasForeignKey<AlmacenPedido>(x => x.RequisicionId);
        });

        modelBuilder.Entity<AlmacenPedidoProveedor>(e =>
        {
            e.ToTable("PedidoProveedores");
            e.HasKey(x => x.Id);
            e.Property(x => x.Cantidad).HasPrecision(18, 4);
            e.Property(x => x.PrecioUnitario).HasPrecision(18, 2);
            e.HasOne(x => x.Pedido).WithMany(x => x.Proveedores).HasForeignKey(x => x.PedidoId);
        });

        modelBuilder.Entity<AlmacenOrdenCompra>(e =>
        {
            e.ToTable("OrdenesCompra");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.NumeroOrdenCompra).IsUnique();
        });

        modelBuilder.Entity<AlmacenOrdenCompraLinea>(e =>
        {
            e.ToTable("OrdenCompraLineas");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.PedidoProveedorId).IsUnique();
            e.HasOne(x => x.OrdenCompra).WithMany(x => x.Lineas).HasForeignKey(x => x.OrdenCompraId);
        });

        modelBuilder.Entity<AlmacenRecepcionLinea>(e =>
        {
            e.ToTable("RecepcionLineas");
            e.HasKey(x => x.Id);
            e.Property(x => x.CantidadRecibida).HasPrecision(18, 4);
            e.Property(x => x.CantidadPedidaEnMomento).HasPrecision(18, 4);
            e.HasOne(x => x.Requisicion).WithMany(x => x.Recepciones).HasForeignKey(x => x.RequisicionId);
        });
    }
}
