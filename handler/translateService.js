'use strict'

const AWS = require('aws-sdk');
const AWS_DEPLOY_REGION = process.env.AWS_DEPLOY_REGION;
AWS.config.update({region: AWS_DEPLOY_REGION});
const translate = new AWS.Translate();

const translateText = async (newItem) => {
    const targetLang = newItem.lang.split("-")[0];

    const translateQuestionParams = {
        SourceLanguageCode: 'en',
        TargetLanguageCode: targetLang,
        Text: newItem.question
    };

    const translationAnswerParams = {
        SourceLanguageCode: 'en',
        TargetLanguageCode: targetLang,
        Text: newItem.answer
    };

    const translatedQuestion = await translate.translateText(translateQuestionParams).promise();
    const translatedAnswer = await translate.translateText(translationAnswerParams).promise();

    newItem.question = translatedQuestion.TranslatedText;
    newItem.answer = translatedAnswer.TranslatedText;
};

module.exports = {translateText}