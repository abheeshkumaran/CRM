import { PrismaClient } from '../generated/client';

const prismaClient = new PrismaClient();

const prisma = prismaClient.$extends({
  query: {
    lead: {
      async create({ args, query }) {
        if (args.data.assignedToId) {
          args.data.lastAssignedAt = new Date();
        }
        return query(args);
      },
      async update({ args, query }) {
        if (args.data.assignedToId) {
          args.data.lastAssignedAt = new Date();
        }
        return query(args);
      },
      async updateMany({ args, query }) {
        if (args.data.assignedToId) {
          args.data.lastAssignedAt = new Date();
        }
        return query(args);
      }
    }
  }
}) as unknown as PrismaClient; // Cast required because Prisma Client extensions change the type slightly in ways that might break existing code types

export default prisma;
