import { PrismaClient } from "@prisma/client";

const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
}

export default prisma;

// restore the data in heroku database

// heroku pg:backups:restore b015 DATABASE_URL --app imperial-data --confirm imperial-data
