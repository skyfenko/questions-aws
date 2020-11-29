'use strict'

const AWS = require('aws-sdk');
AWS.config.update({region: AWS_DEPLOY_REGION});
const polly = new AWS.Polly();

const {uploadAudio} = require('./s3UploadService');

/**
 * Create audio from text and upload to S3 bucket
 *
 * @param event item being saved in db
 * @param text text to be converted to audio
 * @param prefix either 'q' for question or 'a' for answer
 * @param s3AudioBucket name of s3 audio bucket
 * @returns {Promise<void>}
 */
const makeAudio = async (event, text, prefix, s3AudioBucket) => {
    const params = {
        OutputFormat: "mp3",
        Text: text,
        TextType: "text",
        VoiceId: event.voice
    };

    const data = await polly.synthesizeSpeech(params).promise();
    const stream = data.AudioStream;
    await uploadAudio(stream, event, prefix, s3AudioBucket);
}

const convert = async (event, s3AudioBucket) => {
    await makeAudio(event, event.question, 'q', s3AudioBucket);
    await makeAudio(event, event.answer, 'a', s3AudioBucket);
}

module.exports = {convert}