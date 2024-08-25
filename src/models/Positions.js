import { Model } from 'objection';
import Knex from 'knex';

// Initialize Knex connection
const knex = Knex(require('./knexfile').development);

// Bind all Models to Knex
Model.knex(knex);

// Define your model
class Positions extends Model {
  static get tableName() {
    return 'positions';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['first_order_id'],
      properties: {
        id: { type: 'bigInteger' }, // Use 'integer' for auto-increment primary key
        first_order_id: { type: 'bigInteger' }, // Fix the property name to match database column
        second_order_id: { type: 'bigInteger' }, // Fix the property name to match database column
        is_in_proccess: { type: 'integer', default: 1 }, // Optional: if you want to enforce default value in validation
        final_status: { 
          type: 'string',	 
          enum: ['thriling-first', 'thriling-both', 'stop-first', 'stop-both', 'cancell-both'] // Enum-like constraint for final_status
        },
        maximum_profit: { type: 'number' },
        created_at: { type: 'string', format: 'date-time' }, // Optional: for ISO 8601 date-time format
        updated_at: { type: 'string', format: 'date-time' }  // Optional: for ISO 8601 date-time format
      }
    };
  }
}
