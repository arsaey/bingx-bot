/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
    return knex.schema.createTable('settings', (table) => {
        table.increments('id').primary();
        table.double('start_time').nullable();
        table.double('last_handled_time').nullable();
        table.double('last_handled_order_id').nullable();
        table.string('wait_for').nullable;
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
    return knex.schema.dropTable('settings');
};

