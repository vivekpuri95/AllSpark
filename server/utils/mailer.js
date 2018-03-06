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

        this.mailOptions = {};
    }

    from(f){
        this.mailOptions.from = f;
    }

    to(...t){
        this.mailOptions.to = t.toString();
    }

    cc(...c){
        this.mailOptions.cc = c.toString();
    }

    bcc(...b){
        this.mailOptions.bcc = b.toString();
    }

    subject(s){
        this.mailOptions.subject = s;
    }

    text(t){
        this.mailOptions.text = t;
    }

    html(h){
        this.mailOptions.html = h;
    }

    sendMail(){
        this.transporter.sendMail(this.mailOptions, function(error, info){
            if (error) {
                return (error);
            } else {
                return ('Email sent: ' + info);
            }
        });
    }
}

module.exports = Mailer;