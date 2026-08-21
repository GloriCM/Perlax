using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Perlax.Modules.Production.Infrastructure.Persistence;

#nullable disable

namespace Perlax.Modules.Production.Infrastructure.Migrations
{
    [DbContext(typeof(ProductionDbContext))]
    [Migration("20260811160000_AddOpProcessScheduleExtendedFields")]
    partial class AddOpProcessScheduleExtendedFields
    {
        protected override void BuildTargetModel(ModelBuilder modelBuilder) { }
    }
}