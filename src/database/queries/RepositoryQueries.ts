import { dbManager } from '@database/db';
import { type RepositoryRow, repositorySchema } from '@database/schema';
import { eq } from 'drizzle-orm';

export const getRepositoriesFromDb = async (): Promise<RepositoryRow[]> => {
  return dbManager.select().from(repositorySchema).all();
};

export const isRepoUrlDuplicated = async (repoUrl: string) => {
  const result = await dbManager
    .select({ count: repositorySchema.id })
    .from(repositorySchema)
    .where(eq(repositorySchema.url, repoUrl))
    .get();

  return !!result;
};

export const createRepository = async (
  repoUrl: string,
): Promise<RepositoryRow> => {
  const row = await dbManager.write(
    async tx =>
      await tx
        .insert(repositorySchema)
        .values({ url: repoUrl })
        .returning()
        .get(),
  );
  return row;
};

export const deleteRepositoryById = async (id: number): Promise<void> => {
  await dbManager.write(async tx => {
    await tx.delete(repositorySchema).where(eq(repositorySchema.id, id)).run();
  });
};

export const updateRepository = async (
  id: number,
  url: string,
): Promise<void> => {
  await dbManager.write(async tx => {
    await tx
      .update(repositorySchema)
      .set({ url })
      .where(eq(repositorySchema.id, id))
      .run();
  });
};

export const _restoreRepository = async (
  repository: RepositoryRow,
): Promise<void> => {
  await dbManager.write(async tx => {
    await tx
      .insert(repositorySchema)
      .values({
        id: repository.id,
        url: repository.url,
      })
      .onConflictDoNothing()
      .run();
  });
};
