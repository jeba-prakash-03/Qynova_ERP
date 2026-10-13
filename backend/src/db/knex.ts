import knex from 'knex';
import config from './knexfile';

const environment = process.env.NODE_ENV || 'development';
const connectionConfig = config[environment] || config.development;

if (environment === 'test') {
  const dbName =
    typeof connectionConfig.connection === 'object'
      ? (connectionConfig.connection as any)?.database
      : process.env.DB_NAME;
  if (!dbName || !dbName.endsWith('_test')) {
    throw new Error(
      `[SECURITY GUARD] Tests must use a dedicated database ending in '_test'. Current target: '${dbName}'`
    );
  }
}

export const db = knex(connectionConfig);

export default db;
