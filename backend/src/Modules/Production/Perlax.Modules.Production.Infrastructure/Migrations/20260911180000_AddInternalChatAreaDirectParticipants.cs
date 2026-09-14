using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Perlax.Modules.Production.Infrastructure.Migrations
{
    [DbContext(typeof(Persistence.ProductionDbContext))]
    [Migration("20260911180000_AddInternalChatAreaDirectParticipants")]
    public partial class AddInternalChatAreaDirectParticipants : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE production."InternalChatConversations"
                ADD COLUMN IF NOT EXISTS "ConversationType" integer NOT NULL DEFAULT 2;

                ALTER TABLE production."InternalChatConversations"
                ADD COLUMN IF NOT EXISTS "AreaKey" character varying(80) NULL;

                ALTER TABLE production."InternalChatConversations"
                ADD COLUMN IF NOT EXISTS "DirectPairKey" character varying(520) NULL;

                -- Conversaciones OT existentes → hilos por OP (Diseño)
                UPDATE production."InternalChatConversations"
                SET "ConversationType" = 2,
                    "AreaKey" = COALESCE(NULLIF(TRIM("AreaKey"), ''), 'diseño')
                WHERE COALESCE("OTNumber", '') <> '';

                CREATE TABLE IF NOT EXISTS production."InternalChatParticipants" (
                    "Id" uuid NOT NULL,
                    "ConversationId" uuid NOT NULL,
                    "Username" character varying(255) NOT NULL,
                    "JoinedAt" timestamp with time zone NOT NULL,
                    "LastReadAt" timestamp with time zone NULL,
                    CONSTRAINT "PK_InternalChatParticipants" PRIMARY KEY ("Id"),
                    CONSTRAINT "FK_InternalChatParticipants_InternalChatConversations_ConversationId"
                        FOREIGN KEY ("ConversationId")
                        REFERENCES production."InternalChatConversations" ("Id")
                        ON DELETE CASCADE
                );

                CREATE UNIQUE INDEX IF NOT EXISTS "IX_InternalChatParticipants_ConversationId_Username"
                    ON production."InternalChatParticipants" ("ConversationId", "Username");

                CREATE INDEX IF NOT EXISTS "IX_InternalChatParticipants_ConversationId"
                    ON production."InternalChatParticipants" ("ConversationId");

                CREATE INDEX IF NOT EXISTS "IX_InternalChatParticipants_Username"
                    ON production."InternalChatParticipants" ("Username");

                CREATE INDEX IF NOT EXISTS "IX_InternalChatConversations_ConversationType"
                    ON production."InternalChatConversations" ("ConversationType");

                CREATE INDEX IF NOT EXISTS "IX_InternalChatConversations_ConversationType_AreaKey"
                    ON production."InternalChatConversations" ("ConversationType", "AreaKey");

                CREATE INDEX IF NOT EXISTS "IX_InternalChatConversations_DirectPairKey"
                    ON production."InternalChatConversations" ("DirectPairKey");

                -- Backfill participantes desde creador + remitentes
                INSERT INTO production."InternalChatParticipants" ("Id", "ConversationId", "Username", "JoinedAt", "LastReadAt")
                SELECT gen_random_uuid(), src."ConversationId", src."Username", NOW(), NULL
                FROM (
                    SELECT c."Id" AS "ConversationId", LOWER(TRIM(c."CreatedByUsername")) AS "Username"
                    FROM production."InternalChatConversations" c
                    WHERE TRIM(COALESCE(c."CreatedByUsername", '')) <> ''
                    UNION
                    SELECT m."ConversationId", LOWER(TRIM(m."SenderUsername")) AS "Username"
                    FROM production."InternalChatMessages" m
                    WHERE TRIM(COALESCE(m."SenderUsername", '')) <> ''
                ) src
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM production."InternalChatParticipants" p
                    WHERE p."ConversationId" = src."ConversationId"
                      AND p."Username" = src."Username"
                );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DROP TABLE IF EXISTS production."InternalChatParticipants";
                ALTER TABLE production."InternalChatConversations" DROP COLUMN IF EXISTS "DirectPairKey";
                ALTER TABLE production."InternalChatConversations" DROP COLUMN IF EXISTS "AreaKey";
                ALTER TABLE production."InternalChatConversations" DROP COLUMN IF EXISTS "ConversationType";
                """);
        }
    }
}
