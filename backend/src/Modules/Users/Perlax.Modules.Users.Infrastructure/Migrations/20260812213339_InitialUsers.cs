using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Perlax.Modules.Users.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialUsers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Idempotente: cubre DBs nuevas y las creadas antes con EnsureCreated.
            migrationBuilder.Sql("""
                CREATE SCHEMA IF NOT EXISTS users;

                CREATE TABLE IF NOT EXISTS users."Users" (
                    "Id" uuid NOT NULL,
                    "Username" character varying(50) NOT NULL,
                    "Email" character varying(100) NOT NULL,
                    "FirstName" character varying(100) NULL,
                    "LastName" character varying(100) NULL,
                    "Area" character varying(100) NULL,
                    "DocumentNumber" character varying(30) NULL,
                    "Salary" numeric(18,2) NULL,
                    "AllowedRoutesJson" text NULL,
                    "PasswordHash" text NOT NULL,
                    "Role" character varying(20) NOT NULL,
                    "IsSystemUser" boolean NOT NULL,
                    "IsActive" boolean NOT NULL,
                    "MustChangePassword" boolean NOT NULL,
                    "AccessFailedCount" integer NOT NULL,
                    "LockoutEnd" timestamp with time zone NULL,
                    "CreatedAt" timestamp with time zone NOT NULL,
                    CONSTRAINT "PK_Users" PRIMARY KEY ("Id")
                );

                ALTER TABLE users."Users" ADD COLUMN IF NOT EXISTS "FirstName" character varying(100);
                ALTER TABLE users."Users" ADD COLUMN IF NOT EXISTS "LastName" character varying(100);
                ALTER TABLE users."Users" ADD COLUMN IF NOT EXISTS "Area" character varying(100);
                ALTER TABLE users."Users" ADD COLUMN IF NOT EXISTS "DocumentNumber" character varying(30);
                ALTER TABLE users."Users" ADD COLUMN IF NOT EXISTS "Salary" numeric(18,2);
                ALTER TABLE users."Users" ADD COLUMN IF NOT EXISTS "AllowedRoutesJson" text;
                ALTER TABLE users."Users" ADD COLUMN IF NOT EXISTS "MustChangePassword" boolean NOT NULL DEFAULT false;
                ALTER TABLE users."Users" ADD COLUMN IF NOT EXISTS "IsActive" boolean NOT NULL DEFAULT true;

                CREATE UNIQUE INDEX IF NOT EXISTS "IX_Users_Username" ON users."Users" ("Username");
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Users",
                schema: "users");
        }
    }
}