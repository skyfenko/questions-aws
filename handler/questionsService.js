'use strict'

const AWS = require('aws-sdk');

const QUESTIONS_TABLE = process.env.QUESTIONS_TABLE;
const AWS_DEPLOY_REGION = process.env.AWS_DEPLOY_REGION;

// clients of AWS services
AWS.config.update({region: AWS_DEPLOY_REGION});
const dynamoDb = new AWS.DynamoDB.DocumentClient({api_version: '2012-08-10'});

const {uploadImage} = require('./s3UploadService')
const {sendToAudioTopic, sendToTranslateTopic} = require('./snsService')
const {v4} = require('uuid');

const {questionStatus} = require('../enums/questionStatus')

const body = (event) => typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

const create = async (event) => {
    const body = body(event);
    const params = {
        TableName: QUESTIONS_TABLE,
        Item: {
            'id': v4(),
            'lang': body.lang,
            'status': questionStatus.TRANSLATED,
            'text': body.text,
            'answer': body.answer,
            'group': body.group,
            'category': body.category,
            'level': body.level,
        }
    };
    // adding paths in advance to reduce number of updates to dynamoDB
    params.Item.imagePath = `https://s3-${AWS_DEPLOY_REGION}.amazonaws.com/${process.env.S3_IMAGE_BUCKET}/${params.Item.category}/${params.Item.group}/${params.Item.id}.jpg`;
    params.Item.audioPath = `https://s3-${AWS_DEPLOY_REGION}.amazonaws.com/${process.env.S3_AUDIO_BUCKET}/${params.Item.category}/${params.Item.group}/${params.Item.id}.mp3`;

    try {
        //save to DB
        await dynamoDb.put(params).promise();

        //upload an image
        await uploadImage(event.body, process.env.S3_IMAGE_BUCKET);

        // publish to SNS to convert original text to audio and to translate text in other languages
        const tmPromise = sendToTranslateTopic(params, process.env.TRANSLATE_TOPIC);
        const omPromise = sendToAudioTopic(params, process.env.AUDIO_TOPIC);
        await tmPromise;
        await omPromise;

        return {
            statusCode: 200,
            body: {id: params.Item.id}
        };
    } catch (error) {
        return {
            statusCode: 400,
            error: `Could not create new question: ${JSON.stringify(params)} ${error.stack}`
        };
    }
};

const get = async () => {

};

const translate = async () => {

};

const convertToAudio = async () => {

};

module.exports = {create, get, translate, convertToAudio}