/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.createTable('positions', (table) => {
    table.increments('id').primary();
    table.bigInteger('first_order_id').unique().notNullable();
    table.bigInteger('second_order_id').unique().nullable();
    table.integer('is_in_proccess').defaultTo(1);   
    table.string('final_status').nullable().checkIn(['thriling-first', 'thriling-both', 'stop-first', 'stop-both', 'cancell-both']);
    table.double('maximum_profit').nullable(); // Add the maximum_profit column
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
