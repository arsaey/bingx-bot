import { Model } from 'objection';
import knexInstance from '../knexInstance.js';

// Initialize Knex connection
//const knex = Knex(.development);

// Bind all Models to Knex
Model.knex(knexInstance);

// Define your model
class Position extends Model {
  static get tableName() {
    return 'settings';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        start_time: { type: 'number' },
        last_handled_time: { type: 'number', nullable: true },
        last_handled_order_id: { type: 'number', nullable: true },
        wait_for: { type: 'string' },
        extra_info: { type: 'string', nullable: true },
      }
    };
  }
}

export default Position;
