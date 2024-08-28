import { Model } from 'objection';
import knexInstance from '../knexInstance.js';

// Initialize Knex connection
//const knex = Knex(.development);

// Bind all Models to Knex
Model.knex(knexInstance);

// Define your model
class Position extends Model {
  static get tableName() {
    return 'positions';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['first_order_id', 'first_order_symbol'],
      properties: {
        id: { type: 'integer' }, // Use 'integer' for auto-increment primary key
        first_order_id: {}, // Fix the property name to match database column
        second_order_id: {}, // Fix the property name to match database column
        is_in_process: { type: 'integer', default: 1 }, // Optional: if you want to enforce default value in validation
        final_status: {

          type: 'string',
          nullable: true,
          enum: [null, 'thriling-first', 'thriling-both', 'stop-first', 'stop-both', 'cancel-both'] // Enum-like constraint for final_status
        },
        maximum_profit: { type: 'number', nullable: true },
        first_order_symbol: { type: 'string' },
        second_order_symbol: { type: 'string', nullable: true },
        first_order_type: { type: 'string' },
        second_order_type: { type: 'string', nullable: true },
        first_order_profit: { type: 'number' },
        second_order_profit: { type: 'number', nullable: true },
        created_at: { type: 'string', format: 'date-time' }, // Optional: for ISO 8601 date-time format
        updated_at: { type: 'string', format: 'date-time' }  // Optional: for ISO 8601 date-time format
      }
    };
  }
}

export default Position;
