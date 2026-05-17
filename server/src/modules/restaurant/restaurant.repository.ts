import { getPool } from '../../db/pool';

/**
 * Returns true if the given company has an active module with the given key.
 * Used to gate access to integration routes at the company level.
 */
export async function hasActiveModule(
  companyId: string,
  moduleKey: string,
): Promise<boolean> {
  const result = await getPool().query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
         FROM company_modules
        WHERE company_id = $1
          AND module_key = $2
          AND active     = true
     ) AS exists`,
    [companyId, moduleKey],
  );
  return result.rows[0]?.exists === true;
}
