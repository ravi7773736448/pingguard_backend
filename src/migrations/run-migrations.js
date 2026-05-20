import Website from '../models/website.model.js';

const runMigrations = async () => {
  try {
    console.log('[MIGRATION] Checking for database updates...');
    
    // Find websites that don't have expectedStatus or validation fields set
    const websitesToUpdate = await Website.find({
      $or: [
        { method: { $exists: false } },
        { headers: { $exists: false } },
        { body: { $exists: false } },
        { expectedStatus: { $exists: false } },
        { timeout: { $exists: false } },
        { responseValidationType: { $exists: false } },
        { responseValidationValue: { $exists: false } }
      ]
    });

    if (websitesToUpdate.length === 0) {
      console.log('[MIGRATION] Database is up to date. No migrations needed.');
      return;
    }

    console.log(`[MIGRATION] Seeding ${websitesToUpdate.length} legacy monitors with default API/validation fields...`);

    const result = await Website.updateMany(
      {
        $or: [
          { method: { $exists: false } },
          { headers: { $exists: false } },
          { body: { $exists: false } },
          { expectedStatus: { $exists: false } },
          { timeout: { $exists: false } },
          { responseValidationType: { $exists: false } },
          { responseValidationValue: { $exists: false } }
        ]
      },
      {
        $set: {
          method: 'GET',
          headers: {},
          body: '',
          expectedStatus: 200,
          timeout: 10000,
          responseValidationType: 'NONE',
          responseValidationValue: ''
        }
      }
    );

    console.log(`[MIGRATION] Successfully updated ${result.modifiedCount} legacy records.`);
  } catch (error) {
    console.error('[MIGRATION] Migration failed:', error.message);
  }
};

export default runMigrations;
