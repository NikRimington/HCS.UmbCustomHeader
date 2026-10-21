export const umbracoConfig = {
  baseUrl: process.env.URL ?? 'https://localhost:44301',
  adminLogin: process.env.UMBRACO_USER_LOGIN ?? 'admin@example.com',
  adminPassword: process.env.UMBRACO_USER_PASSWORD ?? '1234567890',
};
