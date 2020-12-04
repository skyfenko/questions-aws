# Quiz platform

### Project description:
Back-end for quiz platform to support adding and retrieving questions along with answers.
Once added, the system translates question + answer on to [several languages](resources/languageToVoiceMap.js)
and then synthesize them into audio files to be used by application while a user plays a record.

### Stack
* AWS stack: Lambda, Polly, SNS, DynamoDB, Translate, S3
* NodeJS
     

### Architecture
![Architecture](images/architecture.jpg?raw=true "Architecture")
#### Add question Flow
1. Once user adds a question, CreateLambda is triggered, then it: 
    * save data to AWS DynamoDB
    * save image to AWS S3 image bucket
    * publish message to Audio SNS Topic to synthesize question and answer in to audio
    * publish (N - 1) messages to Translate SNS Topic to translate question and answers on to (N - 1) languages, where N = number of entries in [languageToVoiceMap.js](resources/languageToVoiceMap.js)
2. Once new messages arrive to Audio SNS Topic, it triggers ConvertToAudioLambda (subscribed to the topic), then it:
    * fetch a message and send question and answer to AWS Polly to convert in to audio files
    * save processed audio files to AWS S3 audio bucket
3. Once new messages arrive to Translate SNS Topic, it triggers TranslateLambda (subscribed to the topic), then it:
    * fetch a message and send question and answer to AWS Translate to translate them into target language
    * save item with translated question and answer to AWS DynamoDB
    * once the steps above completed, send a message to Audio SNS Topic
    
#### Get question Flow
1. Once user wants to get a question, GetLambda is triggered, then it retrieves data from AWS DynamoDB and return back
    

### DB table structure
Table : Questions

| Field | Type | Description |
| :---: | :---: | :---: |
| id    | UUID String | item id
| lang    | String | Question language
| status    | String | TRANSLATED or INITIATED
| text    | String | Text of the question
| answer    | String | Text of the answer
| group    | Integer | Number of group/class (1,2,3,4,etc.)
| category    | String | A category of the question: Geography, Biology, etc.
| level    | Integer | Question level. The higher, the tougher
| level    | Integer | Question level. The higher, the tougher
                    
## Deploy
`sls deploy --aws-profile=your-aws-profile`


### TODO
* add authentication with Auth0