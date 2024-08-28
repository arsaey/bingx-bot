// Update with your config settings.

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
export default {

  production: {
    client: 'mysql2',
    connection: {
      database: 'crypto_db',
      user:     'hope',
      password: 'a20139'
    },
   
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  },

  

};

