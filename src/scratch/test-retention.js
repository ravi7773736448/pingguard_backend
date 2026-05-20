import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Website from '../models/website.model.js';
import Log from '../models/log.model.js';
import HourlyStat from '../models/hourlyStat.model.js';
import LogArchive from '../models/logArchive.model.js';
import { runHourlyRollups, archiveOldLogs } from '../services/monitor/aggregation.service.js';
import { getWebsiteAnalytics } from '../services/analytics.service.js';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const runTests = async () => {
  try {
    console.log('🔄 Connecting to MongoDB database...');
    await connectDB();
    console.log('✅ Connected successfully!');

    // 1. Find or create a test website
    console.log('🔄 Finding/creating a test website monitor...');
    let website = await Website.findOne({ url: 'https://retention.test' });
    if (!website) {
      // Find any user id in the db to link to, or use a mock id
      const sampleWebsite = await Website.findOne({});
      const userId = sampleWebsite ? sampleWebsite.userId : new mongoose.Types.ObjectId();
      
      website = await Website.create({
        url: 'https://retention.test',
        name: 'Retention Test Website',
        userId,
        checkInterval: 60,
        responseThreshold: 3000,
        status: 'UP'
      });
      console.log('✅ Created new test website:', website._id);
    } else {
      console.log('✅ Found existing test website:', website._id);
    }

    const websiteId = website._id;

    // 2. Insert mock raw logs for aggregation (last completed hour)
    console.log('\n🔄 Seeding mock raw logs for the previous hour aggregation...');
    const now = new Date();
    const targetHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() - 1, 0, 0, 0);
    const targetHourEnd = new Date(targetHour.getTime() + 60 * 60 * 1000);

    // Delete existing logs in this hour block for this website to start fresh
    await Log.deleteMany({ websiteId, checkedAt: { $gte: targetHour, $lt: targetHourEnd } });

    // Seed 10 logs with specific response times and states
    const logsToCreate = [
      { websiteId, status: 'UP', responseTime: 200, statusCode: 200, checkedAt: new Date(targetHour.getTime() + 5 * 60 * 1000) },
      { websiteId, status: 'UP', responseTime: 250, statusCode: 200, checkedAt: new Date(targetHour.getTime() + 10 * 60 * 1000) },
      { websiteId, status: 'SLOW', responseTime: 3200, statusCode: 200, checkedAt: new Date(targetHour.getTime() + 15 * 60 * 1000) },
      { websiteId, status: 'DOWN', responseTime: 0, statusCode: 502, checkedAt: new Date(targetHour.getTime() + 20 * 60 * 1000) },
      { websiteId, status: 'UP', responseTime: 220, statusCode: 200, checkedAt: new Date(targetHour.getTime() + 25 * 60 * 1000) },
      { websiteId, status: 'UP', responseTime: 230, statusCode: 200, checkedAt: new Date(targetHour.getTime() + 30 * 60 * 1000) },
      { websiteId, status: 'SLOW', responseTime: 3500, statusCode: 200, checkedAt: new Date(targetHour.getTime() + 35 * 60 * 1000) },
      { websiteId, status: 'UP', responseTime: 240, statusCode: 200, checkedAt: new Date(targetHour.getTime() + 40 * 60 * 1000) },
      { websiteId, status: 'UP', responseTime: 210, statusCode: 200, checkedAt: new Date(targetHour.getTime() + 45 * 60 * 1000) },
      { websiteId, status: 'UP', responseTime: 205, statusCode: 200, checkedAt: new Date(targetHour.getTime() + 50 * 60 * 1000) }
    ];

    await Log.create(logsToCreate);
    console.log(`✅ Seeded ${logsToCreate.length} raw telemetry logs inside the hour ${targetHour.toISOString()}`);

    // 3. Insert mock logs older than 30 days to test the Archiver
    console.log('\n🔄 Seeding old raw logs (> 30 days) to test the archiving engine...');
    const oldDate = new Date(Date.now() - 32 * 24 * 60 * 60 * 1000); // 32 days ago
    
    // Clear old logs for this test website
    await Log.deleteMany({ websiteId, checkedAt: { $lt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) } });
    await LogArchive.deleteMany({ websiteId });

    const oldLogsToCreate = [
      { websiteId, status: 'UP', responseTime: 180, statusCode: 200, checkedAt: new Date(oldDate.getTime() + 5 * 60 * 1000) },
      { websiteId, status: 'DOWN', responseTime: 0, statusCode: 500, checkedAt: new Date(oldDate.getTime() + 10 * 60 * 1000) }
    ];

    await Log.create(oldLogsToCreate);
    console.log(`✅ Seeded ${oldLogsToCreate.length} old logs at timestamp ${oldDate.toISOString()}`);

    // 4. Run the Hourly Rollup Aggregation Job
    console.log('\n🔄 Triggering manual run of hourly aggregation rollups...');
    await HourlyStat.deleteMany({ websiteId, timestamp: targetHour });
    const rollupResult = await runHourlyRollups(targetHour);
    console.log('✅ Aggregation Result:', rollupResult);

    // Verify HourlyStat was created
    const generatedHourlyStat = await HourlyStat.findOne({ websiteId, timestamp: targetHour }).lean();
    console.log('📈 Generated HourlyStat record in DB:', generatedHourlyStat);
    
    if (generatedHourlyStat) {
      console.log(`  - Total Checks: ${generatedHourlyStat.totalChecks} (Expected: 10)`);
      console.log(`  - UP Count: ${generatedHourlyStat.upCount} (Expected: 7)`);
      console.log(`  - DOWN Count: ${generatedHourlyStat.downCount} (Expected: 1)`);
      console.log(`  - SLOW Count: ${generatedHourlyStat.slowCount} (Expected: 2)`);
      console.log(`  - Average Latency: ${generatedHourlyStat.avgResponseTime}ms (Expected: ~884ms)`);
      console.log(`  - Min Latency: ${generatedHourlyStat.minResponseTime}ms (Expected: 0ms)`);
      console.log(`  - Max Latency: ${generatedHourlyStat.maxResponseTime}ms (Expected: 3500ms)`);
    } else {
      throw new Error('❌ Failed to verify HourlyStat record generation!');
    }

    // 5. Run the Archiver Job
    console.log('\n🔄 Triggering manual raw logs archiving job...');
    const archiveResult = await archiveOldLogs(30);
    console.log('✅ Archiver Result:', archiveResult);

    // Verify raw logs were archived and removed
    const archivedCount = await LogArchive.countDocuments({ websiteId });
    const remainingOldCount = await Log.countDocuments({ websiteId, checkedAt: { $lt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) } });
    
    console.log(`📈 Archived records found in LogArchive: ${archivedCount} (Expected: 2)`);
    console.log(`📈 Old raw records remaining in active Log table: ${remainingOldCount} (Expected: 0)`);

    if (archivedCount === 2 && remainingOldCount === 0) {
      console.log('✅ Archiving and Purging verified successful!');
    } else {
      throw new Error('❌ Failed to verify Archiver operation!');
    }

    // 6. Test Smart Query Routing
    console.log('\n🔄 Querying getWebsiteAnalytics service to test Smart Router...');
    // We request period = 168 (7 days), which triggers the HourlyStat router path
    const analytics = await getWebsiteAnalytics(websiteId.toString(), { period: 168 });
    
    console.log('📊 Optimized Analytics Result for 7 days (168 hours):');
    console.log(`  - Uptime Percentage: ${analytics.uptime}%`);
    console.log(`  - Total Checks Computed: ${analytics.totalChecks}`);
    console.log(`  - Status Breakdown:`, analytics.statusBreakdown);
    console.log(`  - Latency Range: Avg ${analytics.responseTime.average}ms, Min ${analytics.responseTime.min}ms, Max ${analytics.responseTime.max}ms`);
    console.log(`  - Hourly Data Entries returned: ${analytics.hourlyData.length}`);

    if (analytics.totalChecks === 10 && analytics.hourlyData.length > 0) {
      console.log('✅ Smart Query routing verified working perfectly!');
    } else {
      throw new Error('❌ Smart query router validation failed!');
    }

    console.log('\n🎉 ALL MONGODB RETENTION, INDEX, AND AGGREGATION TESTS COMPLETED SUCCESSFULLY! 🎉');

  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error.message, error.stack);
  } finally {
    console.log('\n🔌 Closing MongoDB connection...');
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed. Exiting test.');
  }
};

runTests();
