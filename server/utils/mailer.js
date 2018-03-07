"use strict"
const nodemailer = require('nodemailer');
const mailerConfig = require('config').get("mailer");

class Mailer {

    constructor(){
        this.transporter = nodemailer.createTransport({
            service: mailerConfig.get('service'),
            auth: {
                user: mailerConfig.get('user'),
                pass: mailerConfig.get('pass')
            }
        });

        this.to = new Set();
        this.cc = new Set();
        this.bcc = new Set();
    }

    send(){
        let mailOptions = {
            from: this.from,
            to: Array.from(this.to).join(),
            cc: Array.from(this.cc).join(),
            bcc : Array.from(this.bcc).join(),
            subject: this.subject,
            text: this.text,
            html: this.html
        };

        return new Promise((resolve,reject)=>{
            this.transporter.sendMail(mailOptions, function(error, info){
                if (error) {
                    reject(error);
                } else {
                    resolve(info);
                }
            });
        });
    }
}

module.exports = Mailer;