import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    // Ensure the "agent" table has a "name" column.
    // Older databases may have an agent table without this column.
    const hasName = await knex.schema.hasColumn("agent", "name");
    if (!hasName) {
        await knex.schema.table("agent", (table) => {
            table.string("name", 255);
        });
    }
}

export async function down(knex: Knex): Promise<void> {
    const hasName = await knex.schema.hasColumn("agent", "name");
    if (hasName) {
        await knex.schema.table("agent", (table) => {
            table.dropColumn("name");
        });
    }
}