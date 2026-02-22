export type MigrationDefinition = {
  id: string;
  path: string;
};

export const CONTROL_PLANE_MIGRATIONS: MigrationDefinition[] = [
  {
    id: '0001_init',
    path: 'migrations/0001_init.sql'
  }
];
