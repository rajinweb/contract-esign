import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;

async function fixDocumentIndexes() {
  try {
    const collection = mongoose.connection.collection('documents');
    const indexes = await collection.indexes();

    const tokenIndex = indexes.find(idx => idx.name === 'token_1');

    if (tokenIndex && !tokenIndex.sparse) {
      console.log('Fixing token index - dropping old non-sparse index...');
      await collection.dropIndex('token_1');
      console.log('Creating new sparse index for token field...');
      await collection.createIndex({ token: 1 }, { unique: true, sparse: true });
      console.log('Token index fixed successfully');
    }
  } catch (error) {
    console.error('Error fixing document indexes:', error);
  }
}

async function ensureDocumentValidator() {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      console.warn('MongoDB connection is not ready. Skipping document validator.');
      return;
    }
    const recipientsArray = { $ifNull: ['$recipients', []] };
    const versionsArray = { $ifNull: ['$versions', []] };

    const signedRecipientsFilter = {
      $filter: {
        input: recipientsArray,
        as: 'r',
        cond: { $ne: [{ $ifNull: ['$$r.signedVersion', null] }, null] },
      },
    };

    const currentVersionInvariant = {
      $or: [
        { $eq: [{ $size: signedRecipientsFilter }, 0] },
        {
          $eq: [
            '$currentVersion',
            {
              $max: {
                $map: {
                  input: signedRecipientsFilter,
                  as: 'r',
                  in: '$$r.signedVersion',
                },
              },
            },
          ],
        },
      ],
    };

    const preparedOnlyFieldsInvariant = {
      $allElementsTrue: {
        $map: {
          input: versionsArray,
          as: 'v',
          in: {
            $cond: [
              { $eq: ['$$v.label', 'prepared'] },
              true,
              {
                $eq: [
                  { $size: { $ifNull: ['$$v.fields', []] } },
                  0,
                ],
              },
            ],
          },
        },
      },
    };

    const signedByInvariant = {
      $allElementsTrue: {
        $map: {
          input: versionsArray,
          as: 'v',
          in: {
            $cond: [
              {
                $regexMatch: {
                  input: { $ifNull: ['$$v.label', ''] },
                  regex: /^signed/,
                },
              },
              {
                $let: {
                  vars: {
                    signedByArray: {
                      $cond: [
                        { $isArray: '$$v.signedBy' },
                        '$$v.signedBy',
                        {
                          $cond: [
                            {
                              $and: [
                                { $ne: [{ $ifNull: ['$$v.signedBy', null] }, null] },
                                { $ne: ['$$v.signedBy', ''] },
                              ],
                            },
                            ['$$v.signedBy'],
                            [],
                          ],
                        },
                      ],
                    },
                    completedSignerCount: {
                      $size: {
                        $filter: {
                          input: recipientsArray,
                          as: 'r',
                          cond: {
                            $and: [
                              { $eq: ['$$r.role', 'signer'] },
                              { $eq: ['$$r.status', 'signed'] },
                              { $ne: [{ $ifNull: ['$$r.signedVersion', null] }, null] },
                              { $lte: ['$$r.signedVersion', '$$v.version'] },
                            ],
                          },
                        },
                      },
                    },
                  },
                  in: { $eq: [{ $size: '$$signedByArray' }, '$$completedSignerCount'] },
                },
              },
              true,
            ],
          },
        },
      },
    };

    const validator = {
      $expr: {
        $and: [
          currentVersionInvariant,
          preparedOnlyFieldsInvariant,
          signedByInvariant,
        ],
      },
    };

    await db.command({
      collMod: 'documents',
      validator,
      validationLevel: 'moderate',
    });
  } catch (error) {
    console.error('Error ensuring document validator:', error);
  }
}

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState >= 1) {
      return;
    }
    if (!uri) {
      throw new Error('MONGODB_URI is not defined in the environment variables.');
    }
    await mongoose.connect(uri);
    console.log('MongoDB connected successfully');

    await fixDocumentIndexes();
    await ensureDocumentValidator();
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

export default connectDB;
