// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import m0000 from './20251222152612_past_mandrill/migration.sql';
import m0001 from './20260602175528_famous_serpent_society/migration.sql';

export default {
  migrations: {
    "20251222152612_past_mandrill": m0000,
    "20260602175528_famous_serpent_society": m0001,
  }
}