/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.createTable('positions', (table) => {
    table.increments('id').primary();
    table.string('first_order_type').nullable();
    table.string('second_order_type').nullable();
    table.string('first_order_id').unique().notNullable();
    table.string('second_order_id').unique().nullable();
    table.string('first_order_symbol').notNullable();
    table.string('second_order_symbol').nullable();
    table.double('first_order_profit').defaultTo(0);
    table.double('second_order_profit').defaultTo(0);
    table.integer('is_in_process').defaultTo(1);
    table.string('final_status').nullable().checkIn(['thriling-first', 'thriling-both', 'stop-first', 'stop-both', 'cancel-both']);
    table.double('maximum_profit').nullable(); // Add the maximum_profit column
    table.double('unique_maximum_profit').nullable(); // Add the maximum_profit column
    table.double('current_sum_profit').nullable();
    table.double('order_update_percent').nullable().defaultTo(0);

    table.double('first_order_init_price').nullable().defaultTo(0);
    table.double('first_order_update_percent').nullable().defaultTo(0);
    table.double('second_order_init_price').nullable().defaultTo(0);
    table.double('second_order_update_percent').nullable().defaultTo(0);

    table.timestamps(true, true); // Adds created_at and updated_at
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.dropTable('positions');
};
