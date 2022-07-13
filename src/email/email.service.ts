import { Inject, Injectable } from '@nestjs/common';
import { CONFIG_OPTIONS } from 'src/common/common.constants';
import { EmailModuleOptions, EmailVar } from './email.interfaces';
import got from 'got';
import * as FormData from 'form-data';

@Injectable()
export class EmailService {
  constructor(
    @Inject(CONFIG_OPTIONS) private readonly options: EmailModuleOptions,
  ) {
    // this.sendEmail('testing', 'test', '')
    //   .then(() => {
    //     console.log('Message Sent');
    //   })
    //   .catch((error) => {
    //     console.log(error.response.body);
    //   });
  }

  async sendEmail(
    subject: string,
    template: string,
    emailVars: EmailVar[],
  ): Promise<boolean> {
    const form = new FormData();
    form.append('from', `Excited User <mailgun@${this.options.domain}>`);
    form.append('to', 'hseongun0403@gmail.com');
    form.append('subject', subject);
    form.append('template', template);
    emailVars.forEach((eVars) => form.append(`v:${eVars.key}`, eVars.value));
    try {
      await got.post(
        `https://api.mailgun.net/v3/${this.options.domain}/messages`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(
              `api:${this.options.apiKey}`,
            ).toString('base64')}`,
          },
          body: form,
        },
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  sendVerificationEmail(email: string, code: string) {
    this.sendEmail('Verify Your Email', 'verify-email', [
      { key: 'code', value: code },
      { key: 'userName', value: email },
    ]);
  }
}
