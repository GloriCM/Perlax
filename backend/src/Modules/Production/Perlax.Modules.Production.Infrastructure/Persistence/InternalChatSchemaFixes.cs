using System.Data;
using Microsoft.EntityFrameworkCore;

namespace Perlax.Modules.Production.Infrastructure.Persistence;

public static class InternalChatSchemaFixes
{
    public static async Task ApplyAsync(ProductionDbContext context)
    {
        var connection = context.Database.GetDbConnection();
        var shouldClose = connection.State != ConnectionState.Open;
        if (shouldClose)
            await context.Database.OpenConnectionAsync();

        try
        {
            await ExecuteAsync(connection, """
                ALTER TABLE IF EXISTS production."InternalChatConversations"
                ADD COLUMN IF NOT EXISTS "ConversationType" integer NOT NULL DEFAULT 2;

                ALTER TABLE IF EXISTS production."InternalChatConversations"
                ADD COLUMN IF NOT EXISTS "AreaKey" character varying(80) NULL;

                ALTER TABLE IF EXISTS production."InternalChatConversations"
                ADD COLUMN IF NOT EXISTS "DirectPairKey" character varying(520) NULL;

                CREATE TABLE IF NOT EXISTS production."InternalChatParticipants" (
                    "Id" uuid NOT NULL,
                    "ConversationId" uuid NOT NULL,
                    "Username" character varying(255) NOT NULL,
                    "JoinedAt" timestamp with time zone NOT NULL,
                    "LastReadAt" timestamp with time zone NULL,
                    CONSTRAINT "PK_InternalChatParticipants" PRIMARY KEY ("Id")
                );

                CREATE UNIQUE INDEX IF NOT EXISTS "IX_InternalChatParticipants_ConversationId_Username"
                    ON production."InternalChatParticipants" ("ConversationId", "Username");
                """);
        }
        finally
        {
            if (shouldClose)
                await context.Database.CloseConnectionAsync();
        }
    }

    private static async Task ExecuteAsync(System.Data.Common.DbConnection connection, string sql)
    {
        await using var cmd = connection.CreateCommand();
        cmd.CommandText = sql;
        await cmd.ExecuteNonQueryAsync();
    }
}
