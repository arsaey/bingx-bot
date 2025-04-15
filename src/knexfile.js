// Update with your config settings.

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
export default {

  production: {
    client: 'mysql2',
    connection: {
      database: 'khashbase',
      user:     'khashiola',
      password: 'c0roCodile',
  host: '127.0.0.1'  },
   
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  },

  

};

