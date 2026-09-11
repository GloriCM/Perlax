using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Perlax.Modules.Production.Infrastructure.Persistence;

#nullable disable

namespace Perlax.Modules.Production.Infrastructure.Migrations
{
    [DbContext(typeof(ProductionDbContext))]
    [Migration("20260821180000_AddAreaExpenseCapturas")]
    partial class AddAreaExpenseCapturas
    {
        protected override void BuildTargetModel(ModelBuilder modelBuilder) { }
    }
}
