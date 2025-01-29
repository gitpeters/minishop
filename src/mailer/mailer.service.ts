import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly transport;
  private readonly from: string;
  private readonly smtpHost: string;
  private readonly smtpPort: number;
  private readonly smtpUser: string;
  private readonly smtpPassword: string;
  private readonly frontEndVerificationUrl: string;
  private readonly logger = new Logger(MailerService.name);

  constructor(private config: ConfigService) {
    this.frontEndVerificationUrl = this.config.get<string>('VERIFICATION_URL')!;
    this.smtpUser = this.config.get<string>('SMTP_USER')!;
    this.smtpPassword = this.config.get<string>('SMTP_PASSWORD')!;
    this.from = this.config.get<string>('EMAIL_FROM')!;
    this.smtpHost = this.config.get<string>('SMTP_HOST')!;
    this.smtpPort = this.config.get<number>('SMTP_PORT')!;

    if (!this.smtpUser || !this.smtpPassword || !this.frontEndVerificationUrl) {
      throw new Error('Missing email configuration values');
    }

    this.transport = nodemailer.createTransport({
      host: this.smtpHost,
      port: this.smtpPort,
      auth: {
        user: this.smtpUser,
        pass: this.smtpPassword,
      },
    });
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const verificationUrl = `${this.frontEndVerificationUrl}/verify?token=${token}`;

    const mailOptions = {
      from: this.from,
      to,
      subject: 'Account Verification',
      text: `Please verify your account using the link below:\n\n${verificationUrl} \n\n Token expires after 10minutes`,
      html: `<p>Please verify your account using the link below:</p>
             <a href="${verificationUrl}">${verificationUrl}</a>
             <p>Token expires after 10minutes </p> 
             `,
    };

    try {
      await this.transport.sendMail(mailOptions);
      this.logger.log(`Verification email sent to ${to}`);
    } catch (error) {
      this.logger.error('Error sending email', error.stack);
      throw new Error(`Failed to send email to ${to}`);
    }
  }

  async sendPasswordResetEmail(
    to: string,
    token: string,
    name: string | null,
  ): Promise<void> {
    const mailOptions = {
      from: this.from,
      to,
      subject: 'Password Reset',
      text: `Dear ${name !== null ? name : to}, \n\n You requested for your password to be reset. Use the code below to reset your password\n\n${token} \n\n Code expires after 10minutes. For security reason, please do not share this code with anybody and if you did not initiate this request, you can safely ignore this mail.`,
      html: `<p>Dear ${name !== null ? name : to},</p>
             <p>You requested for your password to be reset. Use the code below to reset your password</p>
             <p><strong>${token}</strong></a>
             <p>Code expires after 10minutes. For security reason, please do not share this code with anybody and if you did not initiate this request, you can safely ignore this mail.</p> 
             `,
    };

    try {
      await this.transport.sendMail(mailOptions);
      this.logger.log(`Passwrd reset email sent to ${to}`);
    } catch (error) {
      this.logger.error('Error sending email', error.stack);
      throw new Error(`Failed to send email to ${to}`);
    }
  }
}
