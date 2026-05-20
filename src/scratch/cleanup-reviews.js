import mongoose from 'mongoose';
import { Config } from '../config/config.js';

const cleanupReviews = async () => {
  await mongoose.connect(Config.MONGO_URI);
  console.log('Connected to MongoDB');

  const reviews = await mongoose.connection.collection('reviews').find({}).toArray();
  
  const userReviewCounts = {};
  const reviewsToDelete = [];

  reviews.forEach(review => {
    const userId = review.user.toString();
    if (!userReviewCounts[userId]) {
      userReviewCounts[userId] = [];
    }
    userReviewCounts[userId].push(review._id.toString());
  });

  Object.keys(userReviewCounts).forEach(userId => {
    const ids = userReviewCounts[userId];
    if (ids.length > 1) {
      const toDelete = ids.slice(1);
      reviewsToDelete.push(...toDelete);
      console.log(`User ${userId}: keeping ${ids[0]}, deleting ${toDelete.length} reviews`);
    }
  });

  if (reviewsToDelete.length > 0) {
    await mongoose.connection.collection('reviews').deleteMany({
      _id: { $in: reviewsToDelete.map(id => new mongoose.Types.ObjectId(id)) }
    });
    console.log(`Deleted ${reviewsToDelete.length} duplicate reviews`);
  } else {
    console.log('No duplicates found');
  }

  await mongoose.disconnect();
  console.log('Done');
};

cleanupReviews();