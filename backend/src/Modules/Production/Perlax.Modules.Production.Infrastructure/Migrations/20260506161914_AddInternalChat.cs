using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Perlax.Modules.Production.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddInternalChat : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "InternalChatConversations",
                schema: "production",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductionOrderId = table.Column<Guid>(type: "uuid", nullable: true),
                    OTNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Title = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedByUsername = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    CreatedByDisplayName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InternalChatConversations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "InternalChatMessages",
                schema: "production",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ConversationId = table.Column<Guid>(type: "uuid", nullable: false),
                    SenderUsername = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    SenderDisplayName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Message = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    SentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InternalChatMessages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InternalChatMessages_InternalChatConversations_Conversation~",
                        column: x => x.ConversationId,
                        principalSchema: "production",
                        principalTable: "InternalChatConversations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_InternalChatConversations_OTNumber",
                schema: "production",
                table: "InternalChatConversations",
                column: "OTNumber");

            migrationBuilder.CreateIndex(
                name: "IX_InternalChatConversations_ProductionOrderId",
                schema: "production",
                table: "InternalChatConversations",
                column: "ProductionOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_InternalChatConversations_UpdatedAt",
                schema: "production",
                table: "InternalChatConversations",
                column: "UpdatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_InternalChatMessages_ConversationId",
                schema: "production",
                table: "InternalChatMessages",
                column: "ConversationId");

            migrationBuilder.CreateIndex(
                name: "IX_InternalChatMessages_SentAt",
                schema: "production",
                table: "InternalChatMessages",
                column: "SentAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "InternalChatMessages",
                schema: "production");

            migrationBuilder.DropTable(
                name: "InternalChatConversations",
                schema: "production");
        }
    }
}
