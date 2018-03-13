const config = require('config').get('mailer')
const mandrill = require('mandrill-api/mandrill');
const mandrill_client = new mandrill.Mandrill(config.get('api_key'));

class Mailer {

    constructor() {
        this.to = new Set();
    }

    send() {
        let mailOptions = {
            from_email: this.from_email,
            from_name: this.from_name,
            to: Array.from(this.to).map((element) => {
                return {"email": element}
            }),
            subject: this.subject,
            text: this.text,
            html: this.html
        };

        return new Promise((resolve, reject) => {
            mandrill_client.messages.send({"message": mailOptions, "async": "false"}, function (result) {
                resolve(result);
            }, function (e) {
                reject(e);
            });
        });
    }
}

module.exports = Mailer;