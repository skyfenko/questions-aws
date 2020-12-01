# Example of using AWS Lambda, Polly, Translate, DynamoDB, S3 and SNS

### Project description:
Back-end for quiz application supporting adding and retrieving questions along with answers.
Once added, the system translates question + answer on to [several languages](resources/languageToVoiceMap.js)
and then synthesize them into audio files to be used by application while a user plays a record.

### Stack
* AWS stack: Lambda, Polly, SNS, DynamoDB, Translate, S3
* NodeJS
     

### Architecture
![Architecture](images/architecture.jpg?raw=true "Architecture")

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