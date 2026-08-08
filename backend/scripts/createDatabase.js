// Creates the target application database if it does not exist yet, using the
// admin connection (sys schema) which is allowed to run DDL on TiDB Serverless.
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const main = async () => {
  const adminUrl = process.env.ADMIN_DATABASE_URL;
  if (!adminUrl) {
    console.error('ADMIN_DATABASE_URL is not set');
    process.exit(1);
  }
  const dbName = process.env.DB_NAME || 'hospital';

  const prisma = new PrismaClient({ datasourceUrl: adminUrl });
  await prisma.$connect();
  await prisma.$executeRawUnsafe(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await prisma.$disconnect();
  console.log(`Database '${dbName}' is ready`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
