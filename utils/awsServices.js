'use strict'

const AWS = require('aws-sdk');
const AWS_DEPLOY_REGION = process.env.AWS_DEPLOY_REGION;
AWS.config.update({region: AWS_DEPLOY_REGION});

const s3 = new AWS.S3({apiVersion: '2006-03-01'});
const dynamoDb = new AWS.DynamoDB.DocumentClient({api_version: '2012-08-10'});
const sns = new AWS.SNS();
const translate = new AWS.Translate();
const polly = new AWS.Polly();

module.exports = {s3, dynamoDb, sns, translate, polly}