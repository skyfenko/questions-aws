'use strict'

const AWS = require('aws-sdk');

const QUESTIONS_TABLE = process.env.QUESTIONS_TABLE;
const S3_IMAGE_BUCKET = process.env.S3_IMAGE_BUCKET;
const S3_AUDIO_BUCKET = process.env.S3_AUDIO_BUCKET;
const AUDIO_TOPIC = process.env.AUDIO_TOPIC;
const TRANSLATE_TOPIC = process.env.TRANSLATE_TOPIC;
const AWS_DEPLOY_REGION = process.env.AWS_DEPLOY_REGION;

// clients of AWS services
AWS.config.update({region: AWS_DEPLOY_REGION});
const dynamoDb = new AWS.DynamoDB.DocumentClient({api_version: '2012-08-10'});

const {uploadImage} = require('./s3UploadService')
const {sendToAudioTopic, sendToTranslateTopic} = require('./snsService')
const {translateText} = require('./translateService');
const {convert} = require('./audioService');

const {v4} = require('uuid');

const {questionStatus} = require('../enums/questionStatus')

const body = (event) => typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

/**
 * Create question, save it in db, upload image, send to SNS for further converting to MP3
 *
 * @param event API Gateway message
 * @returns {Promise<{error: string, statusCode: number}|{body: {id: *}, statusCode: number}>}
 */
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
    params.Item.imagePath = `https://s3-${AWS_DEPLOY_REGION}.amazonaws.com/${S3_IMAGE_BUCKET}/${params.Item.category}/${params.Item.group}/${params.Item.id}.jpg`;
    params.Item.audioQPath = `https://s3-${AWS_DEPLOY_REGION}.amazonaws.com/${S3_AUDIO_BUCKET}/${params.Item.category}/${params.Item.group}/q-${params.Item.id}.mp3`;
    params.Item.audioAPath = `https://s3-${AWS_DEPLOY_REGION}.amazonaws.com/${S3_AUDIO_BUCKET}/${params.Item.category}/${params.Item.group}/a-${params.Item.id}.mp3`;

    try {
        //save to DB
        await dynamoDb.put(params).promise();

        //upload an image
        await uploadImage(event.body, S3_IMAGE_BUCKET);

        // publish to SNS to convert original text to audio and to translate text in other languages
        const tmPromise = sendToTranslateTopic(params, TRANSLATE_TOPIC);
        const omPromise = sendToAudioTopic(params.Item, AUDIO_TOPIC, true);
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

/**
 * Get question by trying to fetch by id and then by lang + group and filter by level.
 * return 400 if not found
 *
 * @param event API Gateway message
 * @returns {Promise<{body: *, statusCode: number}|{error: string, statusCode: number}>}
 */
const get = async (event) => {
    const params = {
        TableName: QUESTIONS_TABLE
    };

    // first try to get by id, then by lang + group + level
    if (event.id) {
        params.KeyConditionExpression = `id = :id`;
        params.ExpressionAttributeValues = {
            ":id": event.id
        };
    } else if (event.lang && event.group && event.level) {
        params.Limit = 20;
        params.IndexName = 'LangGroupIndex';
        params.KeyConditionExpression = `lang = :lang and group = :group`;
        params.FilterExpression = `level = :level`;
        params.ExpressionAttributeValues = {
            ":lang": event.lang,
            ":group": parseInt(event.group),
            ":level": parseInt(event.level)
        };
    } else {
        return {
            statusCode: 400,
            error: `Could not get: ${JSON.stringify(event)}`
        };
    }

    try {
        const data = await dynamoDb.query(params).promise();
        return {statusCode: 200, body: data.Items};
    } catch (error) {
        return {
            statusCode: 400,
            error: `Could not get a question: ${error.stack}`
        };
    }
};

/**
 * Translate text to target language, save it in DB
 * and send to audio topic for further converting to MP3
 *
 * @param event SNS message
 * @returns {Promise<{body: {id: *}, status: number}|{error: string, statusCode: number}>}
 */
const translate = async (event) => {
    const newItem = JSON.parse(event.Records[0].Sns.Message);
    newItem.id = v4();
    newItem.status = questionStatus.TRANSLATED;

    // adding paths in advance to reduce number of calls to dynamoDB as updates
    newItem.imagePath = `https://s3-${AWS_DEPLOY_REGION}.amazonaws.com/${S3_IMAGE_BUCKET}/${newItem.category}/${newItem.group}/${newItem.parentId}.jpg`;
    newItem.audioQPath = `https://s3-${AWS_DEPLOY_REGION}.amazonaws.com/${S3_AUDIO_BUCKET}/${newItem.category}/${newItem.group}/q-${newItem.id}.mp3`;
    newItem.audioAPath = `https://s3-${AWS_DEPLOY_REGION}.amazonaws.com/${S3_AUDIO_BUCKET}/${newItem.category}/${newItem.group}/a-${newItem.id}.mp3`;

    try {
        await translateText(newItem);

        await dynamoDb.put(
            {
                TableName: QUESTIONS_TABLE,
                Item: newItem
            }
        ).promise();

        await sendToAudioTopic(newItem, AUDIO_TOPIC, false);

        return {status: 200, body: {id: newItem.id}};
    } catch (error) {
        return {
            statusCode: 400,
            error: `Could not translate: ${JSON.stringify(newItem)} ${error.stack}`
        };
    }
};

/**
 * Convert question and answer to audio and upload them to S3
 *
 * @param event SNS message
 * @returns {Promise<{body: {id: *}, status: number}|{error: string, statusCode: number}>}
 */
const convertToAudio = async (event) => {
    const parsedEvent = JSON.parse(event.Records[0].Sns.Message);

    try {
        await convert(parsedEvent, S3_AUDIO_BUCKET);
        return {status: 200, body: {id: parsedEvent.id}};
    } catch (error) {
        return {
            statusCode: 400,
            error: `Could not convert to mp3: ${JSON.stringify(params)} ${error.stack}`
        };
    }
};

module.exports = {create, get, translate, convertToAudio}