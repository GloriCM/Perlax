using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Perlax.Modules.Production.Infrastructure.Persistence;

#nullable disable

namespace Perlax.Modules.Production.Infrastructure.Migrations
{
    [DbContext(typeof(ProductionDbContext))]
    [Migration("20260819160000_AddAreaExpenseCatalog")]
    partial class AddAreaExpenseCatalog
    {
        protected override void BuildTargetModel(ModelBuilder modelBuilder) { }
    }
}