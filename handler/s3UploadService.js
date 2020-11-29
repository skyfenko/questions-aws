'use strict'

const AWS = require('aws-sdk');
AWS.config.update({region: AWS_DEPLOY_REGION});
const s3 = new AWS.S3({apiVersion: '2006-03-01'});

/**
 * Upload JPEG image to S3 with public read ACL
 *
 * @param body item being saved in DB
 * @param s3ImageBucket name of s3 image bucket
 * @returns {Promise<void>}
 */
const uploadImage = async (body, s3ImageBucket) => {
    const params = {
        Body: Buffer.from(body.imageContent.replace(/^data:image\/\w+;base64,/, ""), 'base64'),
        ContentEncoding: 'base64',
        ContentType: 'image/jpeg',
        Bucket: s3ImageBucket,
        Key: `${body.category}/${body.group}/${body.id}.jpg`,
        ACL: 'public-read'
    };
    await s3.upload(params).promise();
};

module.exports = {uploadImage}