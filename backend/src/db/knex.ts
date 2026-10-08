import knex from 'knex';
import config from './knexfile';

const environment = process.env.NODE_ENV || 'development';
const connectionConfig = config[environment] || config.development;

export const db = knex(connectionConfig);

export default db;
