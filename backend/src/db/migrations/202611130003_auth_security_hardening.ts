import type { Knex } from 'knex';
import crypto from 'crypto';

export async function up(knex: Knex): Promise<void> {
  // 1. Add token_version column to users table
  const hasTokenVersion = await knex.schema.hasColumn('users', 'token_version');
  if (!hasTokenVersion) {
    await knex.schema.alterTable('users', (table) => {
      table.integer('token_version').unsigned().notNullable().defaultTo(0);
    });
  }

  // 2. Add ip column to login_attempts and update unique constraint
  const hasIp = await knex.schema.hasColumn('login_attempts', 'ip');
  if (!hasIp) {
    await knex.schema.alterTable('login_attempts', (table) => {
      table.string('ip', 45).notNullable().defaultTo('127.0.0.1');
    });

    // Drop unique index on email alone and create compound unique index on (email, ip)
    try {
      await knex.schema.alterTable('login_attempts', (table) => {
        table.dropUnique(['email'], 'login_attempts_email_unique');
      });
    } catch {
      // Index may have been named differently or already dropped
    }

    try {
      await knex.schema.alterTable('login_attempts', (table) => {
        table.unique(['email', 'ip'], { indexName: 'login_attempts_email_ip_unique' });
      });
    } catch {
      // Ignore if already created
    }
  }

  // 3. Hash any existing unhashed tokens in refresh_tokens
  const hasRefreshTokens = await knex.schema.hasTable('refresh_tokens');
  if (hasRefreshTokens) {
    const rows = await knex('refresh_tokens').select('id', 'token');
    for (const r of rows) {
      if (r.token && r.token.length !== 64) {
        const hash = crypto.createHash('sha256').update(r.token).digest('hex');
        try {
          await knex('refresh_tokens').where({ id: r.id }).update({ token: hash });
        } catch {
          // If collision or already hashed, delete old duplicate
          await knex('refresh_tokens').where({ id: r.id }).delete();
        }
      }
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTokenVersion = await knex.schema.hasColumn('users', 'token_version');
  if (hasTokenVersion) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('token_version');
    });
  }

  const hasIp = await knex.schema.hasColumn('login_attempts', 'ip');
  if (hasIp) {
    try {
      await knex.schema.alterTable('login_attempts', (table) => {
        table.dropUnique(['email', 'ip'], 'login_attempts_email_ip_unique');
        table.unique(['email'], { indexName: 'login_attempts_email_unique' });
        table.dropColumn('ip');
      });
    } catch {
      // Ignored on rollback
    }
  }
}
