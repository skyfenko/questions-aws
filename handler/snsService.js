'use strict'

const {sns} = require('../utils/awsServices')

const {languageToVoiceMap} = require('../resources/languageToVoiceMap');
const {questionStatus} = require('../enums/questionStatus')

/**
 * Send the item directly to audio topic.
 * Compose subject based on 'original' property
 *
 * @param item item being saved in db
 * @param topic name of audio topic
 * @param original true if original item
 * @returns {Promise<void>}
 */
const sendToAudioTopic = async (item, topic, original) => {
    const message = JSON.parse(JSON.stringify(item));

    message.voice = languageToVoiceMap[message.lang].voice;

    // check if the message is original and then compose subject
    let subject = `Original message with id ${params.Item.id} to convert to mp3`;
    if (!original) {
        subject = `Translated message with id ${item.id}`;
    }

    const snsMessage = {
        Message: JSON.stringify(message),
        Subject: subject,
        TopicArn: topic
    };
    await sns.publish(snsMessage).promise();
};

/**
 * Create messages out of original one, set original id as parent id, set voice for audio and
 * send for translation. Number of resulting messages is number of languages - 1.
 *
 * @param params original item being saved in db
 * @param topic name of translate topic
 * @returns {Promise<void>}
 */
const sendToTranslateTopic = async (params, topic) => {
    const promises = Object.keys(languageToVoiceMap)
        .filter(lang => params.Item.lang !== lang)
        .map(lang => {
            const message = JSON.parse(JSON.stringify(params.Item));
            message.parentId = message.id;
            delete message.id;
            message.status = questionStatus.INITIATED;
            message.lang = lang;
            message.voice = languageToVoiceMap[lang].voice;

            const snsMessage = {
                Message: JSON.stringify(message),
                Subject: `A message with id ${params.Item.id} to be translated`,
                TopicArn: topic
            };
            return sns.publish(snsMessage).promise();
        });

    await Promise.all(promises)
};

module.exports = {sendToAudioTopic, sendToTranslateTopic}