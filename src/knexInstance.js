import Knex from 'knex';
import knexConfig from './knexfile.js'; // Adjust path as needed

const knexInstance = Knex(knexConfig.production);

export default knexInstance;